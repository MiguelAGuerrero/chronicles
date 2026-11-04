// @layer core
import { projector } from '../geo';
import type { LngLat } from '../types';

/*
 * TP4: the pockets of activity inside a town. The weighted points of busy streets (OSM and Overture
 * merged, AD1-AD2) are binned into cells, each cell is smoothed over its 3 x 3 neighbours, and peaks
 * are taken busiest first, a minimum distance apart. Connected dense cells would join a whole city
 * into one mass (Allentown's 137 cells), so a pocket is a peak, not a region.
 */

export const POCKET_RULES = {
  /** Cell side. */
  cellM: 400,
  /** Peaks are at least this far apart. */
  sepM: 1500,
  /** At most this many pockets on a card. */
  cap: 5,
  /** A pocket's smoothed weight (3 x 3 cells) must reach this: roughly forty shops' worth of places. */
  floor: 40,
} as const;

export interface PocketPoint {
  at: LngLat;
  weight: number;
}

export interface Pocket {
  /** The weighted middle of the peak's 3 x 3 cells: where Walk to goes. */
  at: LngLat;
  /** The busiest street through it, filled by the shell from the strips; null when none. */
  name: string | null;
}

/** TP4: the pockets of a set of weighted points, busiest first. */
export function findPockets(points: PocketPoint[], rules: typeof POCKET_RULES = POCKET_RULES): Pocket[] {
  if (!points.length) return [];
  const origin = points[0].at;
  const proj = projector(origin);
  const cells = new Map<string, { w: number; x: number; y: number }>();
  for (const p of points) {
    const [x, y] = proj(p.at);
    const key = `${Math.floor(x / rules.cellM)},${Math.floor(y / rules.cellM)}`;
    const c = cells.get(key) ?? { w: 0, x: 0, y: 0 };
    c.w += p.weight;
    c.x += x * p.weight;
    c.y += y * p.weight;
    cells.set(key, c);
  }
  // The 3 x 3 sum around every cell that has anything near it, with the weighted middle of what is in it.
  const smooth = new Map<string, { w: number; x: number; y: number }>();
  for (const [key, c] of cells) {
    const [cx, cy] = key.split(',').map(Number);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const k = `${cx + i},${cy + j}`;
        const s = smooth.get(k) ?? { w: 0, x: 0, y: 0 };
        s.w += c.w;
        s.x += c.x;
        s.y += c.y;
        smooth.set(k, s);
      }
    }
  }
  const order = [...smooth.values()].filter((s) => s.w >= rules.floor).sort((a, b) => b.w - a.w);
  const picked: { x: number; y: number }[] = [];
  const out: Pocket[] = [];
  const [ox, oy] = origin;
  const kx = proj([ox + 1, oy])[0];
  const ky = proj([ox, oy + 1])[1];
  for (const s of order) {
    const m = { x: s.x / s.w, y: s.y / s.w };
    if (picked.some((q) => Math.hypot(q.x - m.x, q.y - m.y) < rules.sepM)) continue;
    picked.push(m);
    out.push({ at: [ox + m.x / kx, oy + m.y / ky], name: null });
    if (out.length === rules.cap) break;
  }
  return out;
}
