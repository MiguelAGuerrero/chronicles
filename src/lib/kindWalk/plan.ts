// @layer core
import { distanceM } from '../geo';
import type { Route } from '../nav/types';
import type { LngLat } from '../types';
import type { Cell } from './density';

/*
 * One suggested way through the dense cells of a kind (KW4, KW5, KW8, KW9, KW11b, KW16, KW17). One deterministic plan, never a
 * search among alternatives for the "best" one: the cells are taken in density order, each new cell is kept only if the whole
 * route from where the walker stands, through the cells in their best order, still fits the budget and runs over no more than
 * a tenth of itself again. Routing is a function the caller gives, so this stays pure.
 */

/** The way is within this of the budget, and over it only up to this (KW8). */
export const TOLERANCE = 0.25;
/** Beyond this from the walker to the start, no walk is offered (KW9b). */
export const FAR_START_M = 5000;
/** At least this many cells make a walk: one cell is a place to stand, not a way (KW2). */
export const MIN_CELLS = 2;
/** No more than this share of the route may run over a street piece it has already used (KW16). */
export const MAX_RETRACE = 0.1;
/** The densest this many cells are considered, and orders are tried exhaustively up to ORDER_CELLS of them. */
const CONSIDERED = 8;
const ORDER_CELLS = 6;
/** In choosing an order, a metre walked twice counts this much more than a metre walked once. */
const RETRACE_WEIGHT = 3;

export interface KindWalk {
  /** The cell centres passed, in order; the first is where the kind begins, the last where the walk ends. */
  stops: LngLat[];
  /** The whole path: from where the walker stands, through the stops, to the last. */
  path: LngLat[];
  /** Its length, the whole of it (KW17): what the walk screen then shows. */
  lengthM: number;
  /** The part of it from the walker to the first stop (KW9), by the streets. */
  startM: number;
}

export type Planned =
  | { kind: 'walk'; walk: KindWalk }
  | { kind: 'few' }
  | { kind: 'far' }
  | { kind: 'noRoute' };

type Leg = (a: LngLat, b: LngLat) => Route | null;

const pointKey = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

/** The length of a path that runs over a stretch it has already used, in either direction (KW16). */
export function retracedM(path: readonly LngLat[]): number {
  const seen = new Set<string>();
  let again = 0;
  for (let i = 1; i < path.length; i++) {
    const k = [pointKey(path[i - 1]), pointKey(path[i])].sort().join('>');
    if (seen.has(k)) again += distanceM(path[i - 1], path[i]);
    seen.add(k);
  }
  return again;
}

interface Candidate {
  order: number[];
  path: LngLat[];
  lengthM: number;
  startM: number;
  retraced: number;
}

function* permutations(items: number[]): Generator<number[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) yield [items[i], ...p];
  }
}

/**
 * The order of `set` (indices into the points, 0 being the walker) with the least cost: its routed length plus the metres it
 * walks twice, again. Up to ORDER_CELLS every order is tried; beyond that the nearest one first.
 */
function bestOrder(set: number[], pts: readonly LngLat[], leg: (i: number, j: number) => Route | null): Candidate | null {
  const orders = set.length <= ORDER_CELLS ? permutations(set) : [nearestFirst(set, pts)];
  let best: (Candidate & { cost: number }) | null = null;
  for (const order of orders) {
    const path: LngLat[] = [];
    let lengthM = 0;
    let startM = 0;
    let ok = true;
    let from = 0;
    for (let k = 0; k < order.length && ok; k++) {
      const r = leg(from, order[k]);
      if (!r) {
        ok = false;
        break;
      }
      path.push(...(path.length ? r.path.slice(1) : r.path));
      lengthM += r.lengthM;
      if (k === 0) startM = r.lengthM;
      from = order[k];
    }
    if (!ok) continue;
    const retraced = retracedM(path);
    const cost = lengthM + RETRACE_WEIGHT * retraced;
    if (!best || cost < best.cost) best = { order, path, lengthM, startM, retraced, cost };
  }
  return best;
}

function nearestFirst(set: number[], pts: readonly LngLat[]): number[] {
  const left = [...set];
  const out: number[] = [];
  let at = pts[0];
  while (left.length) {
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (distanceM(at, pts[left[i]]) < distanceM(at, pts[left[bi]])) bi = i;
    const next = left.splice(bi, 1)[0];
    out.push(next);
    at = pts[next];
  }
  return out;
}

/**
 * The walk for `cells` (densest first) from `from` within `budgetM`, the whole route counted (KW17). A cell that would push the
 * route past the budget plus the tolerance, or make it run over itself more than MAX_RETRACE (KW16), is skipped and the next
 * one tried, in that fixed order; it stops once the route is within the tolerance of the budget. Fewer than MIN_CELLS to pass,
 * or a walker too far from the start, is said (KW2, KW9b).
 */
export function planKindWalk(cells: readonly Cell[], from: LngLat, budgetM: number, route: Leg): Planned {
  const used = cells.slice(0, CONSIDERED);
  if (used.length < MIN_CELLS) return { kind: 'few' };
  // Too far to start on foot: said before any street is read (KW9b).
  if (Math.min(...used.map((c) => distanceM(from, c.at))) > FAR_START_M) return { kind: 'far' };
  const pts: LngLat[] = [from, ...used.map((c) => c.at)];
  const cache = new Map<string, Route | null>();
  const leg = (i: number, j: number): Route | null => {
    const key = `${i}>${j}`;
    if (!cache.has(key)) cache.set(key, route(pts[i], pts[j]));
    return cache.get(key)!;
  };
  const ceiling = budgetM * (1 + TOLERANCE);
  const floor = budgetM * (1 - TOLERANCE);
  let chosen: number[] = [];
  let best: Candidate | null = null;
  for (let c = 1; c < pts.length; c++) {
    const trial = [...chosen, c];
    if (trial.length < MIN_CELLS) {
      chosen = trial;
      continue;
    }
    const cand = bestOrder(trial, pts, leg);
    if (!cand) continue;
    if (cand.lengthM > ceiling || cand.retraced > MAX_RETRACE * cand.lengthM) continue;
    chosen = trial;
    best = cand;
    if (cand.lengthM >= floor) break;
  }
  if (!best) return { kind: 'noRoute' };
  return {
    kind: 'walk',
    walk: { stops: best.order.map((i) => pts[i]), path: best.path, lengthM: best.lengthM, startM: best.startM },
  };
}
