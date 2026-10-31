import type { LngLat } from '../types';
import type { BoundarySource, Region } from './types';

/**
 * The app's own format for country and state outlines. The app reads only
 * packs; a build script turns a dataset (today Natural Earth, see
 * scripts/build-boundaries.js) into one, so another dataset or a downloaded
 * region is just another pack. Rings are [lon, lat] arrays, outer ring first,
 * then holes.
 */
export interface BoundaryPack {
  /** The dataset and edition, e.g. "naturalearth-50m-admin1-v5.1.1/US". */
  id: string;
  countries: { name: string; code: string; at: LngLat }[];
  states: {
    name: string;
    code: string;
    /** The code of its country, in `countries`. */
    country: string;
    at: LngLat;
    bbox: [number, number, number, number];
    polygons: LngLat[][][];
  }[];
}

function inRing(p: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const inPolygon = (p: LngLat, rings: LngLat[][]) => inRing(p, rings[0]) && !rings.slice(1).some((hole) => inRing(p, hole));

/**
 * Outlines stop at a simplified coastline, so a pier, a beach or a small
 * island (City Island, Peaks Island) can sit outside every one: such a point
 * takes the state whose edge is within this.
 */
export const COAST_REACH_M = 3000;

/** Distance in meters from p to a ring's edge, on a local flat projection. */
function ringDistanceM(p: LngLat, ring: LngLat[]): number {
  const kx = 111_320 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110_540;
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const ax = (ring[i - 1][0] - p[0]) * kx;
    const ay = (ring[i - 1][1] - p[1]) * ky;
    const bx = (ring[i][0] - p[0]) * kx;
    const by = (ring[i][1] - p[1]) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** A BoundarySource over one or more packs; the first pack with an answer wins. */
export function boundarySource(packs: BoundaryPack[]): BoundarySource {
  const countries = new Map<string, Region>();
  for (const pack of packs) for (const c of pack.countries) countries.set(c.code, { name: c.name, code: c.code, at: c.at });
  const states = packs.flatMap((pack) => pack.states);
  return {
    id: packs.map((p) => p.id).join('+') || 'none',
    containing(p) {
      const hit = (s: BoundaryPack['states'][number]) => ({ country: countries.get(s.country), state: { name: s.name, code: s.code, at: s.at } });
      for (const s of states) {
        const [w, so, e, n] = s.bbox;
        if (p[0] < w || p[0] > e || p[1] < so || p[1] > n) continue;
        if (s.polygons.some((rings) => inPolygon(p, rings))) return hit(s);
      }
      // Not inside any: the nearest outline within COAST_REACH_M.
      const padLat = COAST_REACH_M / 110_540;
      const padLon = COAST_REACH_M / (111_320 * Math.cos((p[1] * Math.PI) / 180));
      let best: { s: BoundaryPack['states'][number]; d: number } | null = null;
      for (const s of states) {
        const [w, so, e, n] = s.bbox;
        if (p[0] < w - padLon || p[0] > e + padLon || p[1] < so - padLat || p[1] > n + padLat) continue;
        for (const rings of s.polygons) {
          const d = ringDistanceM(p, rings[0]);
          if (d <= COAST_REACH_M && (!best || d < best.d)) best = { s, d };
        }
      }
      return best ? hit(best.s) : null;
    },
  };
}
