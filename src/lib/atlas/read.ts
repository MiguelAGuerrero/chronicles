// @layer shell
import type { CollectedFeatures } from '../../components/map/types';
import { readOverture } from '../activity/overture';
import { activityFromTilePois, mergeSources, type ActivityPoint } from '../activity/points';
import { outlineOf } from '../areas/borders';
import { outlines } from '../areas/outlineReader';
import { listable, withOutlines } from '../areas/outlines';
import type { TownOutline } from '../areas/types';
import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import { exploreBusy } from '../explore/exploreRun';
import { boundsOf, distanceM } from '../geo';
import { analyzeArea, LANDING_RULES } from '../landing/analyze';
import { deriveSegments } from '../streets';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import {
  ATLAS_CODE, ATLAS_RULES, keptProfile, newRows, withNear, ringOf, sketchOf, SKETCH,
  type AtlasArea, type AtlasLevel, type AtlasProfile, type NearRead, type Within,
} from './atlas';
import { extentTiles, inExtent } from './extent';
import { findPockets, type Pocket } from './pockets';
import { placesArchive } from '../discovery/archive';
import type { ArchiveRead } from '../discovery/archive/shell';
import { archiveTilesFor } from '../discovery/archiveManifest';
import { ARCHIVE_EDITS } from '../discovery/archiveMerge';

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

/** AT1, AT14: lists the areas of a level around you. Resolves whether it read. */
export function readNear(at: LngLat, level: AtlasLevel, build: string, reach: number, shouldStop: () => boolean): Promise<boolean | null> {
  return one(async () => {
    const url = await db.getMeta('tile_url');
    if (!url || build === 'unknown' || shouldStop()) return false;
    const f = await fetchTiles(url, tilesIn(boundsOf([at], reach)!, ZOOM[level]), ZOOM[level], shouldStop).catch(() => null);
    if (!f || shouldStop()) return false;
    let candidates = placesFromTiles(f.places);
    // Towns known only by their outline (Whitehall) are listed too (TO4, TO10); without the outlines, by points.
    if (level === 'town') {
      const read = await outlines.read([at], shouldStop).catch(() => null);
      if (shouldStop()) return false;
      if (read) candidates = withOutlines(candidates, read.set).filter((c) => listable(c, at));
    }
    candidates = candidates.filter((c) => c.level === level && distanceM(c.at, at) <= reach);
    const rows = newRows(await db.listAtlasAreas().catch(() => []), candidates, build, Date.now());
    await db.putAtlasAreas(rows);
    const near: NearRead = { at, build, code: ATLAS_CODE, radiusM: reach };
    await db.setMeta(nearKey(level), JSON.stringify(withNear(await nearReads(level), near)));
    return true;
  });
}

/** A town's whole outline, and whether the read took all its tiles (TP1-TP3). */
export interface Extent {
  outline: Pick<TownOutline, 'polygons' | 'bbox'>;
  partial: boolean;
}

/**
 * What one read keeps (AT4, AT6, AT7, AD14), from decoded tiles and Overture's places for the same
 * tiles (null without them, AD7). Pure apart from its inputs. The bars stay OpenStreetMap's (AD2), and the
 * findable kinds count only markable places (AG1). With an `extent` (a town's whole outline, TP1) the bars
 * and marks count across it, its pockets of activity are found (TP4) and its picture is drawn around the
 * busiest; without one, the 800 m ring around the point.
 */
