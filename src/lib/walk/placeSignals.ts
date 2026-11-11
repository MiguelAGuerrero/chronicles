// @layer core
import type { ActivityPoint } from '../activity/points';
import { distanceM } from '../geo';
import { analyzeArea } from '../landing/analyze';
import { GRADE_RULES } from '../landing/grade';
import type { LngLat, StreetSegment } from '../types';
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
  /** Metres of busy street (the landing analysis's strips: a named street with a run of places along it) whose busiest point lies inside the ring (PF25). */
  busyStreetM: number;
  /** The share, by weight, of the ring's places standing within `GRADE_RULES.frontageM` of a named street: a storefront on its street, 0 to 1 (PF26). */
  frontageShare: number;
}

/** The busy-street analysis reads the ground this far around the ring's centre, so a shifted ring (PF27) sees the same kind of context and the fixtures can hold it. */
export const CONTEXT_M = 950;
/** A ring is also read from this far north, east, south and west of its centre (PF27). */
export const SHIFT_M = 150;

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
  const context = streetContext(read);
  return {
    streetM,
    placesPerKm2: places.length / areaKm2,
    junctionsPerKm2: junctions / areaKm2,
    buildingsPerKm2: buildings / areaKm2,
    highwayShare: highwayM / streetM,
    chainShare: places.length ? chain.size / places.length : 0,
    chainSpanM: chain.spanM,
    busyStreetM: context.busyStreetM,
    frontageShare: context.frontageShare,
  };
}

/** The ring read from its centre and from SHIFT_M north, east, south and west: the centre first (PF27). */
export function measureRings(read: RingRead): (Measures | null)[] {
  const kx = 111_320 * Math.cos((read.at[1] * Math.PI) / 180);
  const shifts: [number, number][] = [[0, 0], [0, SHIFT_M], [SHIFT_M, 0], [0, -SHIFT_M], [-SHIFT_M, 0]];
  return shifts.map(([dx, dy]) => measureRing({ ...read, at: [read.at[0] + dx / kx, read.at[1] + dy / 110_540] }));
}

/**
 * The busy streets and the frontage of the places in the ring (PF25, PF26), from the named streets and the places read, around the centre to CONTEXT_M.
 * The busy streets are the app's own (`landing/analyze.ts`: a named street at medium grade or above, graded against the read's own high point), so a "main
 * street" here is the one the Explore tab draws. A way without a name is no street here: it cannot carry a run of places.
 */
function streetContext(read: RingRead): { busyStreetM: number; frontageShare: number } {
  const { at, radiusM } = read;
  const named = read.ways.filter((w) => STREETS.has(w.cls) && w.name && w.line.length >= 2 && distanceM(w.line[Math.floor(w.line.length / 2)], at) <= CONTEXT_M);
  const segments: StreetSegment[] = named.map((w) => {
    let length = 0;
    for (let i = 1; i < w.line.length; i++) length += distanceM(w.line[i - 1], w.line[i]);
    return { id: w.id, name: w.name!, kind_detail: w.cls, length_m: length, geometry: [w.line.map((p) => [p[0], p[1]] as LngLat)], build: '' };
  });
  const points: ActivityPoint[] = (read.places ?? []).filter((p) => distanceM(p.at, at) <= CONTEXT_M).map((p) => ({ at: p.at, weight: p.weight, name: null, source: 'overture' as const }));
  const strips = analyzeArea({ centre: at, points, segments, towns: [], transit: [] }).strips.filter((s) => distanceM(s.peak, at) <= radiusM);
  const busyStreetM = strips.reduce((sum, s) => sum + s.lengthM, 0);

  // Frontage: each place against the named street pieces near it, through a grid of 100 m cells in a local plane.
  const kx = 111_320 * Math.cos((at[1] * Math.PI) / 180);
  const xy = (p: LngLat): [number, number] => [(p[0] - at[0]) * kx, (p[1] - at[1]) * 110_540];
  const CELL = 100;
  const grid = new Map<string, [[number, number], [number, number]][]>();
  for (const seg of segments)
    for (const line of seg.geometry)
      for (let i = 1; i < line.length; i++) {
        const [a, b] = [xy(line[i - 1]), xy(line[i])];
        const [x0, x1] = [Math.floor(Math.min(a[0], b[0]) / CELL) - 1, Math.floor(Math.max(a[0], b[0]) / CELL) + 1];
        const [y0, y1] = [Math.floor(Math.min(a[1], b[1]) / CELL) - 1, Math.floor(Math.max(a[1], b[1]) / CELL) + 1];
        for (let cx = x0; cx <= x1; cx++)
          for (let cy = y0; cy <= y1; cy++) {
            const key = `${cx},${cy}`;
            const list = grid.get(key);
            if (list) list.push([a, b]);
            else grid.set(key, [[a, b]]);
          }
      }
  let total = 0;
  let fronting = 0;
  for (const p of read.places ?? []) {
    if (distanceM(p.at, at) > radiusM) continue;
    total += p.weight;
    const q = xy(p.at);
    let near = false;
    for (const [a, b] of grid.get(`${Math.floor(q[0] / CELL)},${Math.floor(q[1] / CELL)}`) ?? []) {
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len2)) : 0;
      if (Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy)) <= GRADE_RULES.frontageM) {
        near = true;
        break;
      }
    }
    if (near) fronting += p.weight;
  }
  return { busyStreetM, frontageShare: total ? fronting / total : 0 };
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
