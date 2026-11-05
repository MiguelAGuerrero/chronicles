// @layer core
import { distanceM } from '../geo';
import { tileAt, tileRect } from '../tileMath';
import type { LngLat } from '../types';
import { isCrossing } from './bands';
import { FORM, judge, type CellBand, type Signals } from './form';
import { walkTileKey } from './match';
import type { WayFacts } from './types';

/*
 * The ground cut into cells and each judged from its neighbourhood (specs/walkability-urban-form UF1-UF3, UF18). A cell is
 * a square of about FORM.cellM on a fixed grid, so the same cell is the same cell whichever tiles were read; it is judged
 * only if its whole neighbourhood lies inside tiles that were read (a cell near the edge of what was read is left out, never
 * guessed). Measured through a spatial index, O(n log n) in the ways. Pure; cells are derived on read and never stored (UF8).
 */

export interface PlacePoint {
  at: LngLat;
  /** What the place counts for (specs/activity-density AD1). */
  weight: number;
}

export interface Cell {
  /** Its place on the fixed grid. */
  i: number;
  j: number;
  west: number;
  south: number;
  east: number;
  north: number;
  band: CellBand;
}

const D_LAT = FORM.cellM / 110_540;
const rowLon = (j: number) => FORM.cellM / (111_320 * Math.cos(((j + 0.5) * D_LAT * Math.PI) / 180));

/** The cell a point lies in. */
export function cellIndexOf([lon, lat]: LngLat): { i: number; j: number } {
  const j = Math.floor(lat / D_LAT);
  return { i: Math.floor(lon / rowLon(j)), j };
}

export function cellBounds(i: number, j: number): { west: number; south: number; east: number; north: number } {
  const dl = rowLon(j);
  return { west: i * dl, south: j * D_LAT, east: (i + 1) * dl, north: (j + 1) * D_LAT };
}

const LOCAL = new Set(['residential', 'living_street', 'tertiary', 'unclassified']);
const ARTERIAL = new Set(['primary', 'secondary', 'trunk', 'motorway']);
/** What an item is: metres of local street, of arterial, of mapped sidewalk, a crossing, a junction, a place's weight. */
const enum K { Local, Arterial, Sidewalk, Crossing, Junction, Place }
interface Item {
  at: LngLat;
  k: K;
  v: number;
}

/** A way in pieces of at most 100 m, each with its middle and length (a long road is counted where it runs). */
function pieces(line: readonly LngLat[]): { at: LngLat; len: number }[] {
  const out: { at: LngLat; len: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const L = distanceM(a, b);
    if (L <= 0) continue;
    const n = Math.max(1, Math.ceil(L / 100));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      out.push({ at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], len: L / n });
    }
  }
  return out;
}

const mid = (line: readonly LngLat[]): LngLat => line[Math.floor(line.length / 2)];

export interface FormIndex {
  /** The signals of a point's neighbourhood. */
  measureAt(c: LngLat): Signals;
}

/**
 * UF2, UF3: the index of every street, crossing, sidewalk, junction and place of the tiles. A way on a tile edge appears in
 * two tiles: the same piece once. Service ways, paths, steps and anything else count for nothing.
 */
