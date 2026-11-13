// @layer core
/**
 * The journal's page at rest and while its entries are written (chronicle journal JN31, JN33): how tall the empty
 * page must be so that the sheet, scrolled to its end, shows the peek under the day's date and nothing older. The
 * peek begins with the entry the page opened on and holds every entry made since: the day's entries stack, and when
 * they have filled their share the sheet slides up under the line being written, as paper in a typewriter.
 */

/** The empty page is never shorter than this: there is always somewhere to tap, and room to write. */
export const BLANK_MIN = 160;
/** The peek takes at most this share of the room; the empty page, with the line at its top, has the rest. */
export const PEEK_SHARE = 2 / 3;

export interface RestInput {
  /** The sheet's own height on screen. */
  view: number;
  /** What the sheet pads at its foot for the bar. */
  foot: number;
  /** The height of the day's date held at the top, or 0 when the peek begins with a date of its own. */
  sticky: number;
  /** The height of everything from the peek's first row to the empty page. */
  peek: number;
}

/**
 * The empty page's height. With it, the sheet's end is the resting place: the peek on top, the empty page below.
 * A peek longer than its share shows its end (the sheet rests at its foot, so what is cut is the peek's top), and
 * the line being written, the empty page's first, holds a third of the way up from the bar.
 */
export function blankHeight(o: RestInput): number {
  const room = Math.max(0, o.view - o.foot - o.sticky);
  const most = Math.round(room * PEEK_SHARE);
  return Math.max(BLANK_MIN, Math.round(room - Math.min(o.peek, most)));
}

type Row = { k: string; key: string };

/** The entry the peek begins with: the one the page opened on while it is still there, otherwise the last. */
export function anchorOf(rows: readonly Row[], anchor: string | null): string | null {
  if (anchor != null && rows.some((r) => r.k === 'entry' && r.key === anchor)) return anchor;
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].k === 'entry') return rows[i].key;
  return null;
}

/**
 * The date held over the peek (audit 48): the day the peek's first row belongs to, or none when the peek begins
 * with a date of its own. Past the end (nothing kept) it is the last day drawn.
 */
export function stickyDay(rows: readonly Row[], from: number): string | null {
  if (rows[from]?.k === 'day') return null;
  for (let i = Math.min(from, rows.length) - 1; i >= 0; i--) if (rows[i].k === 'day') return rows[i].key;
  return null;
}

/** Which row the peek begins with (JN31, JN33): the anchor's, or past the end when nothing is kept. */
export function peekStart(rows: readonly Row[], anchor: string | null): number {
  const at = anchor == null ? -1 : rows.findIndex((r) => r.k === 'entry' && r.key === anchor);
  return at < 0 ? rows.length : at;
}
