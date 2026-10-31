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

/** Paused stretches of a walk, as [start, end] times; an open pause runs to `now`. */
export type PauseSpan = { started_at: number; ended_at: number | null };

/** Fixes outside every pause: a batch delivered late never puts a paused stretch on the map. */
export function withoutPauses<T extends { t: number }>(points: T[], pauses: PauseSpan[], now = Infinity): T[] {
  if (pauses.length === 0) return points;
  return points.filter((p) => !pauses.some((q) => p.t >= q.started_at && p.t <= (q.ended_at ?? now)));
}

/** Total paused time between `from` and `to`. */
export function pausedMs(pauses: PauseSpan[], from: number, to: number): number {
  let ms = 0;
  for (const p of pauses) {
    const a = Math.max(from, p.started_at);
    const b = Math.min(to, p.ended_at ?? to);
    if (b > a) ms += b - a;
  }
  return ms;
}

/** A stay this long inside DWELL_RADIUS_M counts as standing still (a shop, a café). */
export const DWELL_MIN_MS = 2 * 60_000;
export const DWELL_RADIUS_M = 25;

export interface Dwell {
  t0: number;
  t1: number;
  at: LngLat;
}

/**
 * Stretches where the walker stayed within DWELL_RADIUS_M of where the
 * stretch began for at least DWELL_MIN_MS. GPS jitter inside a building
 * wanders tens of meters, so the radius is generous; walking on at 1 m/s
 * leaves it within half a minute, far short of the minimum stay.
 */
export function dwellsOf(fixes: TracePoint[]): Dwell[] {
  const out: Dwell[] = [];
  let i = 0;
  while (i < fixes.length) {
    const anchor: LngLat = [fixes[i].lon, fixes[i].lat];
    let j = i;
    let sx = 0;
    let sy = 0;
    while (j < fixes.length && distanceM(anchor, [fixes[j].lon, fixes[j].lat]) <= DWELL_RADIUS_M) {
      sx += fixes[j].lon;
      sy += fixes[j].lat;
      j++;
    }
    const n = j - i;
    if (n >= 2 && fixes[j - 1].t - fixes[i].t >= DWELL_MIN_MS) {
      out.push({ t0: fixes[i].t, t1: fixes[j - 1].t, at: [sx / n, sy / n] });
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

/**
 * The trace with each dwell's jitter replaced by its center, held from
 * arrival to departure: for drawing, replaying and measuring distance.
 * The stored trace is never changed.
 */
export function smoothDwells(fixes: TracePoint[]): TracePoint[] {
  const dwells = dwellsOf(fixes);
  if (dwells.length === 0) return fixes;
  const out: TracePoint[] = [];
  let d = 0;
  for (const p of fixes) {
    while (d < dwells.length && p.t > dwells[d].t1) d++;
    const w = dwells[d];
    if (w && p.t >= w.t0 && p.t <= w.t1) {
      if (p.t === w.t0 || p.t === w.t1) out.push({ ...p, lon: w.at[0], lat: w.at[1], speed: 0 });
      continue;
    }
    out.push(p);
  }
  return out;
}
