// @layer shell
// @instance: the walk planner on the device's tiles, the walkability reader, the finds and the open walk
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesArchive } from '../discovery/archive';
import { placesFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { carStretches } from '../walk/ahead';
import { routeSegments } from '../walk/layer';
import { MAX_TILES } from '../walk/limits';
import { walkBuild, walkReader } from '../walk/walkApp';
import { deriveSegments } from '../streets';
import { tilesIn, tilesNear } from '../tileMath';
import { createPlanner } from './service';

/** Tiles within this of a route are read for what lies on it (WK4), as for a route's heads-up. */
const WAY_TILE_M = 100;

export const planner = createPlanner({
  async read(at, radiusM) {
    const [url, build] = await Promise.all([db.getMeta('tile_url'), db.getMeta('tile_build')]);
    if (!url) return null;
    // A little past the radius, so a street beside a cell at its edge is read too.
    const tiles = tilesIn(boundsOf([at], radiusM + 300)!);
    // presence-and-kinds audit 1: the places archive's places too, as the atlas ring reads them; any failure is none (PW3).
    const [f, archive] = await Promise.all([fetchTiles(url, tiles), placesArchive.read(tiles, at, () => false).catch(() => null)]);
    return { places: placesFromTilePois(f.pois, build ?? ''), archive: archive?.places ?? null, segments: deriveSegments(f.roads, f.names, build ?? '') };
  },
  async reach(path) {
    const build = await walkBuild().catch(() => null);
    const read = await walkReader.read(tilesNear(path, WAY_TILE_M, MAX_TILES), build ?? 'unknown');
    if (!read.tiles.size) return { cars: [], unknown: true };
    const { segments, bands } = routeSegments(read.tiles);
    if (![...bands.values()].some((b) => b !== 'unknown')) return { cars: [], unknown: true };
    return { cars: carStretches(path, segments, bands).map((s) => s.street), unknown: false };
  },
  // Finds are the walker's own: captured at a place that was a mark. A place not yet found is not in this list (WP16).
  async found(kind) {
    const finds = await db.listFinds();
    // Only the opened kind's finds: a pin with no word on it would read as a point of interest for a kind not asked about (audit 21).
    return finds.filter((f) => f.category === kind).map((f) => ({ at: f.at }));
  },
});

/** The open walk's id, or null (WP19, WP23). */
export async function openWalkId(): Promise<string | null> {
  return (await db.getOpenWalk().catch(() => null))?.id ?? null;
}

/** Whether the open walk has a destination set, which Start would replace (walk planner audit 16): meta `nav`, as it is held. */
export async function navRaw(): Promise<string | null> {
  return db.getMeta('nav').catch(() => null);
}
