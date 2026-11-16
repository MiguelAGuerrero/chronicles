// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { matches, type Candidate, type Facets } from './candidates';

/** QC8: a few stops: two or three. */
export const MIN_STOPS = 2;
export const MAX_STOPS = 3;

/**
 * QC7, QC9: the candidates the picked match accepts, within reach of `from` for the ceiling, nearest first; a tie goes to the more
 * southern, then the more western place. Reads position and facets and nothing else. `offered` holds ids already given for a slot.
 * Every one is returned, in order; the planner takes the few it can fit.
 */
export function pickStops(cands: readonly Candidate[], match: Facets, from: LngLat, ceilingM: number, offered: ReadonlySet<string> = new Set()): Candidate[] {
  return cands
    .filter((c) => !offered.has(c.id) && matches(match, c) && distanceM(from, c.at) <= ceilingM)
    .map((c) => ({ c, d: Math.round(distanceM(from, c.at)) }))
    .sort((a, b) => a.d - b.d || a.c.at[1] - b.c.at[1] || a.c.at[0] - b.c.at[0] || (a.c.id < b.c.id ? -1 : 1))
    .map((x) => x.c);
}
