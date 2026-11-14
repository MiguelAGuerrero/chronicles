// @layer core
import type { RecorderStatus } from './recorder/types';

/**
 * Whether the walk screen should start the recorder again now that the app is back in
 * front (QL20): only when recording stopped against the walker's intent (location denied,
 * then perhaps allowed in Settings), on an open walk that isn't paused. A paused walk
 * records nothing on purpose; Resume is its way back, and asks for location itself.
 * Pure; the screen makes one attempt per return.
 */
export function retryRecorder(status: RecorderStatus, paused: boolean, open: boolean): boolean {
  return open && !paused && status.kind === 'error';
}

/**
 * What the walk screen's refusal becomes as the recorder's status leaves error (QL20, QL25). `raised` is the message
 * the screen last raised, which keeps a failed retry from saying it again; `shown` the words its notice holds, until
 * the walk records again. Recording again ends the refusal whatever restarted the recorder (a return to the front,
 * Resume, the permission given back): its notice goes (`clear`, the words to take down). A retry's own pass through
 * waiting keeps `raised`, so a failed retry says nothing again; any other waiting forgets it, so a new refusal is said.
 */
export function raisedAfter(
  raised: string | null,
  shown: string | null,
  status: Exclude<RecorderStatus['kind'], 'error'>,
  retrying: boolean,
): { raised: string | null; shown: string | null; clear: string | null } {
  if (status === 'recording') return { raised: null, shown: null, clear: shown };
  return { raised: retrying ? raised : null, shown, clear: null };
}
