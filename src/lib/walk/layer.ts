// @layer core
import { lineLengthM } from '../geo';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { isBeside, isCrossing } from './bands';
import { bandsFor } from './match';
import { MAX_TILES } from './limits';
import type { Band, WayFacts } from './types';

/*
 * What the walkability layer draws and what a route sees (WK13, WK15). A tile's own road ways stand as
 * the street segments, so the layer works wherever tiles were read, walked or not; footways and
 * crossings are only the evidence beside them. Bands are derived on every call (WK9), never kept.
 */

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

export type WalkStatus = 'off' | 'reading' | 'ready' | 'unavailable';

/**
 * What a map shows now (WK13): the last drawing read stays on screen while the tiles for a new centre are read, so
 * walking along a tile edge never blanks the layer (walkability audit 5). `status` says whether it is the right one.
 */
export function drawNow<T>(on: boolean, last: { key: string; draw: T | null } | null, key: string): { draw: T | null; status: WalkStatus } {
  if (!on || !key) return { draw: null, status: 'off' };
  if (!last) return { draw: null, status: 'reading' };
  if (last.key !== key) return { draw: last.draw, status: 'reading' };
  return { draw: last.draw, status: last.draw ? 'ready' : 'unavailable' };
}
