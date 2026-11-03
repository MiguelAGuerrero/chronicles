// @layer core
import { boundsOf } from './geo';
import type { LngLat } from './types';

/** OpenMapTiles' top zoom; road detail is only complete there. */
export const TILE_ZOOM = 14;

export type TileRect = { x: number; y: number; w: number; s: number; e: number; n: number };

const n2 = 2 ** TILE_ZOOM;
const lonToX = (lon: number) => ((lon + 180) / 360) * n2;
const latToY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n2;
};
const xToLon = (x: number) => (x / n2) * 360 - 180;
const yToLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n2))) * 180) / Math.PI;

export function tileRect(x: number, y: number): TileRect {
  return { x, y, w: xToLon(x), e: xToLon(x + 1), n: yToLat(y), s: yToLat(y + 1) };
}

/** The z14 tile containing a point. */
export function tileAt([lon, lat]: LngLat): TileRect {
  return tileRect(Math.floor(lonToX(lon)), Math.floor(latToY(lat)));
}

/** Whether a point lies on (within `tolM` meters of) a z14 tile edge. */
export function onTileEdge([lon, lat]: LngLat, tolM = 1.5): boolean {
  const x = lonToX(lon);
  const y = latToY(lat);
  const mPerTile = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / n2;
  const tol = tolM / mPerTile;
  return Math.abs(x - Math.round(x)) < tol || Math.abs(y - Math.round(y)) < tol;
}


/** The z14 tiles covering a box (west, south, east, north), as [x, y]. */
export function tilesIn([w, s, e, n]: [number, number, number, number], zoom = TILE_ZOOM): [number, number][] {
  const out = new Map<string, [number, number]>();
  const n2 = 2 ** zoom;
  const lonToX = (lon: number) => ((lon + 180) / 360) * n2;
  const latToY = (lat: number) => {
    const r = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n2;
  };
  // x wraps at the antimeridian; y is clamped at the poles (audit).
  const clampY = (y: number) => Math.min(n2 - 1, Math.max(0, Number.isFinite(y) ? Math.floor(y) : y > 0 ? n2 - 1 : 0));
  for (let x = Math.floor(lonToX(w)); x <= Math.floor(lonToX(e)); x++)
    for (let y = clampY(latToY(Math.min(n, 85.0511))); y <= clampY(latToY(Math.max(s, -85.0511))); y++) {
      const wx = ((x % n2) + n2) % n2;
      out.set(`${wx},${y}`, [wx, y]);
    }
  return [...out.values()];
}

/**
 * The z14 tiles within `m` of a walk's points, those the walk spent most of
 * its points in first, at most `cap` (a snap read in code: Filling gaps,
 * audit 6). Never every tile in the box: a walk at both ends of a long ride
 * reads two small areas, not the country between.
 */
export function tilesNear(trace: LngLat[], m: number, cap: number): [number, number][] {
  const count = new Map<string, { t: [number, number]; n: number }>();
  for (const p of trace) {
    for (const t of tilesIn(boundsOf([p], m)!)) {
      const k = `${t[0]},${t[1]}`;
      const c = count.get(k);
      if (c) c.n++;
      else count.set(k, { t, n: 1 });
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n).slice(0, cap).map((c) => c.t);
}
