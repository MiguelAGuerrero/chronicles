/// <reference types="node" />
import { createRequire } from 'node:module';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { hoodAt } from '../../areas/hoods';
import { outlineSet, outlineTileKey, outlineTileOf, townAt, withOutlines, type OutlineSet, type OutlineTile } from '../../areas/outlines';
import { AREA_REACH_M } from '../../areas/rules';
import type { BoundarySource, PlaceCandidate } from '../../areas/types';
import type { TileFeature } from '../../areas/tilePlaces';
import { distanceM, stepToward } from '../../geo';
import type { LngLat, TracePoint } from '../../types';

// Real Baltimore neighborhood shapes (Overture release 2026-10-21.0, cut by scripts/fixture-outlines.mjs)
// and small squares for the rules; shared by the neighborhood-boundaries tests (HB1-HB16).

const require = createRequire(import.meta.url);
export const baltimore = require('./baltimoreHoods.json') as {
  release: string;
  tiles: { x: number; y: number; division_area: TileFeature[]; division: TileFeature[] }[];
};

export const baltimoreTiles = (): OutlineTile[] =>
  baltimore.tiles.map((t) => outlineTileFrom(t.x, t.y, baltimore.release, 1, { division_area: t.division_area, division: t.division }));
export const baltimoreSet = (): OutlineSet => outlineSet(baltimoreTiles());

/** Overture's own point for a neighborhood or macrohood in the fixture: inside its shape, as a map tile's place point would be. */
export function overturePoint(name: string): LngLat {
  for (const t of baltimore.tiles) {
    for (const d of t.division) if (d.properties?.['@name'] === name && d.geometry.type === 'Point') return d.geometry.coordinates as LngLat;
  }
  throw new Error(`no point for ${name}`);
}

export const BALTIMORE = overturePoint.bind(null, 'Mount Vernon');
export const baltimoreTown = (): PlaceCandidate => {
  for (const t of baltimore.tiles) {
    for (const d of t.division) if (d.properties?.['@name'] === 'Baltimore' && d.properties?.subtype === 'locality') return { level: 'town', name: 'Baltimore', at: d.geometry.coordinates as LngLat, reachM: AREA_REACH_M.city, kind: 'city' };
  }
  throw new Error('no Baltimore');
};

export const hoodPoint = (name: string, at?: LngLat): PlaceCandidate => ({ level: 'neighborhood', name, at: at ?? overturePoint(name), reachM: AREA_REACH_M.neighborhood });
export const townPoint = (name: string, at: LngLat, reachM: number = AREA_REACH_M.town, kind?: string): PlaceCandidate => ({ level: 'town', name, at, reachM, kind });

/** The tile place points a map would hold for the fixture's real neighborhoods (not the associations'). */
export const baltimorePoints = (): PlaceCandidate[] =>
  ['Mount Vernon', 'Seton Hill', 'Downtown West', 'Federal Hill', 'Little Italy', 'Otterbein', 'Barre Circle', 'Inner Harbor', 'Upton', 'Poppleton'].map((n) => hoodPoint(n));

export const testBoundaries: BoundarySource = {
  id: 'test-boundaries',
  containing: () => ({ country: { name: 'United States', code: 'US', at: [-98, 39] }, state: { name: 'Maryland', code: 'US-MD', at: [-76.7, 39] } }),
};

/** The neighborhood a point is in under a candidate list and a set, as a walk or Explore asks it. */
export function hoodNameAt(p: LngLat, candidates: PlaceCandidate[], set: OutlineSet | null): string | null {
  const cands = withOutlines(candidates, set);
  return hoodAt(p, cands, townAt(p, cands, set), set)?.name ?? null;
}

// ---- small squares: x, y in units of 100 m east and north of O

export const O: LngLat = [-75.0, 40.6];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
export const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
export const square = (x0: number, y0: number, x1: number, y1: number): LngLat[][][] => [[[at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]]];
export const squareWithHole = (x0: number, y0: number, x1: number, y1: number, h: [number, number, number, number]): LngLat[][][] => [[square(x0, y0, x1, y1)[0][0], square(...h)[0][0]]];

/** A tile around O holding square towns and neighborhood shapes. */
export function squaresTile(o: {
  towns?: { id: string; name: string; polygons: LngLat[][][] }[];
  hoods?: { id: string; name: string; subtype?: 'neighborhood' | 'macrohood'; polygons: LngLat[][][] }[];
}): OutlineTile {
  const [x, y] = outlineTileOf(O);
  return {
    key: outlineTileKey(x, y), z: 12, x, y, release: 'test', read_at: 1,
    pieces: (o.towns ?? []).map(({ id, name, polygons }) => ({ id, name, polygons })),
    points: [],
    hoods: (o.hoods ?? []).map(({ id, name, subtype, polygons }) => ({ id, name, polygons, subtype: subtype ?? 'neighborhood' })),
  };
}
/** One big town square around O (so a hood is inside a town outline), with these hoods. */
export const townWith = (hoods: Parameters<typeof squaresTile>[0]['hoods']): OutlineSet =>
  outlineSet([squaresTile({ towns: [{ id: 'town', name: 'Squareton', polygons: square(-60, -60, 60, 60) }], hoods })]);

/** A straight walk, a fix every 7 m. */
export function walk(path: LngLat[], t0 = 0): TracePoint[] {
  const pts: TracePoint[] = [{ walk_id: 'w', t: t0, lon: path[0][0], lat: path[0][1], accuracy_m: 8, speed: 1.4, course: null }];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 7);
      t += 5000;
      pts.push({ walk_id: 'w', t, lon: pos[0], lat: pos[1], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}
