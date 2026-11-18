// @layer shell
/**
 * Memo transcripts (decision 0169): reads each voice memo's words on the phone, in the background, one memo at a
 * time, and keeps them beside the memo. It never blocks a capture, asks for the speech permission only once a memo
 * was kept this session and nothing records or plays, sends nothing anywhere (every request is on-device), and says
 * nothing when it cannot read (TX1-TX6, TX13, TX15, TX16).
 */
import type { Db } from '../db/types';
import { createStore, type Store } from '../store';
import { needsTranscript, spanOf, transcriptCaption, wordsOfRow, type MemoRef, type Transcript } from './core';

/** A memo to read: its piece's id, stored file, length and edits. */
export interface MemoToRead extends MemoRef {
  file_path: string | null;
  /** The moment it belongs to, so a read that finishes after a delete is told apart. */
  moment_id?: string;
}

/** One recognition request. `onDevice` is always true: a request that may leave the phone is not made (TX5). */
export interface RecognizeRequest {
  uri: string;
  lang: string;
  onDevice: true;
}

/** The phone's recognizer (adapter: `engine.native.ts`). */
export interface Engine {
  /** Whether the phone can recognize this locale on the device itself (TX16). */
  supportsOnDevice(lang: string): Promise<boolean>;
  /** 'unavailable': this platform has no recognizer (the web): nothing is asked, stored or remembered. */
  permission(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'>;
  requestPermission(): Promise<boolean>;
  /** The words heard, '' for no speech, null when it ended having heard nothing at all. Rejects on an engine error. */
  recognize(req: RecognizeRequest): Promise<string | null>;
  /** Stops the read under way (a recording started). */
  abort(): void;
}

/** Cuts a copy of a memo's kept span for the recognizer, and removes it after (TX13). */
export interface Cutter {
  cut(uri: string, startMs: number, endMs: number): Promise<string>;
  remove(uri: string): Promise<void>;
}

export interface TranscriptPorts {
  db: Pick<Db, 'listTranscripts' | 'setTranscript' | 'clearTranscript'>;
  engine: Engine;
  cutter: Cutter;
  files: { resolve(path: string): Promise<string | null> };
  /** True while a walk or a memo records, or a memo plays (TX15). */
  busy: () => boolean;
  lang: () => string;
  meta: { get(key: 'transcript_off'): Promise<string | null>; set(key: 'transcript_off', value: string): Promise<void> };
  clock: { now(): number };
  /** Whether the memo is still kept: a read that ends after its memo was deleted writes nothing (audit 2). */
  kept: (memo: MemoToRead) => Promise<boolean>;
}

type Item = { memo: MemoToRead; kept: boolean };

export function createTranscripts(p: TranscriptPorts) {
  const store: Store<ReadonlyMap<string, Transcript>> = createStore<ReadonlyMap<string, Transcript>>(new Map());
  let loaded: Promise<void> | null = null;
  let off = false;
  let queue: Item[] = [];
  let current: Promise<void> | null = null;
  let reading = false;
  let interrupted = false;
  let wrote = false;
  const settledListeners = new Set<() => void>();

  const load = () =>
    (loaded ??= (async () => {
      off = (await p.meta.get('transcript_off')) === '1';
      const rows = await p.db.listTranscripts();
      store.set(new Map(rows.map((r) => [r.capture_id, r])));
    })());

  // Rows stored during a run wait here and are published together (audit 5b): copying the whole map per row is
  // O(n^2) over a backfill. `words()` reads them at once, so what a view says never lags what is stored.
  const pending = new Map<string, Transcript>();
  const PUBLISH_EVERY = 50;
  const publish = () => {
    if (!pending.size) return;
    const rows = [...pending];
    pending.clear();
    store.set((prev) => {
      const next = new Map(prev);
      for (const [id, row] of rows) next.set(id, row);
      return next;
    });
  };
  const put = (row: Transcript) => {
    pending.set(row.capture_id, row);
    if (pending.size >= PUBLISH_EVERY) publish();
  };

  /** How a read ended: carry on, or stop the queue for a reason that holds for every memo. */
  type Outcome = 'next' | 'stop' | 'drop-backfill';

  async function readOne({ memo, kept }: Item): Promise<Outcome> {
    const perm = await p.engine.permission();
    if (perm === 'unavailable') return 'stop';
    if (perm === 'denied') {
      await giveUp();
      return 'stop';
    }
    if (perm === 'undetermined') {
      // Only a memo kept this session, on a quiet moment, may bring up the system's question (TX15).
      if (!kept) return 'drop-backfill';
      if (!(await p.engine.requestPermission())) {
        await giveUp();
        return 'stop';
      }
    }
    const lang = p.lang();
    // The same for every memo: a phone that cannot read on the device reads none, and is asked once (audit 7).
    if (!(await p.engine.supportsOnDevice(lang))) return 'stop';
    if (!memo.file_path) return 'next';
    const src = await p.files.resolve(memo.file_path);
    if (!src) return 'next';
    const span = spanOf(memo);
    let uri = src;
    let cut: string | null = null;
    reading = true;
    try {
      if (span) uri = cut = await p.cutter.cut(src, span.from_ms, span.to_ms);
      const heard = await p.engine.recognize({ uri, lang, onDevice: true });
      if (heard === null || interrupted) return 'next';
      if (!(await p.kept(memo))) return 'next';
      const row: Transcript = {
        capture_id: memo.id,
        text: transcriptCaption(heard) ?? '',
        lang,
        from_ms: span?.from_ms ?? null,
        to_ms: span?.to_ms ?? null,
        made_at: p.clock.now(),
      };
      await p.db.setTranscript(row);
      put(row);
      wrote = true;
    } catch {
      // One memo's failure is its own: it stays unread, and the next one is read (TX4).
    } finally {
      reading = false;
      if (cut) await p.cutter.remove(cut).catch(() => {});
    }
    return 'next';
  }

  async function giveUp() {
    off = true;
    queue = [];
    await p.meta.set('transcript_off', '1').catch(() => {});
  }

  async function pump() {
    await load();
    while (!off && !p.busy() && queue.length) {
      const item = queue.shift()!;
      interrupted = false;
      const out = await readOne(item).catch((): Outcome => 'next');
      if (interrupted) {
        // A recording began mid-read: the memo goes back, to be read once it is quiet again (audit 6).
        interrupted = false;
        queue.unshift(item);
        break;
      }
      if (out === 'stop') queue = [];
      else if (out === 'drop-backfill') queue = queue.filter((i) => i.kept);
    }
    publish();
    if (wrote) {
      wrote = false;
      for (const l of [...settledListeners]) l();
    }
  }

  function kick(): Promise<void> {
    if (!current) {
      current = pump().finally(() => {
        current = null;
        // An item added as the pump finished is read, not left until the next kick (audit 8).
        if (!off && !p.busy() && queue.length) void kick();
      });
    }
    return current;
  }

  async function add(memos: MemoToRead[], kept: boolean) {
    await load();
    if (off) return;
    const waiting = new Set(queue.map((i) => i.memo.id));
    const fresh = needsTranscript(memos, [...new Map([...store.get(), ...pending]).values()]).filter((m) => !waiting.has(m.id));
    queue = [...queue, ...fresh.map((memo) => ({ memo, kept }))].sort((a, b) => b.memo.t - a.memo.t);
    await kick();
  }

  return {
    store,
    /** A memo was just kept: read it in the background, newest first (TX1). */
    enqueue: (memo: MemoToRead) => add([memo], true),
    /** The memos kept before: read the ones with no words, only where the engine is already allowed (TX2). */
    backfill: (memos: MemoToRead[]) => add(memos, false),
    /** Something that made it busy ended (a walk, a recording, a playback): carry on (TX15). */
    kick,
    /** Something made it busy (a recording began): the read under way stops, and its memo waits (audit 6). */
    interrupt() {
      if (reading && p.busy()) {
        interrupted = true;
        p.engine.abort();
      }
    },
    /** Told once each time the queue goes quiet having stored words, not at every row (audit 5). */
    onSettled(cb: () => void) {
      settledListeners.add(cb);
      return () => {
        settledListeners.delete(cb);
      };
    },
    /** Resolves when nothing is left to read right now. */
    async settled() {
      while (current) await current;
    },
    /** A memo's words for Chronicle and the caption: none while unread, empty, or read from another span (TX10, TX13). */
    words(id: string, memo?: MemoRef): string | null {
      const row = pending.get(id) ?? store.get().get(id);
      if (!row) return null;
      if (memo) {
        const s = spanOf(memo);
        if ((row.from_ms ?? null) !== (s?.from_ms ?? null) || (row.to_ms ?? null) !== (s?.to_ms ?? null)) return null;
      }
      return wordsOfRow(row);
    },
    /** Memos deleted: their words go with them (TX3). */
    async forget(ids: string[]) {
      await load();
      for (const id of ids) await p.db.clearTranscript(id);
      for (const id of ids) pending.delete(id);
      store.set((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    },
  };
}
