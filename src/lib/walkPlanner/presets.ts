// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Cell } from '../kindWalk/density';

/*
 * The three presets (WP4, WP5): fixed rules over the kind's dense cells, in a fixed order. A preset says which cells to try adding
 * first; the planner then finds the order that walks least twice. The same inputs give the same cells.
 */

export type PresetId = 'middle' | 'across' | 'edge';
/** The fixed order of the rows: by preset, never by length, density or quality. */
export const PRESET_IDS: readonly PresetId[] = ['middle', 'across', 'edge'];
/** The densest this many cells are considered, as the kind walk did. */
export const CONSIDERED = 8;

const key = (c: Cell) => `${c.at[1].toFixed(6)},${c.at[0].toFixed(6)}`;
const tie = (a: Cell, b: Cell) => b.count - a.count || (key(a) < key(b) ? -1 : 1);

function centroid(cells: readonly Cell[]): LngLat {
  let w = 0, x = 0, y = 0;
  for (const c of cells) {
    w += c.count;
    x += c.at[0] * c.count;
    y += c.at[1] * c.count;
  }
  return [x / w, y / w];
}

/** Distance from a point to the line through two points, in metres (planar around the first). */
function offLine(p: LngLat, a: LngLat, b: LngLat): number {
  const ab = distanceM(a, b) || 1;
  const ap = distanceM(a, p);
  const bp = distanceM(b, p);
  const s = (ab + ap + bp) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - ab) * (s - ap) * (s - bp)));
  return (2 * area) / ab;
}

/** Rotates a list by `round`, so a later press starts from another dense cell and never from a less dense one. */
function rotate<T>(list: readonly T[], round: number): T[] {
  if (!list.length) return [];
  const k = round % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

/**
 * The cells to try adding, first to last, for a preset. `cells` are the dense cells, densest first. Round 0 is the first
 * suggestion; later rounds rotate the start (WP13).
 */
export function priority(id: PresetId, cells: readonly Cell[], round = 0): Cell[] {
  const dense = [...cells].sort(tie).slice(0, CONSIDERED);
  if (dense.length < 2) return dense;
  let order: Cell[];
  if (id === 'middle') {
    const mid = centroid(dense);
    order = [...dense].sort((a, b) => distanceM(a.at, mid) - distanceM(b.at, mid) || tie(a, b));
  } else if (id === 'across') {
    let best: [Cell, Cell] = [dense[0], dense[1]];
    let far = -1;
    for (let i = 0; i < dense.length; i++) {
      for (let j = i + 1; j < dense.length; j++) {
        const d = distanceM(dense[i].at, dense[j].at);
        if (d > far) [far, best] = [d, [dense[i], dense[j]]];
      }
    }
    const rest = dense.filter((c) => c !== best[0] && c !== best[1]).sort((a, b) => offLine(a.at, best[0].at, best[1].at) - offLine(b.at, best[0].at, best[1].at) || tie(a, b));
    order = [best[0], best[1], ...rest];
  } else {
    const top = dense[0];
    const others = dense.slice(1).sort((a, b) => distanceM(b.at, top.at) - distanceM(a.at, top.at) || tie(a, b));
    order = [...others, top];
  }
  return rotate(order, round);
}
