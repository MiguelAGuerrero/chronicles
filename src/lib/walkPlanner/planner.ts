// @layer core
import { distanceM, distanceToLinesM } from '../geo';
import { FAR_START_M, MAX_RETRACE, MIN_CELLS, retracedEdgesM, retracedM } from '../kindWalk/plan';
import type { Cell } from '../kindWalk/density';
import type { Route } from '../nav/types';
import type { LngLat } from '../types';
import { gradeRuns, kindShare, type Run } from './exposure';
import { CONSIDERED, PRESET_IDS, priority, type PresetId } from './presets';
import { DENSITY_SHARE, type Density, type Mode } from './settings';

/*
 * Up to three routes through a kind's dense cells, from where the walker stands (WP3-WP6, WP8, WP10, WP11, WP13, WP20, WP26). Pure:
 * routing is a function the caller gives. One deterministic plan per preset, never a search among alternatives for a best one.
 */

/** Two routes share at most this much of their length (WP6, WP13). */
export const MAX_OVERLAP = 0.8;

export type Reason = 'noPosition' | 'far' | 'few' | 'noRoute' | 'outOfReach' | 'little' | 'same' | 'nothingDifferent' | 'cars' | 'noLoop';

export interface PlannedRoute {
  preset: PresetId;
  /** The cell centres passed, in order. A loop ends where it began; a one-way trip ends at the last. */
  stops: LngLat[];
  /** The whole path, from where the walker stands. */
  path: LngLat[];
  /** The whole of it, the way there and, in a loop, the way back (WP10, KW17). */
  lengthM: number;
  /** The part of it from the walker to the first stop. */
  startM: number;
  loop: boolean;
  runs: Run[];
}

export interface PlanInput {
  cells: readonly Cell[];
  /** PK9: the cells the route is graded by when they differ from those it chooses stops from (every place of the bar). */
  graded?: readonly Cell[];
  from: LngLat | null;
  mode: Mode;
  ceilingM: number;
  density: Density;
  /** 0 the first suggestion; each press of "Suggest different routes" adds one (WP13). */
  round?: number;
  /** The paths on screen now, which a new suggestion must not repeat (WP13). The only memory there is. */
  shown?: readonly (readonly LngLat[])[];
}

export interface Planned {
  routes: PlannedRoute[];
  reasons: Reason[];
}

/** A leg between two points over the streets; `avoid` is a path whose streets it should leave unused where it can. */
export type Leg = (a: LngLat, b: LngLat, avoid?: readonly LngLat[]) => Route | null;

const pk = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

function lengthOf(path: readonly LngLat[]): number {
  return path.reduce((s, p, i) => (i ? s + distanceM(path[i - 1], p) : 0), 0);
}

/**
 * The share of the shorter of two paths that runs along the other, measured along the geometry (WP6): a stop in the middle of a street
 * does not make it another street (walk planner audit 8).
 */
export function overlapShare(a: readonly LngLat[], b: readonly LngLat[]): number {
  const [short, long] = lengthOf(a) <= lengthOf(b) ? [a, b] : [b, a];
  const total = lengthOf(short);
  if (!total) return 0;
  const lines = [[...long]];
  let shared = 0;
  const STEP = 25;
  for (let i = 1; i < short.length; i++) {
    const d = distanceM(short[i - 1], short[i]);
    const n = Math.max(1, Math.round(d / STEP));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const p: LngLat = [short[i - 1][0] + (short[i][0] - short[i - 1][0]) * f, short[i - 1][1] + (short[i][1] - short[i - 1][1]) * f];
      if (distanceToLinesM(p, lines) <= 12) shared += d / n;
    }
  }
  return shared / total;
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

const ORDER_CELLS = 6;
const RETRACE_WEIGHT = 3;

interface Fit {
  order: number[];
  path: LngLat[];
  lengthM: number;
  startM: number;
}

