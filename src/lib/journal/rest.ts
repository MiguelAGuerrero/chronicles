// @layer core
/**
 * The journal's page at rest and while an entry is written (chronicle journal JN31, JN32): how tall the empty page
 * must be so that the sheet, scrolled to its end, shows the peek under the day's date and nothing older. The peek is
 * the last entry at rest, the entry being written while writing, and nothing before its first character.
 */

/** The empty page is never shorter than this: there is always somewhere to tap, and room to write. */
export const BLANK_MIN = 160;
/** At rest the peek takes at most this share of the screen; the empty page has the rest (JN31). */
export const PEEK_SHARE = 2 / 3;
/** While writing, at least this much stays for the line being written and the lines after it. */
export const WRITING_ROOM = 140;

export interface RestInput {
  /** The sheet's own height on screen. */
  view: number;
  /** What the sheet pads at its foot for the bar. */
  foot: number;
  /** The height of the day's date held at the top, or 0 when the peek begins with a date of its own. */
  sticky: number;
  /** The height of everything from the peek's first row to the empty page. */
  peek: number;
  /** The field has the keyboard. */
  writing: boolean;
}

/** The empty page's height. With it, the sheet's end is the resting place: the peek on top, the empty page below. */
export function blankHeight(o: RestInput): number {
  const room = Math.max(0, o.view - o.foot - o.sticky);
  // A peek longer than its share shows its end: the sheet rests at its foot, so what is cut is the peek's top.
  const most = o.writing ? Math.max(0, room - WRITING_ROOM) : Math.max(0, o.view * PEEK_SHARE - o.sticky);
  return Math.max(BLANK_MIN, Math.round(room - Math.min(o.peek, most)));
}

/**
 * Which row the peek begins with (JN31, JN32): the last entry at rest, and while it is the one being written; the
 * row after it once the field has the keyboard and no entry is open yet, so the last entry slides away.
 */
export function peekStart(kinds: readonly ('day' | 'slip' | 'entry')[], writing: boolean, entryOpen: boolean): number {
  const last = kinds.lastIndexOf('entry');
  if (last < 0) return kinds.length;
  return writing && !entryOpen ? last + 1 : last;
}
