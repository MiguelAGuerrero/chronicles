// @layer core
import type { LngLat } from './types';

/** The same ride lines as last time, kept as they were, so the map isn't sent them again (rides audit 4). */
export function sameRuns(a: LngLat[][], b: LngLat[][]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.length !== y.length || x[0]?.[0] !== y[0]?.[0] || x[x.length - 1]?.[0] !== y[y.length - 1]?.[0] || x[x.length - 1]?.[1] !== y[y.length - 1]?.[1]) return false;
  }
  return true;
}