/** A fitted order over `set` (indices into pts, 0 the walker): its path, and the way back for a loop. */
function fitOrder(set: number[], pts: readonly LngLat[], leg: (i: number, j: number) => Route | null, back: Leg, loop: boolean): Fit | null {
  const outbound: { order: number[]; path: LngLat[]; len: number; cost: number; startM: number }[] = [];
  const orders = set.length <= ORDER_CELLS ? [...permutations(set)] : [nearestFirst(set, pts)];
  for (const order of orders) {
    const path: LngLat[] = [];
    let len = 0;
    let startM = 0;
    let from = 0;
    let ok = true;
    for (let k = 0; k < order.length; k++) {
      const r = leg(from, order[k]);
      if (!r) {
        ok = false;
        break;
      }
      path.push(...(path.length ? r.path.slice(1) : r.path));
      len += r.lengthM;
      if (k === 0) startM = r.lengthM;
      from = order[k];
    }
    if (!ok) continue;
    // A loop is judged by its way out and a straight guess of the way back; the best few get the real way back below.
    const guess = loop ? distanceM(pts[order[order.length - 1]], pts[0]) * 1.3 : 0;
    outbound.push({ order, path, len, startM, cost: len + RETRACE_WEIGHT * retracedEdgesM(path) + guess });
  }
  outbound.sort((a, b) => a.cost - b.cost);
  let best: (Fit & { cost: number }) | null = null;
  for (const o of outbound.slice(0, loop ? 3 : 1)) {
    let path = o.path;
    let lengthM = o.len;
    if (loop) {
      const last = pts[o.order[o.order.length - 1]];
      const r = back(last, pts[0], o.path) ?? back(last, pts[0]);
      if (!r) continue;
      path = [...o.path, ...r.path.slice(1)];
      lengthM += r.lengthM;
    }
    const cost = lengthM + RETRACE_WEIGHT * retracedEdgesM(path);
    if (!best || cost < best.cost) best = { order: o.order, path, lengthM, startM: o.startM, cost };
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
 * The routes for the settings (WP3-WP6, WP8, WP10, WP11, WP13, WP20, WP26). Up to three, one per preset, in the presets' fixed
 * order. A preset adds cells in its own order for as long as the whole route, from the walker and (in a loop) back to the walker,
 * stays within the ceiling and runs over itself by no more than a tenth. A route that passes less of the kind than the density
 * asks for, or shares more than 80% with an earlier one or with one on screen, is left out, and the reason is said.
 */
/**
 * One preset's route (WP5, WP10, walk planner audit 3): its cells are tried in its order, a cell kept only while the whole route stays
 * within the ceiling and retraces by no more than a tenth. When the first cell cannot be reached within the ceiling, the preset starts
 * again from the next, so one far cell does not take a pair that would fit.
 */
export function fitPreset(
  id: PresetId,
  dense: readonly Cell[],
  from: LngLat,
  mode: Mode,
  ceilingM: number,
  route: Leg,
  round = 0,
  state: { routed: boolean } = { routed: false },
  cache: Map<string, Route | null> = new Map(),
): { stops: LngLat[]; path: LngLat[]; lengthM: number; startM: number } | null {
  const loop = mode === 'loop';
  const here: Leg = (a, b, avoid) => (distanceM(a, b) < 5 ? { path: [a, b], lengthM: 0, source: 'here' } : route(a, b, avoid));
  const order = priority(id, dense, round);
  for (let seed = 0; seed < Math.min(3, Math.max(1, order.length - 1)); seed++) {
    const cells = order.slice(seed);
    const pts: LngLat[] = [from, ...cells.map((c) => c.at)];
    const leg = (i: number, j: number): Route | null => {
      // By the points, not their indices: each preset numbers its own.
      const k = `${pk(pts[i])}>${pk(pts[j])}`;
      if (!cache.has(k)) cache.set(k, here(pts[i], pts[j]));
      return cache.get(k)!;
    };
    let chosen: number[] = [];
    let best: Fit | null = null;
    for (let c = 1; c < pts.length; c++) {
      const trial = [...chosen, c];
      if (trial.length < MIN_CELLS) {
        chosen = trial;
        continue;
      }
      const fit = fitOrder(trial, pts, leg, here, loop);
      if (!fit) continue;
      state.routed = true;
      if (fit.lengthM > ceilingM || retracedM(fit.path) > MAX_RETRACE * fit.lengthM) continue;
      chosen = trial;
      best = fit;
    }
    if (best) return { stops: best.order.map((i) => pts[i]), path: best.path, lengthM: best.lengthM, startM: best.startM };
  }
  return null;
}

export function planRoutes(input: PlanInput, route: Leg): Planned {
  if (!input.from) return { routes: [], reasons: ['noPosition'] };
  const from = input.from;
  const dense = [...input.cells].slice(0, CONSIDERED);
  if (dense.length < MIN_CELLS) return { routes: [], reasons: ['few'] };
  if (Math.min(...dense.map((c) => distanceM(from, c.at))) > FAR_START_M) return { routes: [], reasons: ['far'] };
  const loop = input.mode === 'loop';
  // Two points on the same spot are no leg at all; the streets give no route between them, and none is needed.
  const here: Leg = (a, b, avoid) => (distanceM(a, b) < 5 ? { path: [a, b], lengthM: 0, source: 'here' } : route(a, b, avoid));
  const cache = new Map<string, Route | null>();
  const round = input.round ?? 0;
  const out: PlannedRoute[] = [];
  const reasons = new Set<Reason>();
  let anyRouted = false;
  for (const id of PRESET_IDS) {
    const state = { routed: false };
    const found = fitPreset(id, dense, from, input.mode, input.ceilingM, here, round, state, cache);
    if (state.routed) anyRouted = true;
    if (!found) {
      reasons.add(anyRouted ? 'outOfReach' : 'noRoute');
      continue;
    }
    const best = found;
    const runs = gradeRuns(best.path, input.graded ?? dense);
    if (kindShare(runs) < DENSITY_SHARE[input.density]) {
      reasons.add('little');
      continue;
    }
    const stops = best.stops;
    const candidate: PlannedRoute = { preset: id, stops, path: best.path, lengthM: best.lengthM, startM: best.startM, loop, runs };
    if (out.some((r) => overlapShare(r.path, candidate.path) > MAX_OVERLAP)) {
      reasons.add('same');
      continue;
    }
    if ((input.shown ?? []).some((p) => overlapShare(p, candidate.path) > MAX_OVERLAP)) {
      reasons.add('nothingDifferent');
      continue;
    }
    out.push(candidate);
  }
  // A loop that cannot be made without going back the way it came is said so, and one way is the answer (WP8).
  if (loop && !out.length && (reasons.has('outOfReach') || reasons.has('noRoute'))) {
    reasons.delete('outOfReach');
    reasons.delete('noRoute');
    reasons.add('noLoop');
  }
  return { routes: out, reasons: [...reasons] };
}
