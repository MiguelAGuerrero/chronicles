// @layer shell
import type { Ports } from '../ports/types';
import type { TranscriptRow } from '../types';
import { MAX_TRIES, mayRun, nextToRead, type MemoRef } from './core';
import { firstInput, type Audio, type Engine } from './engine';
import type { Decoder, RunEnv } from './types';

export type RunResult = 'ran' | 'skipped';

export interface TranscriberDeps {
  engine: Engine;
  decoder: Decoder;
  /** The switch and the installed model's reference (null: not installed). */
  model: () => { on: boolean; ref: string | null };
  env: RunEnv;
  /** Told when a transcript was stored, after the run's write (the words store reloads); never mid-read. */
  onStored?: (pieceId: string) => void;
}

interface Voice extends MemoRef {
  moment_id: string;
  file_path: string;
}

/**
 * A run (MX4, MX16-MX20, MX31): when the switch, the model, the engine, the foreground and a free walk allow, load
 * the engine once, read each memo with no transcript at this model's tag, oldest first and one at a time, store its
 * words (the only write), and release the engine when the queue is empty, on the background and on a memory warning.
 * A memo that cannot be read is left, counted, and tried again at most twice; nothing is said to the owner.
 */
export function createTranscriber(p: Pick<Ports, 'db' | 'clock'>, d: TranscriberDeps) {
  let running: Promise<RunResult> | null = null;
  let stopping = false;
  let abort: AbortController | null = null;

  async function voices(): Promise<Voice[]> {
    const moments = await p.db.momentsBetween(0, Number.MAX_SAFE_INTEGER);
    return moments.flatMap((m) =>
      m.pieces.filter((x) => x.kind === 'voice' && x.file_path).map((x) => ({ piece_id: x.id, moment_id: m.id, t: x.t, file_path: x.file_path as string })),
    );
  }

  async function audioFor(ref: string): Promise<{ audio: Audio; dispose: () => Promise<void> } | null> {
    const kind = firstInput(d.engine.inputs, (k) => d.decoder.can(k));
    if (!kind) return null;
    if (kind === 'container') return { audio: { kind, uri: d.decoder.container ? await d.decoder.container(ref) : ref }, dispose: async () => {} };
    return d.decoder.decode(ref, kind);
  }

  async function go(): Promise<RunResult> {
    const m = d.model();
    const available = await d.engine.available().catch(() => false);
    if (!mayRun({ on: m.on, installed: m.ref !== null, available, foreground: d.env.isForeground(), recording: d.env.isRecording() })) return 'skipped';
    const tag = d.engine.model.tag;
    const all = await voices();
    const byPiece = new Map<string, Voice>(all.map((v) => [v.piece_id, v]));
    let rows = await p.db.listTranscripts();
    const spent = new Map<string, number>(); // memos not tried again in this run: read, failed, or an input this platform cannot give
    let loaded = false;
    stopping = false;
    abort = new AbortController();
    try {
      for (;;) {
        if (stopping || !d.env.isForeground() || d.env.isRecording()) break;
        const next = nextToRead(all.filter((v) => (spent.get(v.piece_id) ?? 0) < MAX_TRIES), rows, tag);
        if (!next) break;
        const v = byPiece.get(next.piece_id)!;
        const prior = rows.find((r) => r.piece_id === v.piece_id);
        let decoded: Awaited<ReturnType<typeof audioFor>> = null;
        try {
          decoded = await audioFor(v.file_path);
          if (!decoded) {
            spent.set(v.piece_id, MAX_TRIES); // an input this platform cannot give: left alone (MX31)
            continue;
          }
          if (!loaded) {
            await d.engine.load({ ref: m.ref! });
            loaded = true;
          }
          const text = await d.engine.transcribe(decoded.audio, abort.signal);
          const row: TranscriptRow = { piece_id: v.piece_id, moment_id: v.moment_id, text, engine: d.engine.id, tag, made_at: p.clock.now(), tries: 0 };
          await p.db.putTranscript(row);
          rows = [...rows.filter((r) => r.piece_id !== v.piece_id), row];
          d.onStored?.(v.piece_id);
        } catch {
          spent.set(v.piece_id, MAX_TRIES); // one try for each memo in a run
          if (!(prior && prior.text !== null)) {
            // A failed read is a row with no words: it counts toward the two tries for this model (MX18). A memo that has
            // old words from another model keeps them (MX5) and is only left until the next run.
            const row: TranscriptRow = { piece_id: v.piece_id, moment_id: v.moment_id, text: null, engine: d.engine.id, tag, made_at: p.clock.now(), tries: (prior?.tag === tag ? prior.tries : 0) + 1 };
            await p.db.putTranscript(row).catch(() => {});
            rows = [...rows.filter((r) => r.piece_id !== v.piece_id), row];
          }
        } finally {
          await decoded?.dispose().catch(() => {});
        }
      }
    } finally {
      abort = null;
      if (loaded) await d.engine.release().catch(() => {});
    }
    return 'ran';
  }

  /** Stops the run after the memo in hand and lets the engine go (MX16). */
  async function stop() {
    stopping = true;
    abort?.abort();
    if (running) await running.catch(() => {});
    await d.engine.release().catch(() => {});
  }

  return {
    /** Reads what is due; a run already going is not started twice. */
    run(): Promise<RunResult> {
      if (running) return Promise.resolve('skipped');
      running = go().finally(() => {
        running = null;
      });
      return running;
    },
    onBackground: stop,
    onMemoryWarning: stop,
  };
}
