// @layer core
import type { LngLat } from '../types';

/** QC19: a stop is named within this distance. */
export const ARRIVAL_M = 60;

/** QC19: the index of the nearest stop within reach of the fix that has not been said, or null. */
export function stopWithin(_stops: readonly LngLat[], _fix: LngLat, _said: ReadonlySet<number>, _radiusM: number = ARRIVAL_M): number | null {
  throw new Error('not built: quick-circuit QC19');
}
