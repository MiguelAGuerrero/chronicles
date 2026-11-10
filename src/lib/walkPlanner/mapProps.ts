// @layer core
import { boundsOf, distanceM, distanceToLinesM, type Bounds } from '../geo';
import type { LngLat } from '../types';
import type { Grade, Run } from './exposure';
import type { PlannedRoute } from './planner';

/*
 * What the planner's map is given (WP16, WP17): the routes, the highlighted one's shaded stretches, and pins for places already
 * found. It has no field for a point of interest or a "?" mark, so nothing here can name or place a place not yet found.
 */

export interface GradedPiece {
  path: LngLat[];
  grade: Grade;
}

export interface PlannerMap {
  /** The highlighted route; null while none is. */
  route: LngLat[] | null;
  /** The others, faint. With none highlighted, all of them. */
  alternates: LngLat[][];
  /** The highlighted route cut into its runs, each with its grade (WP16). */
  grades: GradedPiece[];
  /** Places already found near the routes shown: one pin for those close together, with no count. */
  pins: LngLat[];
  fit: Bounds | null;
}

/** A path cut at its runs' boundaries, each piece with the run's grade. */
export function gradedPieces(path: readonly LngLat[], runs: readonly Run[]): GradedPiece[] {
  const out: GradedPiece[] = [];
  let at = 0;
  let r = 0;
  let piece: LngLat[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const d = distanceM(path[i - 1], path[i]);
    while (r < runs.length - 1 && at + d >= runs[r].toM && d > 0) {
      const f = Math.max(0, Math.min(1, (runs[r].toM - at) / d));
      const cut: LngLat = [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f];
      piece.push(cut);
      out.push({ path: piece, grade: runs[r].grade });
      piece = [cut];
      r += 1;
    }
    piece.push(path[i]);
    at += d;
  }
  if (piece.length > 1) out.push({ path: piece, grade: (runs[Math.min(r, runs.length - 1)]?.grade ?? 0) as Grade });
  return out;
}

/** Found places within `nearM` of any of the paths, those within `joinM` of each other as one pin. No counts. */
export function pinsAlong(paths: readonly (readonly LngLat[])[], found: readonly { at: LngLat }[], nearM = 150, joinM = 150): LngLat[] {
  const lines = paths.map((p) => [...p]);
  const near = found.filter((f) => distanceToLinesM(f.at, lines) <= nearM);
  const pins: LngLat[] = [];
  for (const f of [...near].sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0])) if (!pins.some((p) => distanceM(p, f.at) <= joinM)) pins.push(f.at);
  return pins;
}

/** The planner map's props for the routes, the highlighted one (or none), and the walker's found places. */
export function plannerMap(routes: readonly PlannedRoute[], selected: number | null, found: readonly { at: LngLat }[]): PlannerMap {
  const sel = selected != null ? routes[selected] : undefined;
  const shown = sel ? [sel.path] : routes.map((r) => r.path);
  return {
    route: sel ? sel.path : null,
    alternates: routes.filter((_, i) => i !== selected).map((r) => r.path),
    grades: sel ? gradedPieces(sel.path, sel.runs) : [],
    pins: pinsAlong(shown, found),
    fit: routes.length ? boundsOf(routes.flatMap((r) => r.path), 40) : null,
  };
}
