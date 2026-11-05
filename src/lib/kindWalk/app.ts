// @layer shell
// @instance: the kind walk on the app's ports, the walkability reader and the device's cache
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { deriveSegments } from '../streets';
import { tilesIn, tilesNear } from '../tileMath';
import { ports } from '../ports';
import { carStretches } from '../walk/ahead';
import { routeSegments } from '../walk/layer';
import { MAX_TILES } from '../walk/limits';
import { walkBuild, walkReader } from '../walk/walkApp';
import { createKindWalkPrefs } from './prefs';
import { createKindWalk } from './suggest';

/** Tiles within this of the way are read for what lies on it (WK4), as for a route's heads-up. */
const WAY_TILE_M = 100;

export const kindWalkPrefs = createKindWalkPrefs(ports);

export const kindWalk = createKindWalk({
  async read(at, radiusM) {
    const [url, build] = await Promise.all([db.getMeta('tile_url'), db.getMeta('tile_build')]);
    if (!url) return null;
    // A little past the radius, so a street beside a cell at its edge is read too.
    const f = await fetchTiles(url, tilesIn(boundsOf([at], radiusM + 300)!));
    return { places: placesFromTilePois(f.pois, build ?? ''), segments: deriveSegments(f.roads, f.names, build ?? '') };
  },
  async reach(path) {
    const build = await walkBuild().catch(() => null);
    const read = await walkReader.read(tilesNear(path, WAY_TILE_M, MAX_TILES), build ?? 'unknown');
    if (!read.tiles.size) return { cars: [], unknown: true };
    const { segments, bands } = routeSegments(read.tiles);
    // Tiles that held no usable facts about these streets say nothing: not known, never "fine" (KW10, WK3).
    if (![...bands.values()].some((b) => b !== 'unknown')) return { cars: [], unknown: true };
    return { cars: carStretches(path, segments, bands).map((s) => s.street), unknown: false };
  },
});
