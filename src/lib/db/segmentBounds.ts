import type { StreetSegment } from '../types';
import { tileAt, tilesIn } from '../tileMath';

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

/** The z14 tile a piece is filed under: its box's centre. Pieces are at most 200 m. */
export function segmentTile(s: StreetSegment): string {
  const [w, so, e, n] = segmentBbox(s);
  const t = tileAt([(w + e) / 2, (so + n) / 2]);
  return `${t.x},${t.y}`;
}

/** The tiles to ask for to find every piece touching a box: its own, widened by a piece's reach. */
export function tileKeysFor([w, s, e, n]: Bbox): string[] {
  const pad = 250;
  const lat = (s + n) / 2;
  const dLat = pad / 111320;
  const dLon = pad / (111320 * Math.cos((lat * Math.PI) / 180));
  return tilesIn([w - dLon, s - dLat, e + dLon, n + dLat]).map(([x, y]) => `${x},${y}`);
}
