// @layer core
import { distanceM, projector } from '../geo';
import type { LngLat } from '../types';

/*
 * Where a kind is concentrated (KW5, KW5b): the places of the kind binned into cells of the same side as the town's
 * pockets (TP4). Every place counts, found or not, so finding one never moves a cell. A cell is a centre, never a
 * place's spot, so nothing here names or locates a single place (KW6).
 */

/** The cell side, the same as the pockets' (POCKET_RULES.cellM, TP4). */
export const CELL_M = 400;
const M_PER_DEG = 111_320;

export interface Cell {
  /** The cell's centre. */
  at: LngLat;
  /** How many places of the kind fall in it. */
  count: number;
}

/**
 * The cells that hold places, densest first; a tie goes to the more southern, then western cell, so the order is the
 * same on every open. The grid is anchored on `anchor` (the area's point), not on the places.
 */
export function densestCells(places: readonly { at: LngLat }[], anchor: LngLat, cellM = CELL_M): Cell[] {
  const dLat = cellM / M_PER_DEG;
  const dLon = dLat / Math.max(0.2, Math.cos((anchor[1] * Math.PI) / 180));
  const bins = new Map<string, { x: number; y: number; n: number }>();
  for (const p of places) {
    const x = Math.floor((p.at[0] - anchor[0]) / dLon);
    const y = Math.floor((p.at[1] - anchor[1]) / dLat);
    const key = `${x},${y}`;
    const b = bins.get(key) ?? { x, y, n: 0 };
    b.n += 1;
    bins.set(key, b);
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n || a.y - b.y || a.x - b.x)
    .map((b) => ({ at: [anchor[0] + (b.x + 0.5) * dLon, anchor[1] + (b.y + 0.5) * dLat] as LngLat, count: b.n }));
}

/** The cell nearest a point. */
export function nearestCell<T extends { at: LngLat }>(cells: readonly T[], from: LngLat): T | null {
  let best: T | null = null;
  let bestM = Infinity;
  for (const c of cells) {
    const d = distanceM(from, c.at);
    if (d < bestM) [best, bestM] = [c, d];
  }
  return best;
}

/** How far a street may lie from a cell's centre and still carry the walk through it. */
export const SNAP_M = 300;

/**
 * Each cell's centre moved onto the nearest street within SNAP_M (a walk goes along streets, and a cell's middle can lie in
 * a park or a block); a cell with no street that near is dropped. Streets are never changed by a find, so the order and the
 * stops stay the same however many places have been found (KW5b).
 */
export function onStreets(cells: readonly Cell[], lines: readonly (readonly LngLat[])[], maxM = SNAP_M): Cell[] {
  const out: Cell[] = [];
  for (const c of cells) {
    const project = projector(c.at);
    let best: { d: number; at: LngLat } | null = null;
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = project(line[i - 1]);
        const b = project(line[i]);
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / len2)) : 0;
        const x = a[0] + t * dx;
        const y = a[1] + t * dy;
        const d = Math.hypot(x, y);
        if (!best || d < best.d) best = { d, at: [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])] };
      }
    }
    if (best && best.d <= maxM) out.push({ at: best.at, count: c.count });
  }
  return out;
}
