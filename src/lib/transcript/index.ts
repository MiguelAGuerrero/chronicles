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
  kept: async (m) => {
    const [mo] = await ports.db.getMomentsByIds([m.moment_id ?? m.id]);
    return !!mo?.pieces.some((x) => x.id === m.id);
  },
});

// Whatever made it busy ending carries the queue on.
// A recording or a playback beginning stops a read under way; one ending carries the queue on.
const follow = () => {
  transcripts.interrupt();
  void transcripts.kick();
};
ports.recorder.subscribeStatus(follow);
nowPlaying.store.subscribe(follow);

/** The memos kept before, read in the background once the app is open (TX2). */
export async function backfillTranscripts(): Promise<void> {
  const moments = await ports.db.momentsBetween(0, Number.MAX_SAFE_INTEGER);
  const memos = moments.flatMap((m) => m.pieces).filter((c) => c.kind === 'voice' && c.file_path);
  await transcripts.backfill(memos.map((c) => ({ id: c.id, moment_id: c.moment_id, t: c.t, file_path: c.file_path, body: c.body, edit: c.edit ?? null })));
}

/** A memo's trim changed or was reverted: its words are read again for the new span, where the phone already may (audit 4). */
export async function rereadTranscript(momentId: string, pieceId: string): Promise<void> {
  const [mo] = await ports.db.getMomentsByIds([momentId]);
  const c = mo?.pieces.find((x) => x.id === pieceId);
  if (!c || c.kind !== 'voice' || !c.file_path) return;
  await transcripts.backfill([{ id: c.id, moment_id: c.moment_id, t: c.t, file_path: c.file_path, body: c.body, edit: c.edit ?? null }]);
}
