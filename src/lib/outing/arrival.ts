// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';

/** QC19: a stop is named within this distance. */
export const ARRIVAL_M = 60;

/** QC19: the index of the nearest stop within reach of the fix that has not been said, or null. */
export function stopWithin(stops: readonly LngLat[], fix: LngLat, said: ReadonlySet<number>, radiusM: number = ARRIVAL_M): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  stops.forEach((s, i) => {
    if (said.has(i)) return;
    const d = distanceM(fix, s);
    if (d <= radiusM && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
