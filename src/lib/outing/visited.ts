// @layer core
import { distanceM, projector } from '../geo';
import type { LngLat } from '../types';

/*
 * Visited is read from the trace (OJ47; the owner, Nov 17, decision 0211): a place a recorded outing came within range of, on foot,
 * has been visited. The range is Explore's own, the one within which a place can be found. Nothing is stored: it is worked out from
 * the fixes each time an area is read, so a change of the range or of how a trace is read moves it with them.
 */
export const VISITED_RULES = {
  /** How many outings near an area are read, the newest first: a bound on the read, so an older visit may be missed. */
  walksMax: 30,
  /** How far from the area's point an outing's own middle may lie and still be read. */
  nearM: 6000,
} as const;

/** The ids of the places within `rangeM` of any fix. A grid of range-sized cells, so each fix looks at nine of them. */
export function visitedIds(places: readonly { id: string; at: LngLat }[], fixes: readonly { lon: number; lat: number }[], rangeM: number): Set<string> {
  const out = new Set<string>();
  if (!places.length || !fixes.length || rangeM <= 0) return out;
  const proj = projector(places[0].at);
  const cells = new Map<string, { id: string; at: LngLat }[]>();
  for (const p of places) {
    const [x, y] = proj(p.at);
    const k = `${Math.floor(x / rangeM)},${Math.floor(y / rangeM)}`;
    const cell = cells.get(k);
    if (cell) cell.push(p);
    else cells.set(k, [p]);
  }
  for (const f of fixes) {
    if (out.size === places.length) break;
    const at: LngLat = [f.lon, f.lat];
    const [x, y] = proj(at);
    const cx = Math.floor(x / rangeM);
    const cy = Math.floor(y / rangeM);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const p of cells.get(`${cx + dx},${cy + dy}`) ?? []) if (!out.has(p.id) && distanceM(at, p.at) <= rangeM) out.add(p.id);
      }
    }
  }
  return out;
}

/** The outings whose own middle, in some area they crossed, lies near this point: the newest first, at most the rule's number. */
export function walksNear(rows: readonly { walk_id: string; lon: number; lat: number; last_t: number }[], at: LngLat, nearM: number = VISITED_RULES.nearM): string[] {
  const newest = new Map<string, number>();
  for (const r of rows) {
    if (distanceM(at, [r.lon, r.lat]) > nearM) continue;
    newest.set(r.walk_id, Math.max(newest.get(r.walk_id) ?? 0, r.last_t));
  }
  return [...newest].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, VISITED_RULES.walksMax).map(([id]) => id);
}
