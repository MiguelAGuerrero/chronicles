// @layer core
import type { LngLat } from '../types';

/*
 * Plane geometry for outlines and neighborhood shapes (TO1, HB1): rings in [lon, lat], flat projection
 * around a ring's first point. Shared by `outlines.ts` and `hoods.ts` so neither imports the other.
 */

export type Bbox = [number, number, number, number];

/** Square metres inside a ring, on a flat projection around its first point. */
export function ringAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const kx = 111_320 * Math.cos((ring[0][1] * Math.PI) / 180);
  const ky = 110_540;
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
  return Math.abs(s) / 2;
}

export function inRing(p: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether a point is inside any polygon (its outer ring, outside its holes). */
export const inPolygons = (p: LngLat, polygons: LngLat[][][]): boolean => polygons.some((rings) => inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h)));

export function bboxOf(polygons: LngLat[][][]): Bbox {
  const b: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const rings of polygons) for (const [x, y] of rings[0] ?? []) {
    b[0] = Math.min(b[0], x);
    b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x);
    b[3] = Math.max(b[3], y);
  }
  return b;
}

/** Square metres of the polygons: outer rings less their holes. */
export const polygonsAreaM2 = (polygons: LngLat[][][]): number =>
  polygons.reduce((n, rings) => n + ringAreaM2(rings[0] ?? []) - rings.slice(1).reduce((s, h) => s + ringAreaM2(h), 0), 0);

/**
 * A point inside the polygons (HB1): the centroid of the biggest piece when it is inside, else the inside
 * point of a grid over that piece nearest to it. A concave shape's centroid can lie outside it.
 */
export function representative(polygons: LngLat[][][]): LngLat {
  let best = polygons[0];
  let bestArea = -1;
  for (const rings of polygons) {
    const a = ringAreaM2(rings[0] ?? []);
    if (a > bestArea) [best, bestArea] = [rings, a];
  }
  const ring = best[0];
  let cx = 0;
  let cy = 0;
  let a2 = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a2 += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  const centroid: LngLat = a2 === 0 ? ring[0] : [cx / (3 * a2), cy / (3 * a2)];
  if (inPolygons(centroid, [best])) return centroid;
  const [w, s, e, n] = bboxOf([best]);
  let found: LngLat | null = null;
  let foundD = Infinity;
  const N = 40;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const p: LngLat = [w + ((e - w) * i) / N, s + ((n - s) * j) / N];
      if (!inPolygons(p, [best])) continue;
      const d = (p[0] - centroid[0]) ** 2 + (p[1] - centroid[1]) ** 2;
      if (d < foundD) [found, foundD] = [p, d];
    }
  }
  return found ?? ring[0];
}
