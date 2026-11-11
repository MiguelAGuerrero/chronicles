// @layer core
import { dayKey, dayLabel } from '../days';
import { faced, facedAt, type Faced } from '../moment';
import type { CapturePatch } from '../captureBus';
import { partOfDay } from '../resurface/context';
import type { Walk } from '../types';
import { capFirst, KIND_WORD, listed, morePlaces, moreWalks, NOT_ON_A_WALK, OTHER_STREETS, OUTSIDE_A_WALK, untitledWalk } from './copy';
import type { Order, Show, Size } from './types';

/**
 * Media gallery (specs/media-gallery): what the grid shows, worked out from the moments and walks it is given.
 * One tile per photo, video or memo piece; a header per day; a block per month or year; rows whose offsets are
 * known before anything is drawn. Pure: the time zone is read only through `dayKey` and `dayLabel` (days.ts).
 */

export type TileKind = 'photo' | 'video' | 'voice';

export interface Tile {
  /** The piece's id: one tile per piece (MG3). */
  key: string;
  momentId: string;
  kind: TileKind;
  /** The piece's own time. */
  t: number;
  walkId: string | null;
  /** The moment, faced at this piece: its small copy, edits and media (MG4, MG11). */
  face: Faced;
  /** A memo's or a video's length, in ms; null when unknown. */
  lengthMs: number | null;
}

const KINDS = new Set<string>(['photo', 'video', 'voice']);

/**
 * Every photo, video and memo piece of every kept moment, loose or in a finished walk, in the Sort's order, ties
 * by id (MG3, MG18). Notes have no tile. A moment of an open walk, or of a walk not read, is left out (0098).
 * `show` keeps one kind (MG9).
 */
export function galleryTiles(moments: Faced[], walks: Walk[], show: Show, order: Order): Tile[] {
  const byId = new Map(walks.map((w) => [w.id, w]));
  const out: Tile[] = [];
  for (const m of moments) {
    if (m.walk_id) {
      const w = byId.get(m.walk_id);
      if (!w || w.open) continue;
    }
    for (const p of m.pieces) {
      if (!KINDS.has(p.kind)) continue;
      if (show !== 'all' && p.kind !== show) continue;
      const len = p.kind === 'photo' ? null : Number(p.body);
      out.push({
        key: p.id,
        momentId: m.id,
        kind: p.kind as TileKind,
        t: p.t,
        walkId: m.walk_id,
        face: facedAt(m, p.id),
        lengthMs: len != null && Number.isFinite(len) && len > 0 ? len : null,
      });
    }
  }
  const dir = order === 'newest' ? -1 : 1;
  return out.sort((a, b) => (a.t !== b.t ? dir * (a.t - b.t) : dir * (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)));
}

/** A memo's or a video's length (MG4): "0:42", "12:05", "1:02:09". */
export function lengthLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Streets of loose moments, by moment id, as the shell reads them: a name, null for none near, absent while unread. */
export type Streets = Readonly<Record<string, string | null | undefined>>;

/** A walk named as every other screen names it (MG6): its own title, else its time of day and area. */
function walkName(w: Walk): { text: string; own: boolean } {
  const title = w.title?.trim();
  if (title) return { text: title, own: true };
  return { text: untitledWalk(partOfDay(w.started_at), w.area?.trim() || null), own: false };
}

/** A tile's own place (MG15): its walk, else its street, else "Not on a walk". Lowercase, for the middle of a sentence. */
export function tilePlace(tile: Pick<Tile, 'walkId' | 'momentId'>, walks: ReadonlyMap<string, Walk>, streets: Streets): string {
  const w = tile.walkId ? walks.get(tile.walkId) : undefined;
  if (w) return walkName(w).text;
  const street = streets[tile.momentId];
  return street ? `on ${street}` : NOT_ON_A_WALK.toLowerCase();
}

/** A tile, spoken (MG15): "Photo, 9:41 AM, a morning walk in Alfama". `time` is the time of day as the view writes it. */
export function tileLabel(tile: Tile, time: string, walks: ReadonlyMap<string, Walk>, streets: Streets): string {
  return `${KIND_WORD[tile.kind]}, ${time}, ${tilePlace(tile, walks, streets)}`;
}

/** Distinct, in first-seen order. */
function distinct<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * A day's place line (MG6), from the tiles under it, in their order: its walks by name (three at most; with more, the
 * first two and the rest in words), and its loose moments by street once read.
 */
