import { filterFixes, pointSegmentDist, projector, splitAtGaps } from './geo';
import type { LngLat, StreetSegment, TracePoint, VisitedSegment } from './types';

/** A segment sample counts as covered when the trace passed within this distance. */
export const BUFFER_M = 20;
/**
 * Fraction of a segment's length that must be covered to count it as walked.
 * Still an open decision in the concept doc; 0.5 is the starting guess.
 */
export const WALKED_THRESHOLD = 0.5;
const SAMPLE_STEP_M = 5;
const CELL_M = 50;

type XY = [number, number];

/**
 * Credits street segments by how much of their length lies within BUFFER_M
 * of the trace. Gaps over 60 s are not interpolated across.
 */
export function snap(
  walkId: string,
  points: TracePoint[],
  segments: StreetSegment[],
): VisitedSegment[] {
  const fixes = filterFixes(points);
  if (fixes.length < 2 || segments.length === 0) return [];
  const runs = splitAtGaps(fixes);
  const proj = projector([fixes[0].lon, fixes[0].lat]);

  // Grid index over trace edges, each tagged with the time it was walked.
  const grid = new Map<string, { a: XY; b: XY; t: number }[]>();
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  let fi = 0;
  for (const run of runs) {
    for (let i = 0; i < run.length; i++, fi++) {
      if (i === 0) continue;
      const a = proj(run[i - 1]);
      const b = proj(run[i]);
      const edge = { a, b, t: fixes[fi - 1].t };
      const x0 = Math.floor((Math.min(a[0], b[0]) - BUFFER_M) / CELL_M);
      const x1 = Math.floor((Math.max(a[0], b[0]) + BUFFER_M) / CELL_M);
      const y0 = Math.floor((Math.min(a[1], b[1]) - BUFFER_M) / CELL_M);
      const y1 = Math.floor((Math.max(a[1], b[1]) + BUFFER_M) / CELL_M);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const k = key(cx, cy);
          const list = grid.get(k);
          if (list) list.push(edge);
          else grid.set(k, [edge]);
        }
    }
  }

  const nearest = (p: XY): { d: number; t: number } | null => {
    const list = grid.get(key(Math.floor(p[0] / CELL_M), Math.floor(p[1] / CELL_M)));
    if (!list) return null;
    let best: { d: number; t: number } | null = null;
    for (const e of list) {
      const d = pointSegmentDist(p, e.a, e.b);
      if (!best || d < best.d) best = { d, t: e.t };
    }
    return best;
  };

  const visited: VisitedSegment[] = [];
  for (const seg of segments) {
    let total = 0;
    let covered = 0;
    let firstT = Infinity;
    for (const line of seg.geometry) {
      for (const [p, w] of samples(line.map(proj), SAMPLE_STEP_M)) {
        total += w;
        const hit = nearest(p);
        if (hit && hit.d <= BUFFER_M) {
          covered += w;
          firstT = Math.min(firstT, hit.t);
        }
      }
    }
    if (total === 0 || covered === 0) continue;
    const fraction = covered / total;
    if (fraction >= WALKED_THRESHOLD) {
      visited.push({ segment_id: seg.id, walk_id: walkId, covered_fraction: fraction, first_t: firstT });
    }
  }
  return visited;
}

/** Evenly spaced points along a projected line, each weighted by the length it stands for. */
function* samples(line: XY[], step: number): Generator<[XY, number]> {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      yield [[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], len / n];
    }
  }
}

/** Whether every sample of `line` lies within `maxM` of some line in `others`. */
export function runsAlongside(line: LngLat[], others: LngLat[][], maxM: number): boolean {
  if (others.length === 0 || line.length < 2) return false;
  const proj = projector(line[0]);
  const pl = line.map(proj);
  const po = others.map((o) => o.map(proj));
  for (const [p] of samples(pl, SAMPLE_STEP_M)) {
    let ok = false;
    for (const o of po) {
      for (let i = 1; i < o.length && !ok; i++) ok = pointSegmentDist(p, o[i - 1], o[i]) <= maxM;
      if (ok) break;
    }
    if (!ok) return false;
  }
  return true;
}
