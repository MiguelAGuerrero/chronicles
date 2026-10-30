import type { StreetSegment } from '../types';

export type Bbox = [number, number, number, number];

export function segmentBbox(s: StreetSegment): Bbox {
  let w = Infinity, so = Infinity, e = -Infinity, n = -Infinity;
  for (const line of s.geometry)
    for (const [x, y] of line) {
      w = Math.min(w, x); e = Math.max(e, x);
      so = Math.min(so, y); n = Math.max(n, y);
    }
  return [w, so, e, n];
}

export const intersects = (a: Bbox, b: Bbox) =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