export function dayLine(tiles: Tile[], walks: ReadonlyMap<string, Walk>, streets: Streets): string {
  const walkIds = distinct(tiles.filter((t) => t.walkId && walks.has(t.walkId)).map((t) => t.walkId as string));
  const loose = tiles.filter((t) => !t.walkId || !walks.has(t.walkId));
  const names = walkIds.map((id) => walkName(walks.get(id) as Walk));
  const items = names.length > 3 ? [...names.slice(0, 2).map((n) => n.text), moreWalks(names.length - 2)] : names.map((n) => n.text);
  const streetNames = distinct(loose.map((t) => streets[t.momentId]).filter((s): s is string => !!s));
  const streetList = streetNames.length > 2 ? listed([...streetNames.slice(0, 2), OTHER_STREETS]) : listed(streetNames);
  if (!items.length) return streetList ? `${NOT_ON_A_WALK}, on ${streetList}` : NOT_ON_A_WALK;
  const walksPart = listed(items);
  const line = loose.length ? `${walksPart}, ${OUTSIDE_A_WALK}${streetList ? ` on ${streetList}` : ''}` : walksPart;
  return names[0].own ? line : capFirst(line);
}

/** A day's title (MG6): "Today", "Yesterday", "Tue, Nov 3", with the year when it is not this year's. */
export function dayTitle(key: string, now: number): string {
  const label = dayLabel(key, now);
  return key.slice(0, 4) === dayKey(now).slice(0, 4) ? label : `${label}, ${key.slice(0, 4)}`;
}

export interface DaySection {
  key: string;
  title: string;
  line: string;
  tiles: Tile[];
}

