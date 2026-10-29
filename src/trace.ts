import type { TracePoint } from '../modules/walk-recorder';

/** Fixes worse than this are ignored when measuring; they stay in the raw trace. */
export const MAX_ACCURACY_M = 50;

/** Gaps longer than this are not bridged when measuring distance. */
export const MAX_GAP_MS = 60_000;

export function isUsable(p: TracePoint): boolean {
  return p.acc >= 0 && p.acc <= MAX_ACCURACY_M;
}

/** Great-circle distance in meters. */
export function haversine(a: TracePoint, b: TracePoint): number {
  const R = 6_371_008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance walked in meters, using only usable fixes and skipping long gaps. */
export function distance(points: TracePoint[]): number {
  let total = 0;
  let prev: TracePoint | null = null;
  for (const p of points) {
    if (!isUsable(p)) continue;
    if (prev && p.t - prev.t <= MAX_GAP_MS) total += haversine(prev, p);
    prev = p;
  }
  return total;
}
