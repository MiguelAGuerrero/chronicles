// @layer core
import type { LngLat } from '../types';

/** Point in a ring (ray casting). */
function inRing(p: LngLat, ring: readonly LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point in a MultiPolygon: inside an outer ring and in none of that polygon's holes. */
export function inPolygons(p: LngLat, polygons: readonly (readonly (readonly LngLat[])[])[]): boolean {
  return polygons.some((rings) => rings.length > 0 && inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h)));
}

/** [west, south, east, north] of every vertex of a MultiPolygon. */
export function bboxOf(polygons: readonly (readonly (readonly LngLat[])[])[]): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const rings of polygons) for (const ring of rings) for (const [lo, la] of ring) {
    if (lo < w) w = lo;
    if (lo > e) e = lo;
    if (la < s) s = la;
    if (la > n) n = la;
  }
  return [w, s, e, n];
}

/** A point inside the outline, for Walk to and the nearest-first order: the centroid of the largest polygon, else the middle of a chord across it. */
export function pointInside(polygons: readonly (readonly (readonly LngLat[])[])[]): LngLat {
  let best: (readonly (readonly LngLat[])[]) | null = null;
  let bestArea = -1;
  for (const rings of polygons) {
    const [w, s, e, n] = bboxOf([rings]);
    const a = (e - w) * (n - s);
    if (a > bestArea) { best = rings; bestArea = a; }
  }
  if (!best || !best[0]?.length) return [0, 0];
  const ring = best[0];
  let a2 = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a2 += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (a2 !== 0) {
    const c: LngLat = [cx / (3 * a2), cy / (3 * a2)];
    if (inPolygons(c, [best])) return c;
  }
  // The centroid fell outside (an L or a U): the middle of the first chord across the polygon at its latitude.
  const lat = a2 !== 0 ? cy / (3 * a2) : ring[0][1];
  const xs: number[] = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat) xs.push(((xj - xi) * (lat - yi)) / (yj - yi) + xi);
  }
  xs.sort((p, q) => p - q);
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, lat] : ring[0];
}
