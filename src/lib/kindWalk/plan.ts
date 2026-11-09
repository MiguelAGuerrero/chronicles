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

/** Cheap, by vertex pairs: used to order stops (a stop in the middle of a street makes its edges differ from a pass along it). */
export function retracedEdgesM(path: readonly LngLat[]): number {
  const seen = new Set<string>();
  let again = 0;
  for (let i = 1; i < path.length; i++) {
    const k = [pointKey(path[i - 1]), pointKey(path[i])].sort().join('>');
    if (seen.has(k)) again += distanceM(path[i - 1], path[i]);
    seen.add(k);
  }
  return again;
}

const SAMPLE_M = 20;
/** A sample is a retrace when it lies this near an earlier part of the path, at least ADJACENT_M further back along it. */
const NEAR_M = 12;
const ADJACENT_M = 60;

/**
 * The length of a path that runs over a stretch it has already used, in either direction, measured along the geometry (KW16): a stop
 * in the middle of a street and a pass along it are the same street (walk planner audit 8).
 */
export function retracedM(path: readonly LngLat[]): number {
  const pts: { p: LngLat; at: number }[] = [];
  let along = 0;
  let carried = 0;
  for (let i = 1; i < path.length; i++) {
    const d = distanceM(path[i - 1], path[i]);
    if (d === 0) continue;
    let m = SAMPLE_M - carried;
    while (m <= d) {
      const f = m / d;
      pts.push({ p: [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f], at: along + m });
      m += SAMPLE_M;
    }
    carried = (carried + d) % SAMPLE_M;
    along += d;
  }
  let again = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = 0; j < i; j++) {
      if (pts[i].at - pts[j].at > ADJACENT_M && distanceM(pts[i].p, pts[j].p) <= NEAR_M) {
        again += SAMPLE_M;
        break;
      }
    }
  }
  return again;
}
