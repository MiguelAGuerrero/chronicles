import { db } from '../db';
import { deriveSegments, type RoadFeature } from '../streets';
import { tileAt, TILE_ZOOM } from '../tileMath';
import type { LngLat } from '../types';
import { decodeTile } from './tileDecode';
import { placesFromTilePois } from './tilePois';

/** The z14 tiles read this session, so walking around inside them fetches nothing (A11). */
const read = new Set<string>();
let inFlight: Promise<boolean> | null = null;

/**
 * Entering a new z14 tile, it and its 8 neighbours are fetched from the
 * tile host and decoded in code (the location task can't move the map), and
 * their streets and places cached with the tile build. A failed fetch leaves
 * the cache as it was. Returns whether anything new was cached.
 */
export function cacheTilesAround(at: LngLat): Promise<boolean> {
  const here = tileAt(at);
  if (read.has(`${here.x},${here.y}`)) return Promise.resolve(false);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [build, url] = await Promise.all([db.getMeta('tile_build'), db.getMeta('tile_url')]);
    if (!build || !url) return false;
    const want: [number, number][] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) want.push([here.x + dx, here.y + dy]);
    const roads: RoadFeature[] = [];
    const names: RoadFeature[] = [];
    const pois: RoadFeature[] = [];
    for (const [x, y] of want) {
      const res = await fetch(url.replace('{z}', String(TILE_ZOOM)).replace('{x}', String(x)).replace('{y}', String(y)));
      if (!res.ok) throw new Error(`Tile ${x},${y}: ${res.status}`);
      const f = decodeTile(new Uint8Array(await res.arrayBuffer()), TILE_ZOOM, x, y);
      roads.push(...f.roads);
      names.push(...f.names);
      pois.push(...f.pois);
    }
    // Written only once all nine are in: a partial read caches nothing.
    await db.putSegments(deriveSegments(roads, names, build));
    await db.putPlaces(placesFromTilePois(pois, build));
    for (const [x, y] of want) read.add(`${x},${y}`);
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
