// @layer core
import { distanceM } from '../geo';
import { MAX_RETRACE, retracedM } from '../kindWalk/plan';
import type { Route } from '../nav/types';
import type { LngLat } from '../types';
import { fitOrder, type Leg } from '../walkPlanner/planner';
import type { Candidate, Facets } from './candidates';
import { MAX_STOPS, MIN_STOPS, pickStops } from './pick';

export type OutingReason = 'noPosition' | 'few' | 'noRoute' | 'noLoop';

export interface Outing {
  /** The stops in the order they are walked. */
  stops: Candidate[];
  path: LngLat[];
  lengthM: number;
  loop: boolean;
}

export interface OutingInput {
  cands: readonly Candidate[];
  match: Facets;
  from: LngLat | null;
  mode: 'loop' | 'oneway';
  ceilingM: number;
  offered?: ReadonlySet<string>;
}

/** The nearest few are tried together, so one far stop does not take a pair that would fit. */
const POOL = 6;

function* combinations(n: number, k: number, from = 0): Generator<number[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = from; i <= n - k; i++) for (const rest of combinations(n, k - 1, i + 1)) yield [i, ...rest];
}

/** QC6-QC10, QC30: one proposal, never several; the planner's own ceiling (hard) and retrace (a tenth) rules; a reason when none. */
export function planOuting(input: OutingInput, leg: Leg): { outing: Outing | null; reasons: OutingReason[] } {
  if (!input.from) return { outing: null, reasons: ['noPosition'] };
  const from = input.from;
  const loop = input.mode === 'loop';
  const ranked = pickStops(input.cands, input.match, from, input.ceilingM, input.offered);
  if (ranked.length < MIN_STOPS) return { outing: null, reasons: ['few'] };
  const pool = ranked.slice(0, POOL);
  const here: Leg = (a, b, avoid) => (distanceM(a, b) < 5 ? { path: [a, b], lengthM: 0, source: 'here' } : leg(a, b, avoid));
  const cache = new Map<string, Route | null>();
  const key = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  let routed = false;
  for (let size = Math.min(MAX_STOPS, pool.length); size >= MIN_STOPS; size--) {
    for (const combo of combinations(pool.length, size)) {
      const chosen = combo.map((i) => pool[i]);
      const pts: LngLat[] = [from, ...chosen.map((c) => c.at)];
      const legAt = (i: number, j: number): Route | null => {
        const k = `${key(pts[i])}>${key(pts[j])}`;
        if (!cache.has(k)) cache.set(k, here(pts[i], pts[j]));
        return cache.get(k)!;
      };
      const fit = fitOrder(chosen.map((_, i) => i + 1), pts, legAt, here, loop);
      if (!fit) continue;
      routed = true;
      if (fit.lengthM > input.ceilingM || retracedM(fit.path) > MAX_RETRACE * fit.lengthM) continue;
      return { outing: { stops: fit.order.map((i) => chosen[i - 1]), path: fit.path, lengthM: fit.lengthM, loop }, reasons: [] };
    }
  }
  return { outing: null, reasons: [routed ? 'few' : loop ? 'noLoop' : 'noRoute'] };
}
