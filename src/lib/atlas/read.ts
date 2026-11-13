// @layer shell
import { readOverture } from '../activity/overture';
import { outlineOf } from '../areas/borders';
import { outlines } from '../areas/outlineReader';
import type { OutlineRead } from '../areas/outlineRead';
import { hoodExtentFor, hoodProbe } from '../areas/hoods';
import { listable, withOutlines } from '../areas/outlines';
import type { PlaceCandidate } from '../areas/types';
import { hamletsFromTiles, placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTileBodies, fetchTiles } from '../discovery/tileFetch';
import { exploreBusy } from '../explore/exploreRun';
import { boundsOf, distanceM } from '../geo';
import { TILE_ZOOM, tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import {
  ATLAS_CODE, ATLAS_RULES, keptProfile, newRows, withNear, SKETCH,
  type AtlasArea, type AtlasLevel, type NearRead,
} from './atlas';
import { extentTiles } from './extent';
import { borderReach, insideTown, isWard, listingBy, shapedHoods, shapeUnread, townHoods } from './hoods';
import { placesArchive } from '../discovery/archive';
import { type Extent } from './profile';
import { offPage } from '../landing/runOffPage';

/*
 * The atlas's reads (AT1, AT5, AT14): the tiles are fetched and decoded in
 * code, with no camera moves, on both platforms, like every other read.
 * All or nothing: a failed read stores nothing but when it failed.
 */

/** Neighborhood points are in the z14 place layer; towns and cities in z11's. */
const ZOOM: Record<AtlasLevel, number> = { neighborhood: 14, town: 11 };
const nearKey = (level: AtlasLevel) => `atlas_near:${level}`;

/** The near reads kept for a level, newest first (a single object from before the hierarchy reads as one). */
export async function nearReads(level: AtlasLevel): Promise<NearRead[]> {
  const v = await db.getMeta(nearKey(level)).catch(() => null);
  try {
    const r = v ? (JSON.parse(v) as NearRead[] | NearRead) : [];
    return Array.isArray(r) ? r : [r];
  } catch {
    return [];
  }
}

let running: Promise<unknown> | null = null;
/** One read at a time, whoever asks. */
function one<T>(task: () => Promise<T>): Promise<T | null> {
  // Never beside the walk's own explore read either (explore-atlas audit 6): the caller tries again shortly.
  if (running || exploreBusy()) return Promise.resolve(null);
  const p = task().finally(() => {
    running = null;
  });
  running = p;
  return p;
}

/** A town's whole border (z10), read across the tile edges it is cut at (whole-towns audit 1). */
async function wholeBorder(town: { name: string; at: LngLat }, shouldStop: () => boolean) {
  const first = await outlines.borders([town.at], shouldStop).catch(() => null);
  const beyond = first ? borderReach(town, first.set) : [];
  if (!first || !beyond.length || shouldStop()) return first;
  const all = await outlines.borders([town.at, ...beyond], shouldStop).catch(() => null);
  return all && (all.complete || !first.complete) ? all : first;
}

/**
 * AT1, AT14: lists the areas of a level around you. Resolves whether it read.
 * WT1-WT6, WT9: with `town`, a town's own neighborhoods: across its whole border (the z14 tiles it touches, as the
 * town's ring read takes them), hamlets inside it too and never a ward; by its reach where it has no border; nothing
 * yet (false, tried again) where the border read failed.
 */
export function readNear(
  at: LngLat, level: AtlasLevel, build: string, reach: number, shouldStop: () => boolean,
  town: { key: string; name: string; at: LngLat } | null = null,
  /** FL15: a read made for a look (Show areas here), kept apart from the reads around you. */
  look = false,
): Promise<boolean | null> {
  return one(async () => {
    const url = await db.getMeta('tile_url');
    if (!url || build === 'unknown' || shouldStop()) return false;
    let candidates: PlaceCandidate[] | null = null;
    if (level === 'neighborhood' && town) {
      const border = await wholeBorder(town, shouldStop);
      if (shouldStop()) return false;
      const outline = border ? outlineOf(town, border.set) : null;
      const by = listingBy(border, outline);
      if (by === 'retry') return false;
      if (outline && border) {
        const f = await fetchTiles(url, extentTiles(outline, town.at).tiles, ZOOM.neighborhood, shouldStop).catch(() => null);
        if (!f || shouldStop()) return false;
        candidates = townHoods({ hoods: placesFromTiles(f.places), hamlets: hamletsFromTiles(f.places), outline, set: border.set });
        // Audit 1: as placing knows them, by the tiles already kept (a listing asks for no more): a name inside a shape is no
        // row, and a shape with no point inside the town's border is one.
        const kept = await outlines.known(candidates.map((c) => c.at)).catch(() => null);
        candidates = shapedHoods(candidates, kept, (c) => insideTown(c.at, outline, border.set));
      }
    }
    if (!candidates) {
      const f = await fetchTiles(url, tilesIn(boundsOf([at], reach)!, ZOOM[level]), ZOOM[level], shouldStop).catch(() => null);
      if (!f || shouldStop()) return false;
      candidates = placesFromTiles(f.places);
      // Towns known only by their outline (Whitehall) are listed too (TO4, TO10); without the outlines, by points.
      if (level === 'town') {
        const read = await outlines.read([at], shouldStop).catch(() => null);
        if (shouldStop()) return false;
        if (read) candidates = withOutlines(candidates, read.set).filter((c) => listable(c, at));
      } else if (level === 'neighborhood') {
        // Audit 1: the neighborhoods around you as placing knows them, by the tile under you: a name inside a shape is no row, and a shape with no point within reach is one.
        const read = await outlines.read([at], shouldStop).catch(() => null);
        if (shouldStop()) return false;
        candidates = shapedHoods(candidates, read?.set, (c) => distanceM(c.at, at) <= reach);
      }
      candidates = candidates.filter((c) => c.level === level && distanceM(c.at, at) <= reach && !(level === 'neighborhood' && isWard(c.name)));
    }
    const rows = newRows(await db.listAtlasAreas().catch(() => []), candidates, build, Date.now());
    await db.putAtlasAreas(rows);
    const near: NearRead = { at, build, code: ATLAS_CODE, radiusM: reach, ...(town && level === 'neighborhood' ? { town: town.key } : {}), ...(look ? { look: true } : {}) };
    await db.setMeta(nearKey(level), JSON.stringify(withNear(await nearReads(level), near)));
    return true;
  });
}

export { profileFrom, type Extent } from './profile';

/** AT5: reads one area's ring, keeps its profile, and caches its streets and places like any read. */
export function readRing(area: AtlasArea, shouldStop: () => boolean): Promise<AtlasArea | null> {
  return one(async () => {
    const url = await db.getMeta('tile_url');
    const failed = async () => {
      const row = { ...area, failed_at: Date.now() };
      await db.putAtlasAreas([row]).catch(() => {});
      return row;
    };
    if (!url) return failed();
    // The whole frame, so the picture's corners are drawn too.
    const frameM = (Math.hypot(SKETCH.w, SKETCH.h) / 2 / SKETCH.ringR) * ATLAS_RULES.ringM;
    let tiles = tilesIn(boundsOf([area.at], frameM)!);
    // TP1-TP3: a town with an outline is read across it (the whole-town z10 outline), at most a budget of tiles.
    let extent: Extent | null = null;
    let outlineRetry = false;
    let hoodRead: OutlineRead | null = null;
    if (area.level === 'town') {
      const read = await wholeBorder(area, shouldStop);
      if (shouldStop()) return null;
      const outline = read ? outlineOf(area, read.set) : null;
      // No outline because the read failed is not a town with none (TP12): the ring for now, asked again after the retry wait.
      if (!outline && !read?.complete) outlineRetry = true;
      if (outline) {
        const e = extentTiles(outline, area.at);
        tiles = e.tiles;
        extent = { outline, partial: e.partial };
      }
    } else if (area.level === 'neighborhood') {
      // HB11: counted across its own shape where the tiles hold one; its share after the places are read; the ring where
      // they hold neither, and a failed read is tried again (audit 4). The probe reads the tiles beside it too, so a
      // shape crossing a tile edge is whole.
      hoodRead = await outlines.read(hoodProbe(area.at), shouldStop).catch(() => null);
      if (shouldStop()) return null;
      const own = hoodRead ? hoodExtentFor(area, hoodRead.set) : null;
      if (own) {
        const e = extentTiles(own.outline, area.at);
        tiles = e.tiles;
        extent = { outline: own.outline, partial: e.partial, shape: true };
      }
    }
    // Overture's places for the same tiles (AD3); without them the ring is measured from the map's alone (AD7).
    // And the places archive's (PW10); without it the findable kinds are counted from the map's places (PW3).
    const [bodies, overture, archive] = await Promise.all([
      fetchTileBodies(url, tiles, undefined, shouldStop).catch(() => null),
      readOverture(tiles, shouldStop),
      placesArchive.read(tiles, area.at, shouldStop).catch(() => null),
    ]);
    // Audit 1: a found place keeps its find's key, so the atlas shows it found.
    const finds = archive ? await db.listFinds().catch(() => []) : [];
    if (shouldStop()) return null;
    if (!bodies) return failed();
    // Audit 4 (hood boundaries): a neighborhood with no shape of its own is counted across its share, the ground its line
    // draws, from the places just read: worked out with the profile, off the page (explore-dense-city audit 2).
    const share = area.level === 'neighborhood' && !extent && hoodRead ? { area: { level: area.level, name: area.name, at: area.at }, set: hoodRead.set } : null;
    try {
      // Only the atlas's own row is written (explore-atlas audit 6): a ring's streets and places are not
      // rewritten into the shared caches, so the write queue stays free for the walk. The profile is computed off the
      // page on the web, as a Busy read is (explore-dense-city audit 2: it held the page 600-700 ms a ring). Once the tiles
      // are in, the profile is computed and kept whatever stops the loop's step, as when it was computed in one turn: the
      // atlas loop restarts its step on any change, and a ring stopped mid-compute was never read at all.
      const ring = await offPage.ring({ bodies, tiles, zoom: TILE_ZOOM, build: area.build, at: area.at, overture, extent, share, archive, finds });
      const profile = ring.profile;
      if (area.level === 'neighborhood' && shapeUnread(hoodRead, ring.extent)) outlineRetry = true;
      if (outlineRetry) profile.outlineRetry = true;
      // read_at moves on either way, so a ring Overture didn't answer for waits before asking again.
      const row: AtlasArea = { ...area, profile: keptProfile(area.profile, profile), read_at: Date.now(), failed_at: null };
      await db.putAtlasAreas([row]);
      return row;
    } catch {
      // A profile that throws or a write that fails is a failed read: it waits retryMs (explore-atlas audit 3).
      return failed();
    }
  });
}

/** Whether a read is running now. */
export const atlasBusy = () => running != null;
