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

/** The shortest distance from a point to any of these lines, in meters. */
export function distanceToLinesM(p: LngLat, lines: LngLat[][]): number {
  const proj = projector(p);
  let best = Infinity;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) best = Math.min(best, pointSegmentDist([0, 0], proj(line[i - 1]), proj(line[i])));
    if (line.length === 1) best = Math.min(best, distanceM(p, line[0]));
  }
  return best;
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
/** Fixes are averaged over this long before looking for a stay, which damps indoor jitter. */
const DWELL_BIN_MS = 30_000;
/** A stay survives this many averaged positions outside its radius in a row (a GPS jump). */
const DWELL_MISSES = 2;
/** Standing still reports a speed near 0 even while the position wanders; circling a fountain does not. */
const DWELL_MAX_SPEED = 0.3;

export interface Dwell {
  t0: number;
  t1: number;
  at: LngLat;
}

interface Bin {
  t0: number;
  t1: number;
  lon: number;
  lat: number;
  n: number;
  speeds: number[];
}

const binAt = (b: Bin): LngLat => [b.lon / b.n, b.lat / b.n];

function centroid(bins: Bin[]): LngLat {
  let lon = 0;
  let lat = 0;
  let n = 0;
  for (const b of bins) {
    lon += b.lon;
    lat += b.lat;
    n += b.n;
  }
  return [lon / n, lat / n];
}

/**
 * A stay rather than slow walking: where the reported speed is known, it
 * stays near 0; and the first and last thirds of the stay sit in the same
 * place, so a slow stroll that drifts across the radius is not a stay.
 */
function isStill(bins: Bin[]): boolean {
  const speeds = bins.flatMap((b) => b.speeds).sort((a, b) => a - b);
  if (speeds.length >= bins.reduce((n, b) => n + b.n, 0) / 2 && speeds[speeds.length >> 1] > DWELL_MAX_SPEED) return false;
  const third = Math.max(1, Math.floor(bins.length / 3));
  return distanceM(centroid(bins.slice(0, third)), centroid(bins.slice(-third))) <= DWELL_RADIUS_M * 0.6;
}

/**
 * Stretches where the walker stood still for at least DWELL_MIN_MS. Fixes
 * are averaged into 30 s bins; a stay grows while each bin falls within
 * DWELL_RADIUS_M of the stay's running center, riding out a couple of GPS
 * jumps, and neighboring stays at the same spot are merged, so one café stop
 * is one stay however much the fixes wander.
 */
export function dwellsOf(fixes: TracePoint[]): Dwell[] {
  const bins: Bin[] = [];
  for (const f of fixes) {
    let b = bins[bins.length - 1];
    if (!b || f.t - b.t0 >= DWELL_BIN_MS) {
      b = { t0: f.t, t1: f.t, lon: 0, lat: 0, n: 0, speeds: [] };
      bins.push(b);
    }
    b.t1 = f.t;
    b.lon += f.lon;
    b.lat += f.lat;
    b.n++;
    if (f.speed != null && f.speed >= 0) b.speeds.push(f.speed);
  }
  const found: (Dwell & { bins: Bin[] })[] = [];
  let i = 0;
  while (i < bins.length) {
    const members = [bins[i]];
    let center = binAt(bins[i]);
    let misses = 0;
    let last = i;
    for (let j = i + 1; j < bins.length && misses <= DWELL_MISSES; j++) {
      if (distanceM(center, binAt(bins[j])) <= DWELL_RADIUS_M) {
        members.push(bins[j]);
        center = centroid(members);
        misses = 0;
        last = j;
      } else {
        misses++;
      }
    }
    if (bins[last].t1 - bins[i].t0 >= DWELL_MIN_MS && members.length >= 2 && isStill(members)) {
      // A jump inside the stay belongs to it: the walker never left.
      const all = bins.slice(i, last + 1);
      const prev = found[found.length - 1];
      if (prev && all[0].t0 - prev.t1 <= 4 * DWELL_BIN_MS && distanceM(prev.at, center) <= DWELL_RADIUS_M) {
        prev.bins.push(...members);
        prev.t1 = bins[last].t1;
        prev.at = centroid(prev.bins);
      } else {
        found.push({ t0: bins[i].t0, t1: bins[last].t1, at: center, bins: members });
      }
      i = last + 1;
    } else {
      i++;
    }
  }
  return found.map(({ t0, t1, at }) => ({ t0, t1, at }));
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
