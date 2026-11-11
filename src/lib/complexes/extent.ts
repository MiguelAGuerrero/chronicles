// @layer core
import { tileRect, tilesIn } from '../tileMath';
import type { LngLat } from '../types';

/** CX16: at most this many z14 tiles per area read (core constant). */
export const COMPLEX_TILE_BUDGET = 9;

/** CX16: the z14 tiles within an area's reach, nearest its point first, at most the budget; `partial` when more were needed. */
export function tilesFor(area: { at: LngLat; reachM: number }): { tiles: [number, number][]; partial: boolean } {
  const dLat = area.reachM / 111_320;
  const dLon = dLat / Math.max(0.2, Math.cos((area.at[1] * Math.PI) / 180));
  const all = tilesIn([area.at[0] - dLon, area.at[1] - dLat, area.at[0] + dLon, area.at[1] + dLat]);
  // The distance from the point to a tile's rectangle: 0 for the tile that holds it.
  const dist = ([x, y]: [number, number]) => {
    const r = tileRect(x, y);
    const dx = Math.max(r.w - area.at[0], 0, area.at[0] - r.e);
    const dy = Math.max(r.s - area.at[1], 0, area.at[1] - r.n);
    return Math.hypot(dx * Math.cos((area.at[1] * Math.PI) / 180), dy);
  };
  const ordered = all.map((t) => ({ t, d: dist(t) })).sort((a, b) => a.d - b.d || a.t[0] - b.t[0] || a.t[1] - b.t[1]).map((x) => x.t);
  return { tiles: ordered.slice(0, COMPLEX_TILE_BUDGET), partial: ordered.length > COMPLEX_TILE_BUDGET };
}
