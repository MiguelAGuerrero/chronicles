// @layer core
/**
 * Room in a note (NP8, decision 0149): up to `NOTE_MAX` characters counted as they are shown, a mention as its words.
 * Room left is said in words, never a number.
 */
export type Room = { full: boolean; line: string | null };

/** Characters as shown: a mention token counts as its words. */
export function shownLength(_body: string): number {
  throw new Error('note pages: not built');
}

/** What the page says about the room left: nothing, "Room for a few more lines", or "This note is full". */
export function roomOf(_body: string): Room {
  throw new Error('note pages: not built');
}

/** Whether `words` (typed, pasted, or a mention's words) still fits after `body`. */
export function fits(_body: string, _words: string): boolean {
  throw new Error('note pages: not built');
}