export function buildIndex(
  tiles: ReadonlyMap<string, readonly WayFacts[]>,
  junctions: ReadonlyMap<string, readonly LngLat[]>,
  places?: readonly PlacePoint[] | null,
): FormIndex {
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const ways of tiles.values())
    for (const w of ways) {
      if (w.line.length < 2) continue;
      const a = w.line[0];
      const b = w.line[w.line.length - 1];
      const piece = `${w.id}|${a[0].toFixed(6)},${a[1].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)}|${w.line.length}`;
      if (seen.has(piece)) continue;
      seen.add(piece);
      if (isCrossing(w)) items.push({ at: mid(w.line), k: K.Crossing, v: 1 });
      else if (w.cls === 'footway' && w.sub === 'sidewalk') for (const p of pieces(w.line)) items.push({ at: p.at, k: K.Sidewalk, v: p.len });
      else if (LOCAL.has(w.cls)) for (const p of pieces(w.line)) items.push({ at: p.at, k: K.Local, v: p.len });
      else if (ARTERIAL.has(w.cls)) for (const p of pieces(w.line)) items.push({ at: p.at, k: K.Arterial, v: p.len });
    }
  const jseen = new Set<string>();
  for (const list of junctions.values())
    for (const j of list) {
      const k = `${j[0].toFixed(6)},${j[1].toFixed(6)}`;
      if (jseen.has(k)) continue;
      jseen.add(k);
      items.push({ at: j, k: K.Junction, v: 1 });
    }
  for (const p of places ?? []) items.push({ at: p.at, k: K.Place, v: p.weight });
  const lat0 = items.length ? items[0].at[1] : 0;
  const dLatB = FORM.radiusM / 110_540;
  const dLonB = FORM.radiusM / (111_320 * Math.cos((lat0 * Math.PI) / 180));
  const buckets = new Map<string, Item[]>();
  for (const it of items) {
    const key = `${Math.floor(it.at[0] / dLonB)},${Math.floor(it.at[1] / dLatB)}`;
    const list = buckets.get(key);
    if (list) list.push(it);
    else buckets.set(key, [it]);
  }
  const area = (Math.PI * FORM.radiusM * FORM.radiusM) / 1e6;
  const havePlaces = places != null && places.length > 0;
  return {
    measureAt(c) {
      const sum = [0, 0, 0, 0, 0, 0];
      const bx = Math.floor(c[0] / dLonB);
      const by = Math.floor(c[1] / dLatB);
      for (let x = bx - 1; x <= bx + 1; x++)
        for (let y = by - 1; y <= by + 1; y++)
          for (const it of buckets.get(`${x},${y}`) ?? []) if (distanceM(it.at, c) <= FORM.radiusM) sum[it.k] += it.v;
      const street = sum[K.Local] + sum[K.Arterial];
      return {
        streetM: street,
        junctionsPerKm2: sum[K.Junction] / area,
        arterialShare: street > 0 ? sum[K.Arterial] / street : 0,
        crosswalksPerKm2: sum[K.Crossing] / area,
        sidewalkRatio: sum[K.Sidewalk] / Math.max(sum[K.Local], 1),
        placesPerKm2: havePlaces ? sum[K.Place] / area : null,
      };
    },
  };
}

/**
 * UF1: every cell whose neighbourhood lies wholly inside the tiles read, judged. A tile read with no ways in it counts as read.
 */
export function cellsFor(
  tiles: ReadonlyMap<string, readonly WayFacts[]>,
  junctions: ReadonlyMap<string, readonly LngLat[]>,
  places?: readonly PlacePoint[] | null,
): Cell[] {
  if (!tiles.size) return [];
  const index = buildIndex(tiles, junctions, places);
  const has = (p: LngLat) => {
    const t = tileAt(p);
    return tiles.has(walkTileKey(t.x, t.y));
  };
  let [minLon, minLat, maxLon, maxLat] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const key of tiles.keys()) {
    const [x, y] = key.split('/').map(Number);
    const r = tileRect(x, y);
    minLon = Math.min(minLon, r.w);
    maxLon = Math.max(maxLon, r.e);
    minLat = Math.min(minLat, r.s);
    maxLat = Math.max(maxLat, r.n);
  }
  const out: Cell[] = [];
  for (let j = Math.floor(minLat / D_LAT); j <= Math.floor(maxLat / D_LAT); j++) {
    const dl = rowLon(j);
    for (let i = Math.floor(minLon / dl); i <= Math.floor(maxLon / dl); i++) {
      const b = cellBounds(i, j);
      const c: LngLat = [(b.west + b.east) / 2, (b.south + b.north) / 2];
      const dLon = FORM.radiusM / (111_320 * Math.cos((c[1] * Math.PI) / 180));
      const dLat = FORM.radiusM / 110_540;
      const ring: LngLat[] = [c, [c[0] + dLon, c[1]], [c[0] - dLon, c[1]], [c[0], c[1] + dLat], [c[0], c[1] - dLat], [c[0] + dLon * 0.71, c[1] + dLat * 0.71], [c[0] - dLon * 0.71, c[1] + dLat * 0.71], [c[0] + dLon * 0.71, c[1] - dLat * 0.71], [c[0] - dLon * 0.71, c[1] - dLat * 0.71]];
      if (!ring.every(has)) continue;
      out.push({ i, j, ...b, band: judge(index.measureAt(c)) });
    }
  }
  return out;
}

/** The band of the cell a point lies in, or null where no cell was judged there. */
export function bandAt(cells: readonly Cell[], p: LngLat): CellBand | null {
  const { i, j } = cellIndexOf(p);
  return cells.find((c) => c.i === i && c.j === j)?.band ?? null;
}
