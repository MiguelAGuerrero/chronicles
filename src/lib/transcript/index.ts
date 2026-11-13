// @layer shell
// @instance: memo transcripts, on the app's ports and the phone's recognizer
import { ports } from '../ports';
import { resolveMedia } from '../media';
import { memoGate } from '../memoGate';
import { nowPlaying } from '../journal/nowPlaying';
import { cutter } from './cutter';
import { engine } from './engine';
import { createTranscripts } from './shell';

export const transcripts = createTranscripts({
  db: ports.db,
  engine,
  cutter,
  files: { resolve: resolveMedia },
  // A walk records, a memo records or plays: the recognizer waits (TX15).
  busy: () => ports.recorder.isRecording() || memoGate.recordingNow() || nowPlaying.store.get() != null,
  lang: () => Intl.DateTimeFormat().resolvedOptions().locale,
  meta: { get: () => ports.db.getMeta('transcript_off'), set: (_key, v) => ports.db.setMeta('transcript_off', v) },
  clock: ports.clock,
});

// Whatever made it busy ending carries the queue on.
ports.recorder.subscribeStatus(() => void transcripts.kick());
nowPlaying.store.subscribe(() => void transcripts.kick());

/** The memos kept before, read in the background once the app is open (TX2). */
export async function backfillTranscripts(): Promise<void> {
  const moments = await ports.db.momentsBetween(0, Number.MAX_SAFE_INTEGER);
  const memos = moments.flatMap((m) => m.pieces).filter((c) => c.kind === 'voice' && c.file_path);
  await transcripts.backfill(memos.map((c) => ({ id: c.id, t: c.t, file_path: c.file_path, body: c.body, edit: c.edit ?? null })));
}