export function profileFrom(at: LngLat, feats: CollectedFeatures, build: string, overture: { release: string; points: ActivityPoint[] } | null = null, extent: Extent | null = null, archive: ArchiveRead = null, finds: { key: string; name: string; at: LngLat }[] = []) {
  const segments = deriveSegments(feats.roads, feats.names, build);
  const places = placesFromTilePois(feats.pois, build);
  const within: Within = extent ? (p) => inExtent(p, extent.outline) : (p) => distanceM(p, at) <= ATLAS_RULES.ringM;
  // PW10: the map's places and the archive's, with the owner's edits; thin from the map's alone.
  const counted = ringOf(places, archive?.places ?? null, at, within, { edits: ARCHIVE_EDITS, version: archive?.version ?? 'owner' }, finds);
  const points = mergeSources(activityFromTilePois(feats.pois), overture?.points ?? []);
  const towns = placesFromTiles(feats.places);
  const transit = transitFromTilePois(feats.pois);
  // The analysis reads the landing radius around its centre: the segments near it are all it needs.
  const analyze = (centre: LngLat) =>
    analyzeArea({
      centre, points, towns, transit,
      segments: extent ? segments.filter((s) => s.geometry.some((l) => l.some((p) => distanceM(p, centre) <= LANDING_RULES.radiusM + 300))) : segments,
    });
  // TP4: a graded town's pockets, each named for the busiest street through it.
  const pockets: Pocket[] = extent ? findPockets(points.filter((p) => within(p.at))) : [];
  let first: ReturnType<typeof analyze> | null = null;
  const stripsAt: { name: string; peak: LngLat }[] = [];
  const named = pockets.map((pocket, i) => {
    const a = analyze(pocket.at);
    if (i === 0) first = a;
    const near = a.strips.find((s) => distanceM(s.peak, pocket.at) <= 800 && within(s.peak));
    if (near) stripsAt.push({ name: near.name, peak: near.peak });
    return { ...pocket, name: near?.name ?? null };
  });
  const view = named[0]?.at ?? at;
  const analysis = first ?? analyze(at);
  const strips = extent ? stripsAt : analysis.strips.filter((s) => within(s.peak)).map((s) => ({ name: s.name, peak: s.peak }));
  // What the frame can show: a little past the ring's corners.
  const frameM = (Math.hypot(SKETCH.w, SKETCH.h) / 2 / SKETCH.ringR) * ATLAS_RULES.ringM;
  const profile: AtlasProfile = {
    steps: counted.steps,
    thin: counted.thin,
    strips: [...new Set(strips.map((s) => s.name))],
    stripAt: strips[0]?.peak ?? (named[0]?.at ?? null),
    marks: counted.marks,
    sketch: sketchOf({
      centre: view,
      segments: segments.filter((s) => s.geometry.some((l) => l.some((p) => distanceM(p, view) <= frameM))),
      graded: analysis.graded,
      parks: places.filter((p) => p.category === 'parks').map((p) => p.at),
    }),
    overture: overture?.release ?? null,
    archive: archive?.version ?? null,
    ...(extent ? { extent: 'outline' as const, partial: extent.partial, pockets: named, ...(named[0] ? { sketchAt: view } : {}) } : { extent: 'ring' as const }),
  };
  return { profile, cache: { segments, places } };
}

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
    if (area.level === 'town') {
      const read = await outlines.borders([area.at], shouldStop).catch(() => null);
      if (shouldStop()) return null;
      const outline = read ? outlineOf(area, read.set) : null;
      // No outline because the read failed is not a town with none (TP12): the ring for now, asked again after the retry wait.
      if (!outline && !read?.complete) outlineRetry = true;
      if (outline) {
        const e = extentTiles(outline, area.at);
        tiles = e.tiles;
        extent = { outline, partial: e.partial };
      }
    }
    // Overture's places for the same tiles (AD3); without them the ring is measured from the map's alone (AD7).
    // And the places archive's (PW10); without it the findable kinds are counted from the map's places (PW3).
    const [f, overture, archive] = await Promise.all([
      fetchTiles(url, tiles, undefined, shouldStop).catch(() => null),
      readOverture(tiles, shouldStop),
      placesArchive.read(tiles, area.at, shouldStop).catch(() => null),
    ]);
    // Audit 1: a found place keeps its find's key, so the atlas shows it found.
    const finds = archive ? await db.listFinds().catch(() => []) : [];
    if (shouldStop()) return null;
    if (!f) return failed();
    try {
      // Only the atlas's own row is written (explore-atlas audit 6): a ring's streets and places are not
      // rewritten into the shared caches, so the write queue stays free for the walk.
      const { profile } = profileFrom(area.at, f, area.build, overture, extent, archive, finds);
      if (outlineRetry) profile.outlineRetry = true;
      // SB10: the archive tiles this read covered, so a new version re-reads it only when one of them changed.
      if (archive) profile.archiveTiles = archiveTilesFor(tiles);
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
