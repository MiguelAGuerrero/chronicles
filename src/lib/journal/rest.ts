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

/**
 * Whether the rows that decide the empty page's height have all reported theirs: the peek's rows and the date held
 * over it (fix entry-jitter). Until they have, `blankHeight` is sized from zeros, too tall by the whole peek, and a
 * sheet taken to its end then shows the entry above where it rests and moves it down when the heights arrive.
 */
export function peekMeasured(rows: readonly Row[], from: number, heights: Readonly<Record<string, number>>): boolean {
  for (let i = from; i < rows.length; i++) if (heights[rows[i].key] == null) return false;
  const held = stickyDay(rows, from);
  return held == null || heights[held] != null;
}

export interface OpenInput {
  /** The sheet's own height, 0 until it has been laid out. */
  view: number;
  /** The read of the entries has answered, whether it succeeded or failed. */
  answered: boolean;
  /** `peekMeasured`. */
  measured: boolean;
  /** A short wait since the read answered has passed: a row that never reports must not keep the sheet hidden. */
  slack: boolean;
  /** A long wait since the sheet mounted has passed: a read that never answers must not keep it hidden either. */
  hard: boolean;
}

/**
 * Whether the sheet is shown (fix entry-jitter). Only once the read has answered and the rows that size the empty
 * page have reported; the waits bound a row that never reports and a read that never answers. A slow read does not
 * open it: it would show today's date alone and slide the entry into place when they arrive (audit 1).
 */
export function sheetOpens(o: OpenInput): boolean {
  if (o.view <= 0) return false;
  return o.hard || (o.answered && (o.measured || o.slack));
}

/**
 * The box the peek and the empty page share (fix entry-jitter 2): at least the room, and the empty page at least
 * `blankMin`, growing to fill the rest. Laid out by the platform, the empty page is then `blankHeight` of whatever the
 * peek measures, in the same pass as the peek: max(blankMin, room - peek) = max(BLANK_MIN, room - min(peek, most)).
 */
export function restBox(o: Omit<RestInput, 'peek'>): { room: number; blankMin: number } {
  const room = Math.max(0, o.view - o.foot - o.sticky);
  return { room, blankMin: blankHeight({ ...o, peek: Number.POSITIVE_INFINITY }) };
}

/**
 * Whether a commit takes the sheet to its end before it is painted (fix entry-jitter 2): on the web (iOS Safari keeps no
 * scroll anchor; native has `maintainVisibleContentPosition`), once open, with the reader at the end. Never while the
 * field has the keyboard (a keystroke would pull a finger reading back; `onContentSizeChange` keeps the line in view,
 * audit 3) or while the keyboard's slide is pending or under way (JN33, audit 2).
 */
export function snapsToEnd(o: { web: boolean; armed: boolean; pinned: boolean; writing: boolean; moving: boolean; sliding: boolean }): boolean {
  return o.web && o.armed && o.pinned && !o.writing && !o.moving && !o.sliding;
}
