import { filterFixes, pointSegmentDist, projector, splitAtGaps, type PauseSpan } from './geo';
import { samples, streetKey } from './streets';
import type { StreetSegment, TracePoint, VisitedSegment } from './types';

/** A segment sample counts as covered when the trace passed within this distance. */
export const BUFFER_M = 20;
/**
 * Fraction of a segment's length that must be covered to count it as walked.
 * Still an open decision in the concept doc; 0.5 is the starting guess.
 */
export const WALKED_THRESHOLD = 0.5;
/**
 * The first and last BUFFER_M of a piece sit at junctions, where the trace
 * passes whenever it crosses or turns. They are left out of the count, so
 * reaching a corner does not credit the street around it.
 */
const END_ZONE_M = BUFFER_M;
/** A piece too short to have a middle is credited only if the trace ran down its middle. */
const SHORT_MIDDLE_M = BUFFER_M / 2;
const SAMPLE_STEP_M = 5;
const CELL_M = 50;

type XY = [number, number];

/**
 * Credits street segments by how much of their length (away from the
 * junction at each end) lies within BUFFER_M of the trace. Gaps over 60 s
 * and pauses are not interpolated across.
 */
export function snap(
  walkId: string,
  points: TracePoint[],
  segments: StreetSegment[],
  startedAt: number | null = null,
  pauses: PauseSpan[] = [],
): VisitedSegment[] {
  const fixes = filterFixes(points, startedAt);
  if (fixes.length < 2 || segments.length === 0) return [];
  const runs = splitAtGaps(fixes, 60_000, pauses);
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
      const pl = line.map(proj);
      const length = lineLength(pl);
      if (length <= 2 * END_ZONE_M) {
        // No middle to measure: credit it only if the trace ran down its middle.
        const mid = pointAlong(pl, length / 2);
        const hit = nearest(mid);
        total += length;
        if (hit && hit.d <= SHORT_MIDDLE_M) {
          covered += length;
          firstT = Math.min(firstT, hit.t);
        }
        continue;
      }
      let along = 0;
      for (const [p, w] of samples(pl, SAMPLE_STEP_M)) {
        const at = along + w / 2;
        along += w;
        if (at < END_ZONE_M || at > length - END_ZONE_M) continue;
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
      visited.push({
        segment_id: seg.id, walk_id: walkId, covered_fraction: fraction, first_t: firstT, street_key: streetKey(seg),
      });
    }
  }
  return visited;
}

function lineLength(pl: XY[]): number {
  let d = 0;
  for (let i = 1; i < pl.length; i++) d += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
  return d;
}

function pointAlong(pl: XY[], dist: number): XY {
  let acc = 0;
  for (let i = 1; i < pl.length; i++) {
    const d = Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
    if (acc + d >= dist) {
      const f = (dist - acc) / (d || 1);
      return [pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * f, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * f];
    }
    acc += d;
  }
  return pl[pl.length - 1];
}
