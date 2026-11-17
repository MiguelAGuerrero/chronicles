// @layer core
import { emptyLine } from '../gallery/copy';
import { blockRows, dayRows, galleryBlocks, galleryDays, galleryTiles, type Row, type Streets, type Tile } from '../gallery/layout';
import type { Order, Show, Size, Zoom } from '../gallery/types';
import { pieceKey, type Faced } from '../moment';
import type { Walk } from '../types';
import { dateLine } from './lines';

/**
 * Picker media (specs/picker-media, MP1-MP19): what the gallery's grid inside the two moment pickers decides. Chronicle's
 * own layout makes the tiles and the rows, so the picker's grid is Chronicle's; this module only takes out what a picker
 * must not offer, says the marked moment, and names the words the screen uses.
 */

/** The switch's two words (MP1) and the one action of the bar (MP9). */
export const PICKER_TABS = { list: 'List', media: 'Media' } as const;
export const PICKER_ACTION = { thread: 'Connect', mention: 'Mention' } as const;

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;

/**
 * Every photo, video and memo piece but the moment in hand and what waits in Undo (MP4, MP6), as Chronicle's Media
 * draws them: an open walk's left out, a note never a tile. `hidden` holds moment ids and `pieceKey`s.
 */
export function pickerTiles(moments: Faced[], walks: Walk[], o: { hidden: ReadonlySet<string>; self: string; show: Show; order: Order }): Tile[] {
  const kept: Faced[] = [];
  for (const m of moments) {
    if (m.id === o.self || o.hidden.has(m.id)) continue;
    const pieces = m.pieces.filter((p) => !o.hidden.has(pieceKey(p.id)));
    if (!pieces.length) continue;
    kept.push(pieces.length === m.pieces.length ? m : { ...m, pieces });
  }
  return galleryTiles(kept, walks, o.show, o.order);
}

/** With nothing to show (MP8): the gallery's own line for everything or for the kind; null when there are tiles. */
export const pickerEmpty = (tiles: Tile[], show: Show): string | null => (tiles.length ? null : emptyLine(show));

/** The keys of every tile of the marked moment (MP9): a mark belongs to the moment, not the piece. */
export function markedKeys(tiles: Tile[], momentId: string | null): Set<string> {
  const out = new Set<string>();
  if (momentId == null) return out;
  for (const t of tiles) if (t.momentId === momentId) out.add(t.key);
  return out;
}

/**
 * The bar under the grid (MP9): place or street, date and time of day, then the walk's line; and the moment's own
 * words, or its kind when it has none. A loose moment's `street` stands in when it has no place (picker media audit 6), so
 * the bar never says less than its tile's spoken label. `time` is the time of day as the device writes it (a view's input).
 */
export function pickBar(o: { kind: 'photo' | 'video' | 'voice' | 'text'; words: string | null; place: string | null; street?: string | null; t: number; walkLine: string | null; time: string; now: number }): { context: string; words: string } {
  const head = [o.place ?? o.street, `${dateLine(o.t, o.now)}, ${o.time}`].filter(Boolean).join(', ');
  return { context: o.walkLine ? `${head} · ${o.walkLine}` : head, words: o.words?.trim() || KIND_WORD[o.kind] };
}

/** The grid's rows (MP14, MP16): days with their tiles, or a block for each month or year; each with its offset and height. */
export function pickerRows(tiles: Tile[], walks: Walk[], streets: Streets, now: number, o: { zoom: Zoom; width: number; size: Size; fontScale: number }): Row[] {
  const byId = new Map(walks.map((w) => [w.id, w]));
  if (o.zoom === 'days') return dayRows(galleryDays(tiles, byId, streets, now), o.width, o.size, o.fontScale).rows;
  return blockRows(galleryBlocks(tiles, byId, streets, o.zoom === 'months' ? 'month' : 'year', now), o.width, o.fontScale);
}

/**
 * Whether a marked moment still has a tile to be picked from (picker media audit 2): not gone, not waiting in Undo, not a
 * note. A kind filter does not count: a mark it hides stays (MP6).
 */
export function markStillOffered(moments: Faced[], walks: Walk[], o: { hidden: ReadonlySet<string>; self: string }, momentId: string): boolean {
  return pickerTiles(moments, walks, { ...o, show: 'all', order: 'newest' }).some((t) => t.momentId === momentId);
}
