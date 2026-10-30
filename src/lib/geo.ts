import type { LngLat, TracePoint } from './types';

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lineLengthM(line: LngLat[]): number {
  let d = 0;
  for (let i = 1; i < line.length; i++) d += distanceM(line[i - 1], line[i]);
  return d;
}

export function bearingDeg(a: LngLat, b: LngLat): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point `meters` away from `a` toward `b`, or `b` if it is closer. */
export function stepToward(a: LngLat, b: LngLat, meters: number): LngLat {
  const d = distanceM(a, b);
  if (d <= meters || d === 0) return b;
  const f = meters / d;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/**
 * Local equirectangular projection to meters around an origin. Accurate to
 * well under a meter across a walk-sized area, which is all the snapper needs.
 */
export function projector(origin: LngLat) {
  const kx = Math.cos(rad(origin[1])) * (Math.PI / 180) * R;
  const ky = (Math.PI / 180) * R;
  return (p: LngLat): [number, number] => [(p[0] - origin[0]) * kx, (p[1] - origin[1]) * ky];
}

export function pointSegmentDist(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export type Bounds = [west: number, south: number, east: number, north: number];

export function boundsOf(points: LngLat[], padM = 0): Bounds | null {
  if (points.length === 0) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of points) {
    w = Math.min(w, x); e = Math.max(e, x);
    s = Math.min(s, y); n = Math.max(n, y);
  }
  const padLat = padM / 111320;
  const padLon = padM / (111320 * Math.cos(rad((s + n) / 2)));
  return [w - padLon, s - padLat, e + padLon, n + padLat];
}

// Read-time fix gates from the concept doc: raw fixes are stored forever and
// filtered only when read, so the trace stays recomputable.
const MAX_ACCURACY_M = 50;
const MAX_WALK_SPEED_MS = 7; // anything faster is a GPS jump on foot
/** A cached fix from before the walk began (a last-known location) is not part of it. */
const MAX_STALE_MS = 5000;
/** Consecutive rejected fixes that agree with each other mean the anchor was the outlier. */
const REANCHOR_AFTER = 3;

const speedMs = (a: TracePoint, b: TracePoint) => {
  const dt = (b.t - a.t) / 1000;
  return dt <= 0 ? Infinity : distanceM([a.lon, a.lat], [b.lon, b.lat]) / dt;
};

/**
 * Incremental fix filter: accuracy gate, staleness gate, and a speed gate
 * against the last accepted fix. A bad fix that slipped through as the anchor
 * would otherwise reject every good fix after it, so when several rejected
 * fixes in a row agree with each other, they replace an anchor that stood
 * alone.
 */
export class FixFilter {
  readonly accepted: TracePoint[] = [];
  private rejected: TracePoint[] = [];
  /** Length of the run the newest accepted fix belongs to. */
  private runLength = 0;

  constructor(private readonly startedAt: number | null = null) {}

  /** Returns how many fixes were dropped from the end of `accepted` (0 or 1), for incremental callers. */
  push(p: TracePoint): { added: TracePoint[]; removed: number } {
    if (p.accuracy_m != null && (p.accuracy_m < 0 || p.accuracy_m > MAX_ACCURACY_M)) return { added: [], removed: 0 };
    if (this.startedAt != null && p.t < this.startedAt - MAX_STALE_MS) return { added: [], removed: 0 };
    const prev = this.accepted[this.accepted.length - 1];
    if (prev && p.t <= prev.t) return { added: [], removed: 0 };
    if (!prev || speedMs(prev, p) <= MAX_WALK_SPEED_MS) {
      this.accepted.push(p);
      this.rejected = [];
      this.runLength++;
      return { added: [p], removed: 0 };
    }
    const last = this.rejected[this.rejected.length - 1];
    this.rejected = last && speedMs(last, p) <= MAX_WALK_SPEED_MS ? [...this.rejected, p] : [p];
    if (this.rejected.length < REANCHOR_AFTER) return { added: [], removed: 0 };
    let removed = 0;
    if (this.runLength === 1) {
      this.accepted.pop();
      removed = 1;
    }
    const added = this.rejected;
    this.accepted.push(...added);
    this.rejected = [];
    this.runLength = added.length;
    return { added, removed };
  }
}

export function filterFixes(points: TracePoint[], startedAt: number | null = null): TracePoint[] {
  const f = new FixFilter(startedAt);
  for (const p of points) f.push(p);
  return f.accepted;
}

/** Splits a filtered trace wherever two fixes are more than `gapMs` apart. */
export function splitAtGaps(points: TracePoint[], gapMs = 60_000): LngLat[][] {
  const runs: LngLat[][] = [];
  let cur: LngLat[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i > 0 && points[i].t - points[i - 1].t > gapMs) {
      if (cur.length) runs.push(cur);
      cur = [];
    }
    cur.push([points[i].lon, points[i].lat]);
  }
  if (cur.length) runs.push(cur);
  return runs;
}

export function traceDistanceM(points: TracePoint[]): number {
  return splitAtGaps(points).reduce((d, run) => d + lineLengthM(run), 0);
}

/** Position on the trace at time t, interpolated between the bracketing fixes. */
export function positionAt(points: TracePoint[], t: number): LngLat | null {
  if (points.length === 0) return null;
  if (t <= points[0].t) return [points[0].lon, points[0].lat];
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    if (b.t >= t) {
      const a = points[i - 1];
      const f = (t - a.t) / (b.t - a.t || 1);
      return [a.lon + (b.lon - a.lon) * f, a.lat + (b.lat - a.lat) * f];
    }
  }
  const last = points[points.length - 1];
  return [last.lon, last.lat];
}
