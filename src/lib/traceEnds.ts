// @layer core
import type { LngLat } from './types';

/**
 * Where a walk began and, once it has ended, where it finished (QL1, QL2,
 * QL4): the first point of the first non-empty run, and the last point of the
 * last non-empty run. A live walk has no end; the dot is its end. With no
 * points there is neither.
 */
export function traceEnds(runs: LngLat[][], ended: boolean): { start: LngLat | null; end: LngLat | null } {
  const first = runs.find((r) => r.length > 0);
  if (!first) return { start: null, end: null };
  let last = first;
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].length > 0) {
      last = runs[i];
      break;
    }
  }
  return { start: first[0], end: ended ? last[last.length - 1] : null };
}
