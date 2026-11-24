// @layer core
import { END_MARK_R } from './pins';
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

/**
 * Whether a finished walk's start and end are drawn as one mark at this zoom (tend map T50, decision 0244): when they
 * lie within one marker's diameter of each other on screen (twice `END_MARK_R`), the end's bullseye over the start
 * hid it but for a crescent, so the start's ring becomes a halo round the end. Judged on screen (web mercator, 512 px
 * tiles, as the maps), so the same two points are one mark zoomed out and two zoomed in. With no end (a live walk),
 * or no zoom known yet, they are two marks as before.
 */
export function endsTogether(ends: { start: LngLat | null; end: LngLat | null }, zoom: number | null | undefined): boolean {
  const { start, end } = ends;
  if (!start || !end || zoom == null || !Number.isFinite(zoom)) return false;
  const size = 512 * 2 ** zoom;
  const y = (lat: number) => ((1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2) * size;
  const dx = ((end[0] - start[0]) / 360) * size;
  const dy = y(end[1]) - y(start[1]);
  return Math.hypot(dx, dy) <= 2 * END_MARK_R;
}
