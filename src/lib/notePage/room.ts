// @layer core
import { NOTE_MAX } from '../noteEdit';
import { plainRefs } from '../refs';
/**
 * Room in a note (NP8, decision 0149): up to `NOTE_MAX` characters counted as they are shown, a mention as its words.
 * Room left is said in words, never a number.
 */
export type Room = { full: boolean; line: string | null };

/** Characters as shown: a mention token counts as its words. */
export function shownLength(body: string): number {
  return plainRefs(body).length;
}

/** What the page says about the room left: nothing, "Room for a few more lines", or "This note is full". */
export const ROOM_FEW = 'Room for a few more lines';
export const ROOM_FULL = 'This note is full';
/** Under this many characters left, the page says so. */
export const ROOM_WARN_AT = 1000;

export function roomOf(body: string): Room {
  const left = NOTE_MAX - shownLength(body);
  if (left <= 0) return { full: true, line: ROOM_FULL };
  if (left < ROOM_WARN_AT) return { full: false, line: ROOM_FEW };
  return { full: false, line: null };
}

/** Whether `words` (typed, pasted, or a mention's words) still fits after `body`. */
export function fits(body: string, words: string): boolean {
  return shownLength(body) + plainRefs(words).length <= NOTE_MAX;
}
