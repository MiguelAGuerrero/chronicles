// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { PlacePoint } from './cells';
import { tilesAround } from './layer';
import { walkTileKey } from './match';
import type { WayFacts } from './types';

/*
 * What is measured of the ground around an area's middle (specs/place-form PF3, PF4, PF8, PF17), from the tiles already read plus the buildings. Pure.
 * Nothing here is shown: the measures only feed `placeForm`. Service ways, paths, steps and footways are not streets and count for nothing (UF2), so a
 * mapped sidewalk, or its absence, changes no measure (PF9).
 */

/** What was read around a centre: the tiles (by key), and everything in them. A null `places` or `buildings` means the read failed (PF17). */
export interface RingRead {
  at: LngLat;
  radiusM: number;
  /** The keys of the z14 tiles that were read. */
  tilesRead: readonly string[];
  ways: readonly WayFacts[];
  junctions: readonly LngLat[];
  places: readonly PlacePoint[] | null;
  buildings: readonly LngLat[] | null;
}

export interface Measures {
  /** Metres of local street and arterial inside the ring. */
  streetM: number;
  placesPerKm2: number;
  junctionsPerKm2: number;
  buildingsPerKm2: number;
  /** Motorway and trunk over all street length, 0 to 1. */
  highwayShare: number;
  /** The largest chain of places, each within 80 m of the next, as a share of the places, 0 to 1. */
  chainShare: number;
  /** The longest distance between two places of that chain, in metres. */
  chainSpanM: number;
}

/** Under this much street inside the ring there is too little to say: water, woods, open land (the walkability rule's UF7, kept). */
const MIN_STREET_M = 300;
/** Places this close are one chain. */
const CHAIN_M = 80;
const STREETS = new Set(['residential', 'living_street', 'tertiary', 'unclassified', 'primary', 'secondary', 'trunk', 'motorway']);
const HIGHWAY = new Set(['motorway', 'trunk']);

/** The measures of the ring, or null when it cannot be said: a tile unread, under 300 m of street, or places or buildings not read (PF8, PF17). */
export function measureRing(read: RingRead): Measures | null {
  const { at, radiusM } = read;
  if (read.places === null || read.buildings === null) return null;
  const have = new Set(read.tilesRead);
  if (!tilesAround(at, radiusM).every(([x, y]) => have.has(walkTileKey(x, y)))) return null;
  const inRing = (p: LngLat) => distanceM(p, at) <= radiusM;

  // Streets: each line's stretches counted where they lie; a way on a tile edge is two pieces of one way, counted once.
  let streetM = 0;
  let highwayM = 0;
  const seen = new Set<string>();
  for (const w of read.ways) {
    if (!STREETS.has(w.cls) || w.line.length < 2) continue;
    const a = w.line[0];
    const b = w.line[w.line.length - 1];
    const piece = `${w.id}|${a[0].toFixed(6)},${a[1].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)}|${w.line.length}`;
    if (seen.has(piece)) continue;
    seen.add(piece);
    for (let i = 1; i < w.line.length; i++) {
      const [p, q] = [w.line[i - 1], w.line[i]];
      if (!inRing([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])) continue;
      const len = distanceM(p, q);
      streetM += len;
      if (HIGHWAY.has(w.cls)) highwayM += len;
    }
  }
  if (streetM < MIN_STREET_M) return null;

  const areaKm2 = (Math.PI * radiusM * radiusM) / 1e6;
  const junctionSeen = new Set<string>();
  let junctions = 0;
  for (const j of read.junctions) {
    const k = `${j[0].toFixed(6)},${j[1].toFixed(6)}`;
    if (junctionSeen.has(k) || !inRing(j)) continue;
    junctionSeen.add(k);
    junctions++;
  }
  const places = read.places.filter((p) => inRing(p.at));
  const buildings = read.buildings.reduce((n, p) => n + (inRing(p) ? 1 : 0), 0);
  const chain = largestChain(places.map((p) => p.at));
  return {
    streetM,
    placesPerKm2: places.length / areaKm2,
    junctionsPerKm2: junctions / areaKm2,
    buildingsPerKm2: buildings / areaKm2,
    highwayShare: highwayM / streetM,
    chainShare: places.length ? chain.size / places.length : 0,
    chainSpanM: chain.spanM,
  };
}

/** The largest set of points each within CHAIN_M of another in the set (single linkage), through a grid so it stays near-linear. */
function largestChain(points: readonly LngLat[]): { size: number; spanM: number } {
  const n = points.length;
  if (!n) return { size: 0, spanM: 0 };
  const lat0 = points[0][1];
  const kx = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const xy = points.map((p) => [p[0] * kx, p[1] * 110_540] as const);
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const cells = new Map<string, number[]>();
  const cellOf = (i: number) => `${Math.floor(xy[i][0] / CHAIN_M)},${Math.floor(xy[i][1] / CHAIN_M)}`;
  for (let i = 0; i < n; i++) {
    const [cx, cy] = [Math.floor(xy[i][0] / CHAIN_M), Math.floor(xy[i][1] / CHAIN_M)];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const j of cells.get(`${cx + dx},${cy + dy}`) ?? []) if (Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]) <= CHAIN_M) parent[find(i)] = find(j);
    const list = cells.get(cellOf(i));
    if (list) list.push(i);
    else cells.set(cellOf(i), [i]);
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  }
  let best: number[] = [];
  for (const g of groups.values()) if (g.length > best.length) best = g;
  let span = 0;
  for (let a = 0; a < best.length; a++) for (let b = a + 1; b < best.length; b++) span = Math.max(span, Math.hypot(xy[best[a]][0] - xy[best[b]][0], xy[best[a]][1] - xy[best[b]][1]));
  return { size: best.length, spanM: span };
}
