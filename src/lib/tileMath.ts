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
export function tilesIn([w, s, e, n]: [number, number, number, number]): [number, number][] {
  const out: [number, number][] = [];
  for (let x = Math.floor(lonToX(w)); x <= Math.floor(lonToX(e)); x++)
    for (let y = Math.floor(latToY(n)); y <= Math.floor(latToY(s)); y++) out.push([x, y]);
  return out;
}
