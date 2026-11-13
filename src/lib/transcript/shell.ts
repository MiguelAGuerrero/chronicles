// @layer shell
/**
 * Memo transcripts (decision 0165): reads each voice memo's words on the phone, in the background, one memo at a
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
  permission(): Promise<'granted' | 'denied' | 'undetermined'>;
  requestPermission(): Promise<boolean>;
  /** The words heard, '' for none. Rejects on an engine error. */
  recognize(req: RecognizeRequest): Promise<string>;
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
}

type Item = { memo: MemoToRead; kept: boolean };

export function createTranscripts(p: TranscriptPorts) {
  const store: Store<ReadonlyMap<string, Transcript>> = createStore<ReadonlyMap<string, Transcript>>(new Map());
  let loaded: Promise<void> | null = null;
  let off = false;
  let queue: Item[] = [];
  let current: Promise<void> | null = null;

  const load = () =>
    (loaded ??= (async () => {
      off = (await p.meta.get('transcript_off')) === '1';
      const rows = await p.db.listTranscripts();
      store.set(new Map(rows.map((r) => [r.capture_id, r])));
    })());

  const put = (row: Transcript) => store.set((prev) => new Map(prev).set(row.capture_id, row));

  /** Reads one memo; resolves false when the whole queue should stop (the owner refused). */
  async function readOne({ memo, kept }: Item): Promise<void> {
    const perm = await p.engine.permission();
    if (perm === 'denied') {
      await giveUp();
      return;
    }
    if (perm === 'undetermined') {
      // Only a memo kept this session, on a quiet moment, may bring up the system's question (TX15).
      if (!kept) return;
      if (!(await p.engine.requestPermission())) {
        await giveUp();
        return;
      }
    }
    const lang = p.lang();
    if (!(await p.engine.supportsOnDevice(lang))) return;
    if (!memo.file_path) return;
    const src = await p.files.resolve(memo.file_path);
    if (!src) return;
    const span = spanOf(memo);
    let uri = src;
    let cut: string | null = null;
    try {
      if (span) uri = cut = await p.cutter.cut(src, span.from_ms, span.to_ms);
      const heard = await p.engine.recognize({ uri, lang, onDevice: true });
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
    } catch {
      // One memo's failure is its own: it stays unread, and the next one is read (TX4).
    } finally {
      if (cut) await p.cutter.remove(cut).catch(() => {});
    }
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
      await readOne(item).catch(() => {});
    }
  }

  function kick() {
    if (!current) {
      current = pump().finally(() => {
        current = null;
      });
    }
    return current;
  }

  async function add(memos: MemoToRead[], kept: boolean) {
    await load();
    if (off) return;
    const waiting = new Set(queue.map((i) => i.memo.id));
    const fresh = needsTranscript(memos, [...store.get().values()]).filter((m) => !waiting.has(m.id));
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
    /** Resolves when nothing is left to read right now. */
    async settled() {
      while (current) await current;
    },
    /** A memo's words for Chronicle and the caption: none while unread, empty, or read from another span (TX10, TX13). */
    words(id: string, memo?: MemoRef): string | null {
      const row = store.get().get(id);
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
      store.set((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    },
  };
}
