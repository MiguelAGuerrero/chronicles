// @layer core
import { distanceM } from '../geo';
import type { Route } from '../nav/types';
import type { LngLat } from '../types';
import { nearestCell, type Cell } from './density';

/*
 * One suggested way through the dense cells of a kind (KW4, KW5, KW8, KW9, KW11b). One deterministic chain, never a
 * search among alternatives: the cells are taken in density order, and the chain is ordered by walking to the nearest
 * unvisited one from the cell nearest the walker. Routing is a function the caller gives, so this stays pure.
 */

/** The way is within this of the budget, and over it only up to this (KW8). */
export const TOLERANCE = 0.25;
/** Beyond this from the walker to the start, no walk is offered (KW9b). */
export const FAR_START_M = 5000;
/** At least this many cells make a walk: one cell is a place to stand, not a way (KW2). */
export const MIN_CELLS = 2;

export interface KindWalk {
  /** The cell centres passed, in order; the first is where it starts, the last where it ends. */
  stops: LngLat[];
  /** The path from the first stop to the last, through the others. */
  path: LngLat[];
  /** Its length, from the first stop to the last (KW7). */
  lengthM: number;
  /** From the walker to the first stop (KW9). */
  startM: number;
}

export type Planned =
  | { kind: 'walk'; walk: KindWalk }
  | { kind: 'few' }
  | { kind: 'far' }
  | { kind: 'noRoute' };

type Leg = (a: LngLat, b: LngLat) => Route | null;

/** The order to visit a set of cells in: from the one nearest `from`, then always the nearest left. */
function chainOrder(set: readonly Cell[], from: LngLat): Cell[] {
  const left = [...set];
  const out: Cell[] = [];
  let at = from;
  while (left.length) {
    const next = nearestCell(left, at)!;
    out.push(next);
    left.splice(left.indexOf(next), 1);
    at = next.at;
  }
  return out;
}

function routeChain(order: readonly Cell[], leg: Leg): { path: LngLat[]; lengthM: number } | null {
  const path: LngLat[] = [];
  let lengthM = 0;
  for (let i = 1; i < order.length; i++) {
    const r = leg(order[i - 1].at, order[i].at);
    if (!r) return null;
    path.push(...(path.length ? r.path.slice(1) : r.path));
    lengthM += r.lengthM;
  }
  return { path, lengthM };
}

/**
 * The walk for `cells` (densest first) from `from` within `budgetM`. Cells are taken in density order; one that would
 * push the chain past the budget plus the tolerance is skipped, the next one tried, in that fixed order; it stops once
 * the chain is within the tolerance of the budget. Fewer than MIN_CELLS to pass, or a walker too far from the start,
 * is said (KW2, KW9b).
 */
export function planKindWalk(cells: readonly Cell[], from: LngLat, budgetM: number, leg: Leg): Planned {
  if (cells.length < MIN_CELLS) return { kind: 'few' };
  const ceiling = budgetM * (1 + TOLERANCE);
  const floor = budgetM * (1 - TOLERANCE);
  let chosen: Cell[] = [];
  let best: { order: Cell[]; path: LngLat[]; lengthM: number } | null = null;
  for (const c of cells) {
    const trial = [...chosen, c];
    if (trial.length < MIN_CELLS) {
      chosen = trial;
      continue;
    }
    const order = chainOrder(trial, from);
    const routed = routeChain(order, leg);
    if (!routed || routed.lengthM > ceiling) continue;
    chosen = trial;
    best = { order, ...routed };
    if (routed.lengthM >= floor) break;
  }
  if (!best) {
    // The first two cells alone were routed or not; a chain over the ceiling or with no route is no walk.
    const order = chainOrder(chosen, from);
    const routed = chosen.length >= MIN_CELLS ? routeChain(order, leg) : null;
    if (!routed) return { kind: 'noRoute' };
    best = { order, ...routed };
  }
  const startM = distanceM(from, best.order[0].at);
  if (startM > FAR_START_M) return { kind: 'far' };
  return { kind: 'walk', walk: { stops: best.order.map((c) => c.at), path: best.path, lengthM: best.lengthM, startM } };
}
