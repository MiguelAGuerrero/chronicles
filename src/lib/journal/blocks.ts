// @layer core
/**
 * A page-written note on the journal's sheet (chronicle journal JN26, JN27; decisions 0151, 0154): its Markdown read
 * into blocks the sheet draws with plain native text (a heading, a bullet, a numbered line, a checkbox, a quote, a
 * paragraph), never the editor itself: a list of entries cannot hold a web view each. A block's text keeps its
 * mention tokens (`@[id|words]`), so the sheet can draw them as cards; every other mark is read as its words.
 */
export type NoteBlock =
  | { k: 'heading'; level: 1 | 2; text: string }
  | { k: 'para'; text: string }
  | { k: 'bullet'; text: string }
  | { k: 'number'; n: number; text: string }
  | { k: 'task'; done: boolean; text: string }
  | { k: 'quote'; text: string };

/** The blocks of a note the page wrote, in order. */
export function noteBlocks(_md: string): NoteBlock[] {
  return [];
}

/** The sheet draws this many blocks of an entry, and says the entry goes on (JN27). */
export const SHEET_BLOCKS = 12;
/** Said under a long entry on the sheet, in the app's voice. */
export const ENTRY_GOES_ON = '';

/** The blocks the sheet draws, and whether the entry goes on past them. */
export function sheetBlocks(_blocks: NoteBlock[], _max = SHEET_BLOCKS): { shown: NoteBlock[]; more: boolean } {
  return { shown: [], more: false };
}
