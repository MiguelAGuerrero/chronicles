// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';

/*
 * What the walk planner keeps from the kind walk's own planner (KW16, WP20, WP26): the limits, and how a path's retracing is
 * measured. The planning itself is `walkPlanner/planner.ts`.
 */

/** Beyond this from the walker to the start, no walk is offered (WP26). */
export const FAR_START_M = 5000;
/** At least this many cells make a walk: one cell is a place to stand, not a way (WP26). */
export const MIN_CELLS = 2;
/** No more than this share of the route may run over a street piece it has already used (KW16). */
export const MAX_RETRACE = 0.1;

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
