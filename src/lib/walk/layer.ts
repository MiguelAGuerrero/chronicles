// @layer core
import { distanceM, lineLengthM } from '../geo';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { WALK_CODE, isBeside, isCrossing } from './bands';
import { bandsFor, midOf } from './match';
import { MAX_TILES } from './limits';
import { areaWords, bandLengths } from './summary';
import type { Band, WayFacts } from './types';

/*
 * What the walkability layer draws and what a route sees (WK13, WK15). A tile's own road ways stand as
 * the street segments, so the layer works wherever tiles were read, walked or not; footways and
 * crossings are only the evidence beside them. Bands are derived on every call (WK9), never kept.
 */

export interface WalkDraw {
  /** Lines to draw in the warm hue (WK13). */
  car: LngLat[][];
  /** Lines to draw faintly. */
  mixed: LngLat[][];
  /** Changes only when the picture does, so a map sends data again only then. */
  key: string;
}

export interface RouteSeg {
  id: string;
  name: string | null;
  length_m: number;
  geometry: LngLat[][];
}

const isStreet = (w: WayFacts) => !isBeside(w) && !isCrossing(w) && w.cls !== 'steps';

function segmentsOf(tiles: ReadonlyMap<string, readonly WayFacts[]>): RouteSeg[] {
  const out: RouteSeg[] = [];
  const seen = new Set<string>();
  for (const ways of tiles.values())
    for (const w of ways) {
      if (!isStreet(w) || w.line.length < 2) continue;
      // A way on a tile edge is in both tiles' buffers: the same piece once, but each tile's own clipped piece of it
      // is drawn and judged (walkability audit 1), so the key is the piece, not the id.
      const a = w.line[0];
      const b = w.line[w.line.length - 1];
      const piece = `${w.id}|${a[0].toFixed(6)},${a[1].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)}|${w.line.length}`;
      if (seen.has(piece)) continue;
      seen.add(piece);
      out.push({ id: piece, name: w.name ?? null, length_m: lineLengthM(w.line), geometry: [w.line] });
    }
  return out;
}

/** WK13: the stretches to draw, `car` and `mixed` only. */
export function drawFor(tiles: ReadonlyMap<string, readonly WayFacts[]>): WalkDraw {
  const segs = segmentsOf(tiles);
  const bands = bandsFor(segs, tiles);
  const car: LngLat[][] = [];
  const mixed: LngLat[][] = [];
  let points = 0;
  let sum = 0;
  for (const s of segs) {
    const b = bands.get(s.id);
    if (b !== 'car' && b !== 'mixed') continue;
    (b === 'car' ? car : mixed).push(s.geometry[0]);
    points += s.geometry[0].length;
    // A checksum of where the lines are, so equal counts over different ground are not the same picture (audit 13).
    for (const [lon, lat] of s.geometry[0]) sum = (sum + Math.round(lon * 1e5) * 31 + Math.round(lat * 1e5)) % 1_000_000_007;
  }
  return { car, mixed, key: `${WALK_CODE}|${car.length}|${mixed.length}|${points}|${sum}` };
}

/** WK15: the segments a route is matched against, with their bands. */
export function routeSegments(tiles: ReadonlyMap<string, readonly WayFacts[]>): { segments: RouteSeg[]; bands: Map<string, Band> } {
  const segments = segmentsOf(tiles);
  return { segments, bands: bandsFor(segments, tiles) };
}

/** WK4: the z14 tiles within `radiusM` of a point, nearest the point's own tile first, at most MAX_TILES. */
export function tilesAround(c: LngLat, radiusM: number): [number, number][] {
  const dLat = radiusM / 110_540;
  const dLon = radiusM / (111_320 * Math.cos((c[1] * Math.PI) / 180));
  const [cx, cy] = tilesIn([c[0], c[1], c[0], c[1]])[0];
  return tilesIn([c[0] - dLon, c[1] - dLat, c[0] + dLon, c[1] + dLat])
    .sort((a, b) => Math.abs(a[0] - cx) + Math.abs(a[1] - cy) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)) || a[0] - b[0] || a[1] - b[1])
    .slice(0, MAX_TILES);
}

/**
 * WK11: an area said in words from the streets within `radiusM` of its centre (the atlas's ring), or null when
 * too little of it is known to say. Only streets whose middle is inside count; nothing but words leaves.
 */
export function ringWords(tiles: ReadonlyMap<string, readonly WayFacts[]>, centre: LngLat, radiusM: number): string | null {
  const segs = segmentsOf(tiles).filter((s) => {
    return distanceM(midOf(s.geometry[0]), centre) <= radiusM;
  });
  if (!segs.length) return null;
  return areaWords(bandLengths(segs, bandsFor(segs, tiles)));
}

export type WalkStatus = 'off' | 'reading' | 'ready' | 'unavailable';

/**
 * What a map shows now (WK13): the last drawing read stays on screen while the tiles for a new centre are read, so
 * walking along a tile edge never blanks the layer (walkability audit 5). `status` says whether it is the right one.
 */
export function drawNow(on: boolean, last: { key: string; draw: WalkDraw | null } | null, key: string): { draw: WalkDraw | null; status: WalkStatus } {
  if (!on || !key) return { draw: null, status: 'off' };
  if (!last) return { draw: null, status: 'reading' };
  if (last.key !== key) return { draw: last.draw, status: 'reading' };
  return { draw: last.draw, status: last.draw ? 'ready' : 'unavailable' };
}
