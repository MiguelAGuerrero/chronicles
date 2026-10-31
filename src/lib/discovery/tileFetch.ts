import { db } from '../db';
import { deriveSegments, type RoadFeature } from '../streets';
import { tileAt, TILE_ZOOM } from '../tileMath';
import type { LngLat } from '../types';
import { decodeTile } from './tileDecode';
import { placesFromTilePois } from './tilePois';

/** The z14 tiles read this session under a build, so walking around inside them fetches nothing (A11). */
const read = new Set<string>();
let readBuild: string | null = null;
let inFlight: Promise<boolean> | null = null;
/** A failed read waits this long before the same tile is tried again (audit: not once a second offline). */
const RETRY_MS = 2 * 60_000;
const FETCH_MS = 10_000;
let failedAt: { tile: string; at: number } | null = null;

async function fetchTile(url: string): Promise<ArrayBuffer> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Entering a new z14 tile, it and its 8 neighbours are fetched from the
 * tile host and decoded in code (the location task can't move the map), and
 * their streets and places cached with the tile build. A failed fetch leaves
 * the cache as it was. Returns whether anything new was cached.
 */
export function cacheTilesAround(at: LngLat): Promise<boolean> {
  const here = tileAt(at);
  const key = `${here.x},${here.y}`;
  if (inFlight) return inFlight;
  if (failedAt?.tile === key && Date.now() - failedAt.at < RETRY_MS) return Promise.resolve(false);
  inFlight = (async () => {
    const [build, url] = await Promise.all([db.getMeta('tile_build'), db.getMeta('tile_url')]);
    if (!build || !url) return false;
    // A new build: what was read under the old one is read again.
    if (build !== readBuild) {
      read.clear();
      readBuild = build;
    }
    if (read.has(key)) return false;
    const want: [number, number][] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) want.push([here.x + dx, here.y + dy]);
    const roads: RoadFeature[] = [];
    const names: RoadFeature[] = [];
    const pois: RoadFeature[] = [];
    // In parallel, each with its own timeout: a stalled request can't hold ambient for the session.
    const bodies = await Promise.all(
      want.map(([x, y]) => fetchTile(url.replace('{z}', String(TILE_ZOOM)).replace('{x}', String(x)).replace('{y}', String(y)))),
    );
    for (let i = 0; i < want.length; i++) {
      const [x, y] = want[i];
      const f = decodeTile(new Uint8Array(bodies[i]), TILE_ZOOM, x, y);
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
    .catch(() => {
      failedAt = { tile: key, at: Date.now() };
      return false;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
