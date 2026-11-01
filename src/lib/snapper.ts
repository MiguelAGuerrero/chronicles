import { pointSegmentDist, projector, splitAtGaps, type PauseSpan } from './geo';
import { readTrace } from './rides';
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
/**
 * The trace must run along a street to walk it: within this angle of the
 * street's own direction. Crossing a street at a corner runs across it.
 */
const ALONG_COS = Math.cos((35 * Math.PI) / 180);
/** The trace's direction is taken over this far either side, so GPS wobble at walking pace doesn't turn it. */
const HEADING_SPAN_M = 10;
/**
 * A named street counts as walked once this much of it was walked along: about
 * a block (the owner's call), or most of it if the whole street is shorter.
 */
export const STREET_MIN_M = 80;
const SHORT_STREET_SHARE = 0.8;
const SAMPLE_STEP_M = 5;
const CELL_M = 50;

type XY = [number, number];

/**
 * Credits street segments by how much of their length (away from the
 * junction at each end) the trace ran along, within BUFFER_M and in the
 * street's direction. Named streets need about a block walked (STREET_MIN_M)
 * before any of their pieces count. Gaps over 60 s and pauses are not
 * interpolated across.
 */
export function snap(
  walkId: string,
  points: TracePoint[],
  segments: StreetSegment[],
  startedAt: number | null = null,
  pauses: PauseSpan[] = [],
): VisitedSegment[] {
  // Walked fixes only: a ride credits no street, and breaks the trace however short (R7).
  const { walked: fixes, breaks } = readTrace(points, startedAt, pauses);
  if (fixes.length < 2 || segments.length === 0) return [];
  const runs = splitAtGaps(fixes, 60_000, breaks);
  const proj = projector([fixes[0].lon, fixes[0].lat]);

  // Grid index over trace edges, each tagged with the time it was walked and
  // the direction the trace was heading there.
  const grid = new Map<string, Edge[]>();
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  let fi = 0;
  for (const run of runs) {
    const pts = run.map(proj);
    const headings = headingsOf(pts);
    for (let i = 0; i < run.length; i++, fi++) {
      if (i === 0) continue;
      const a = pts[i - 1];
      const b = pts[i];
      const edge: Edge = { a, b, t: fixes[fi - 1].t, dir: headings[i - 1] };
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

  /** The closest trace edge within `reach` of p that runs along `dir` (either way), if any. */
  const along = (p: XY, dir: XY, reach: number): { d: number; t: number } | null => {
    const list = grid.get(key(Math.floor(p[0] / CELL_M), Math.floor(p[1] / CELL_M)));
    if (!list) return null;
    let best: { d: number; t: number } | null = null;
    for (const e of list) {
      if (Math.abs(e.dir[0] * dir[0] + e.dir[1] * dir[1]) < ALONG_COS) continue;
      const d = pointSegmentDist(p, e.a, e.b);
      if (d <= reach && (!best || d < best.d)) best = { d, t: e.t };
    }
    return best;
  };

  const credited: { seg: StreetSegment; fraction: number; coveredM: number; firstT: number }[] = [];
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
        const hit = along(mid, directionAt(pl, length / 2), SHORT_MIDDLE_M);
        total += length;
        if (hit) {
          covered += length;
          firstT = Math.min(firstT, hit.t);
        }
        continue;
      }
      let at = 0;
      for (const [p, w] of samples(pl, SAMPLE_STEP_M)) {
        const mid = at + w / 2;
        at += w;
        if (mid < END_ZONE_M || mid > length - END_ZONE_M) continue;
        total += w;
        const hit = along(p, directionAt(pl, mid), BUFFER_M);
        if (hit) {
          covered += w;
          firstT = Math.min(firstT, hit.t);
        }
      }
    }
    if (total === 0 || covered === 0) continue;
    const fraction = covered / total;
    // The share walked stands for the whole piece, ends included, as a block walked end to end is all of it.
    if (fraction >= WALKED_THRESHOLD) credited.push({ seg, fraction, coveredM: fraction * seg.length_m, firstT });
  }

  // A named street is walked once about a block of it was: a corner or a few
  // steps in and back out do not count, and its pieces stay fog until then.
  const streetLength = new Map<string, number>();
  for (const seg of segments) if (seg.name) streetLength.set(streetKey(seg), (streetLength.get(streetKey(seg)) ?? 0) + seg.length_m);
  const walkedM = new Map<string, number>();
  for (const c of credited) if (c.seg.name) walkedM.set(streetKey(c.seg), (walkedM.get(streetKey(c.seg)) ?? 0) + c.coveredM);
  const counts = (seg: StreetSegment) => {
    if (!seg.name) return true;
    const k = streetKey(seg);
    return (walkedM.get(k) ?? 0) >= Math.min(STREET_MIN_M, SHORT_STREET_SHARE * (streetLength.get(k) ?? 0));
  };
  return credited
    .filter((c) => counts(c.seg))
    .map((c) => ({
      segment_id: c.seg.id, walk_id: walkId, covered_fraction: c.fraction, first_t: c.firstT, street_key: streetKey(c.seg),
    }));
}

type Edge = { a: XY; b: XY; t: number; dir: XY };

const unit = (v: XY): XY => {
  const n = Math.hypot(v[0], v[1]);
  return n > 0 ? [v[0] / n, v[1] / n] : [0, 0];
};

/**
 * The trace's heading at each edge, from the point HEADING_SPAN_M before the
 * edge to the point HEADING_SPAN_M after it along the run.
 */
function headingsOf(pts: XY[]): XY[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out: XY[] = [];
  let lo = 0;
  let hi = 0;
  for (let i = 1; i < pts.length; i++) {
    while (lo < i - 1 && cum[lo + 1] <= cum[i - 1] - HEADING_SPAN_M) lo++;
    hi = Math.max(hi, i);
    while (hi < pts.length - 1 && cum[hi] < cum[i] + HEADING_SPAN_M) hi++;
    out.push(unit([pts[hi][0] - pts[lo][0], pts[hi][1] - pts[lo][1]]));
  }
  return out;
}

/** The street's direction at `dist` along it, over a few meters either side. */
function directionAt(pl: XY[], dist: number): XY {
  const a = pointAlong(pl, Math.max(0, dist - 3));
  const b = pointAlong(pl, dist + 3);
  return unit([b[0] - a[0], b[1] - a[1]]);
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
