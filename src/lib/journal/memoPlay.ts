// @layer core
/**
 * The decisions of the journal's in-line voice note (`components/journal/MemoLine`): when a restart's old position
 * is not the end, when a file has ended, what its clock and its spoken position say. No player, no clock.
 */
import { formatElapsed } from '../format';

/** The play control's own size (pt): the larger of the platforms' minimum targets, with no hit slop to lean on (X0). */
export const MEMO_PLAY_HIT = 48;

/** A note whose file has not resolved gives its row back after this long (ms), never a pause button that plays nothing. */
export const MEMO_LOAD_WAIT_MS = 4000;

/** A player this close to its file's end (s) has ended: the platforms report positions in steps. */
const FILE_END_SLACK_S = 0.1;

/**
 * The press that restarts a note names the position it left; a seek is async, so one more status can carry that
 * position, and it must not read as the end again until the player moves off it (voice-trim audit 2).
 */
export const isRestarting = (posS: number, restartedFrom: number | null): boolean => restartedFrom !== null && posS === restartedFrom;

/** A player at the end of its own file, whatever length was stored (the stored one can outrun the file). */
export const fileEnded = (posS: number, durationS: number): boolean => durationS > 0 && posS >= durationS - FILE_END_SLACK_S;

/** "0:12 / 0:39": always both halves, so the bar beside it keeps its width when play starts. Nothing for a note with no length. */
export const memoClockText = (atMs: number, ofMs: number): string => (ofMs > 0 ? `${formatElapsed(atMs)} / ${formatElapsed(ofMs)}` : '');

/** "0:12 of 0:39": the position as a screen reader says it. */
// vision-ok: two times of one recording (where it is, how long it is), never a tally of places, streets or finds
export const memoProgressText = (atMs: number, ofMs: number): string => `${formatElapsed(atMs)} of ${formatElapsed(ofMs)}`;