/** Tiles under a header for each local day, in the tiles' order (MG6, MG18). */
export function galleryDays(tiles: Tile[], walks: ReadonlyMap<string, Walk>, streets: Streets, now: number): DaySection[] {
  const groups = new Map<string, Tile[]>();
  for (const t of tiles) {
    const k = dayKey(t.t);
    const g = groups.get(k);
    if (g) g.push(t);
    else groups.set(k, [t]);
  }
  return [...groups].map(([key, ts]) => ({ key, title: dayTitle(key, now), line: dayLine(ts, walks, streets), tiles: ts }));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface Block {
  /** "2025-11" for a month, "2025" for a year. */
  key: string;
  title: string;
  /** The block's first photo in the Sort's order, else its first piece (MG19): a plain rule, never a "best" one. */
  cover: Tile;
  /** Where, in words, the cover's place first (MG19); null with nothing to name on a walk. */
  line: string | null;
  /** The cover's own place, for the spoken label (MG15, MG19). */
  coverPlace: string;
  /** The first day in the Sort's order (a month opens Days there) and the first month (a year opens Months there). */
  firstDay: string;
  firstMonth: string;
}

/** A tile's name on a month or a year (MG19): its walk's title or area, else its street; null with neither. */
function blockName(t: Tile, walks: ReadonlyMap<string, Walk>, streets: Streets): string | null {
  const w = t.walkId ? walks.get(t.walkId) : undefined;
  if (w) return w.title?.trim() || w.area?.trim() || null;
  return streets[t.momentId] || null;
}

/** A block per month or per year, in the tiles' order (MG19). */
export function galleryBlocks(tiles: Tile[], walks: ReadonlyMap<string, Walk>, streets: Streets, unit: 'month' | 'year', now: number): Block[] {
  const groups = new Map<string, Tile[]>();
  for (const t of tiles) {
    const day = dayKey(t.t);
    const k = unit === 'month' ? day.slice(0, 7) : day.slice(0, 4);
    const g = groups.get(k);
    if (g) g.push(t);
    else groups.set(k, [t]);
  }
  const thisYear = dayKey(now).slice(0, 4);
  return [...groups].map(([key, ts]) => {
    const cover = ts.find((t) => t.kind === 'photo') ?? ts[0];
    const ordered = [cover, ...ts.filter((t) => t !== cover)];
    const names = distinct(ordered.map((t) => blockName(t, walks, streets)).filter((n): n is string => !!n));
    const isLoose = (t: Tile) => !t.walkId || !walks.has(t.walkId);
    const allLoose = ts.every(isLoose);
    // Moments outside a walk with no street named are said, so a line never reads as if every picture were a walk's.
    const unnamedLoose = ts.some((t) => isLoose(t) && !streets[t.momentId]);
    const named = names.length > 3 ? listed([...names.slice(0, 3), morePlaces(names.length - 3)]) : listed(names);
    const line = !names.length ? (allLoose ? NOT_ON_A_WALK : null) : unnamedLoose && names.length <= 3 ? `${named}, ${OUTSIDE_A_WALK}` : named;
    const year = key.slice(0, 4);
    const title = unit === 'year' ? year : `${MONTHS[Number(key.slice(5, 7)) - 1]}${year === thisYear ? '' : ` ${year}`}`;
    const firstDay = dayKey(ts[0].t);
    return { key, title, cover, line, coverPlace: tilePlace(cover, walks, streets), firstDay, firstMonth: firstDay.slice(0, 7) };
  });
}

/** Rows (MG12): each with its offset and height, known before anything is drawn. */
export type Row =
  | { kind: 'header'; key: string; day: DaySection; offset: number; height: number }
  | { kind: 'tiles'; key: string; tiles: Tile[]; day: string; offset: number; height: number }
  | { kind: 'block'; key: string; block: Block; offset: number; height: number };

/**
 * A day's header type (MG6): its title and up to two lines of place. The view draws with these numbers and the row's
 * height is made from them, so the row always holds what it draws (fix gallery-header: a hand-picked 64 held one line
 * of place, and a second line crushed the title on the web).
 */
export const HEADER_TYPE = { padTop: 10, padBottom: 8, titleSize: 17, titleLine: 22, lineSize: 13, lineLine: 17, lines: 2 } as const;
/** A day header's height at the device's text size (1 on the web; larger with a phone's larger text). */
export const headerHeight = (fontScale = 1): number =>
  Math.ceil(HEADER_TYPE.padTop + HEADER_TYPE.padBottom + (HEADER_TYPE.titleLine + HEADER_TYPE.lines * HEADER_TYPE.lineLine) * Math.max(1, fontScale));
/** The hairline between tiles (MG5). */
export const GAP = 1;
/** Tiles across on a 390 pt phone, by size (MG20). */
export const STEPS: readonly number[] = [3, 5, 7];
const PHONE_W = 390;
/** Never a tile under a thumb's target (MG20). */
export const MIN_TILE = 44;

/** Tiles across (MG5, MG20): the size's step on a phone, more as the screen widens so a tile keeps about its size. */
export function columnsFor(width: number, size: Size): number {
  const step = STEPS[size];
  let cols = Math.max(step, Math.round(width / (PHONE_W / step)));
  while (cols > 1 && cellSize(width, cols) < MIN_TILE) cols -= 1;
  return cols;
}

/** A square cell's side. */
export const cellSize = (width: number, cols: number): number => (width - GAP * (cols - 1)) / cols;

/** Days as rows: a header, then rows of tiles (MG5, MG12, MG16). */
export function dayRows(days: DaySection[], width: number, size: Size, fontScale = 1): { rows: Row[]; cols: number; cell: number } {
  const cols = columnsFor(width, size);
  const cell = cellSize(width, cols);
  const rows: Row[] = [];
  let offset = 0;
  const headerH = headerHeight(fontScale);
  for (const d of days) {
    rows.push({ kind: 'header', key: `h:${d.key}`, day: d, offset, height: headerH });
    offset += headerH;
    for (let i = 0; i < d.tiles.length; i += cols) {
      const height = cell + GAP;
      rows.push({ kind: 'tiles', key: `r:${d.key}:${i}`, tiles: d.tiles.slice(i, i + cols), day: d.key, offset, height });
      offset += height;
    }
  }
  return { rows, cols, cell };
}

/** A month's or a year's title and one line above its cover, made from the type the view draws with (as the header). */
export const BLOCK_TYPE = { padTop: 10, padBottom: 8, titleSize: 22, titleLine: 28, lineSize: 14, lineLine: 18 } as const;
export const blockTextHeight = (fontScale = 1): number =>
  Math.ceil(BLOCK_TYPE.padTop + BLOCK_TYPE.padBottom + (BLOCK_TYPE.titleLine + BLOCK_TYPE.lineLine) * Math.max(1, fontScale));
/** A cover's height: two thirds of the width, at most 420. */
export const coverHeight = (width: number): number => Math.round(Math.min(420, (width * 2) / 3));

/** Months or years as rows, one per block (MG12, MG19). */
export function blockRows(blocks: Block[], width: number, fontScale = 1): Row[] {
  const height = blockTextHeight(fontScale) + coverHeight(width) + 12;
  return blocks.map((block, i) => ({ kind: 'block', key: `b:${block.key}`, block, offset: i * height, height }));
}

/** The row at a scroll offset (MG12, MG20): the last whose offset is not past it. */
export function rowAt(rows: Row[], offset: number): number {
  let lo = 0;
  let hi = rows.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].offset <= offset) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** The day a row belongs to. */
export const dayOfRow = (row: Row): string | null => (row.kind === 'header' ? row.day.key : row.kind === 'tiles' ? row.day : null);

/** An edit saved on one piece (MG14): that piece changes, and its moment is faced again; nothing else moves. */
export function withPiecePatch(moments: Faced[], pieceId: string, patch: CapturePatch): Faced[] {
  const i = moments.findIndex((m) => m.pieces.some((p) => p.id === pieceId));
  if (i < 0) return moments;
  const m = moments[i];
  // A place belongs to the moment (MT5); the rest is the piece's own.
  const { lat, lon, ...media } = patch;
  const pieces = m.pieces.map((p) => (p.id === pieceId ? { ...p, ...media } : p));
  const out = moments.slice();
  out[i] = faced({ id: m.id, walk_id: m.walk_id, t: m.t, lat: lat !== undefined ? lat : m.lat, lon: lon !== undefined ? lon : m.lon, segment_id: m.segment_id, pieces });
  return out;
}
