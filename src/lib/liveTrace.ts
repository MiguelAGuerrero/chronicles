// @layer core
import { isBreak, type PauseSpan } from './geo';
import type { LngLat, TracePoint } from './types';

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

/** The newest gap in the kept trace that isn't a pause: the app was closed or the page hidden. */
export function newestGap(kept: TracePoint[], pauses: PauseSpan[]): { ms: number; at: number } | null {
  for (let i = kept.length - 1; i > 0; i--) {
    const a = kept[i - 1];
    const b = kept[i];
    if (isBreak(a, b, pauses) && !isBreak(a, b, pauses, Infinity)) return { ms: b.t - a.t, at: b.t };
  }
  return null;
}
