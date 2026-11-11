// @layer core
import type { RoadFeature } from '../streets';
import type { LngLat } from '../types';
import type { Place } from './types';

/*
 * The park outlines of the tiles' `landcover` layer (SR15, community-parks PC11): a stage of the kind pipeline and of
 * scenic routes, apart from both. Pure: the read that decodes the tiles is a shell's.
 */

/** A park, garden or wood: its rings (the first the outside), and a name when a park point lies inside. */
export interface GreenArea {
  rings: LngLat[][];
  kind: 'park' | 'wood';
  name: string | null;
}

/** OpenMapTiles' landcover classes that count as green (SR15): parks and gardens, and woods. */
function greenKind(props: Record<string, unknown> | null): GreenArea['kind'] | null {
  const cls = String(props?.class ?? '');
  const sub = String(props?.subclass ?? '');
  if (cls === 'wood') return 'wood';
  if (cls === 'grass' && (sub === 'park' || sub === 'garden')) return 'park';
  return null;
}

export const inRings = (p: LngLat, rings: LngLat[][]): boolean => {
  // Even-odd over every ring, so a hole is outside.
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
};

/** SR15: the green areas of the tiles' landcover, each named by a park point inside it. */
export function greenFromTiles(landcover: RoadFeature[], parks: Pick<Place, 'name' | 'at'>[]): GreenArea[] {
  const out: GreenArea[] = [];
  for (const f of landcover) {
    const kind = greenKind(f.properties);
    if (!kind) continue;
    const polys =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates as LngLat[][]] : f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as LngLat[][][]) : [];
    for (const rings of polys) {
      if (!rings.length || rings[0].length < 4) continue;
      const name = parks.find((p) => inRings(p.at, rings))?.name ?? null;
      out.push({ rings, kind, name });
    }
  }
  return out;
}

/** PC11: the outlines of parks and gardens in a read's `landcover`, for the kind pipeline; none without a `landcover`. */
export const outlinesOf = (landcover: RoadFeature[] | undefined): GreenArea[] => greenFromTiles(landcover ?? [], []).filter((a) => a.kind === 'park');
