import type { CollectedFeatures } from '../../components/map/types';
import { readOverture } from '../activity/overture';
import { activityFromTilePois, mergeSources, type ActivityPoint } from '../activity/points';
import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { isMarkable } from '../discovery/noise';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import { exploreBusy } from '../explore/exploreRun';
import { boundsOf, distanceM } from '../geo';
import { analyzeArea } from '../landing/analyze';
import { deriveSegments } from '../streets';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import {
  ATLAS_CODE, ATLAS_RULES, marksOf, newRows, withNear, presenceSteps, sketchOf, SKETCH,
  type AtlasArea, type AtlasLevel, type AtlasProfile, type NearRead,
} from './atlas';

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
    const candidates = placesFromTiles(f.places).filter((c) => c.level === level && distanceM(c.at, at) <= reach);
    const rows = newRows(await db.listAtlasAreas().catch(() => []), candidates, build, Date.now());
    await db.putAtlasAreas(rows);
    const near: NearRead = { at, build, code: ATLAS_CODE, radiusM: reach };
    await db.setMeta(nearKey(level), JSON.stringify(withNear(await nearReads(level), near)));
    return true;
  });
}

/**
 * What one ring read keeps (AT4, AT6, AT7, AD14), from decoded tiles and Overture's places for the same
 * tiles (null without them, AD7). Pure apart from its inputs. The bars stay OpenStreetMap's (AD2).
 */
export function profileFrom(at: LngLat, feats: CollectedFeatures, build: string, overture: { release: string; points: ActivityPoint[] } | null = null) {
  const segments = deriveSegments(feats.roads, feats.names, build);
  const places = placesFromTilePois(feats.pois, build);
  const ring = places.filter((p) => distanceM(p.at, at) <= ATLAS_RULES.ringM);
  const points = mergeSources(activityFromTilePois(feats.pois), overture?.points ?? []);
  const analysis = analyzeArea({ centre: at, points, segments, towns: placesFromTiles(feats.places), transit: transitFromTilePois(feats.pois) });
  const strips = analysis.strips.filter((s) => distanceM(s.peak, at) <= ATLAS_RULES.ringM);
  // What the frame can show: a little past the ring's corners.
  const frameM = (Math.hypot(SKETCH.w, SKETCH.h) / 2 / SKETCH.ringR) * ATLAS_RULES.ringM;
  const profile: AtlasProfile = {
    steps: presenceSteps(ring, at),
    strips: [...new Set(strips.map((s) => s.name))],
    stripAt: strips[0]?.peak ?? null,
    marks: marksOf(ring, isMarkable),
    sketch: sketchOf({
      centre: at,
      segments: segments.filter((s) => s.geometry.some((l) => l.some((p) => distanceM(p, at) <= frameM))),
      graded: analysis.graded,
      parks: places.filter((p) => p.category === 'parks').map((p) => p.at),
    }),
    overture: overture?.release ?? null,
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
    const tiles = tilesIn(boundsOf([area.at], frameM)!);
    // Overture's places for the same tiles (AD3); without them the ring is measured from the map's alone (AD7).
    const [f, overture] = await Promise.all([fetchTiles(url, tiles, undefined, shouldStop).catch(() => null), readOverture(tiles, shouldStop)]);
    if (shouldStop()) return null;
    if (!f) return failed();
    try {
      // Only the atlas's own row is written (explore-atlas audit 6): a ring's streets and places are not
      // rewritten into the shared caches, so the write queue stays free for the walk.
      const { profile } = profileFrom(area.at, f, area.build, overture);
      const row: AtlasArea = { ...area, profile, read_at: Date.now(), failed_at: null };
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
