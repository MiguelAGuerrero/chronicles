// @layer core
import { distanceToLinesM } from '../geo';
import { STREET_REACH_M } from '../resurface/context';
import type { LngLat } from '../types';
import { inPolygons } from './geom';
import type { Complex } from './types';

const area = (c: Complex) => (c.bbox[2] - c.bbox[0]) * (c.bbox[3] - c.bbox[1]);

/** CX11: the complex whose outline holds a fix, or lies within the street reach (40 m) of it, else null. Overlaps: inside beats near, then the smaller outline, then the id. */
export function complexAt(fix: LngLat, complexes: readonly Complex[]): { complex: Complex; near: boolean } | null {
  const dLat = STREET_REACH_M / 111_320;
  const dLon = dLat / Math.max(0.2, Math.cos((fix[1] * Math.PI) / 180));
  const found: { complex: Complex; near: boolean }[] = [];
  for (const c of complexes) {
    if (fix[0] < c.bbox[0] - dLon || fix[0] > c.bbox[2] + dLon || fix[1] < c.bbox[1] - dLat || fix[1] > c.bbox[3] + dLat) continue;
    if (inPolygons(fix, c.polygons)) found.push({ complex: c, near: false });
    else if (distanceToLinesM(fix, c.polygons.flatMap((rings) => rings.map((r) => [...r]))) <= STREET_REACH_M) found.push({ complex: c, near: true });
  }
  found.sort((a, b) => Number(a.near) - Number(b.near) || area(a.complex) - area(b.complex) || (a.complex.id < b.complex.id ? -1 : 1));
  return found[0] ?? null;
}
