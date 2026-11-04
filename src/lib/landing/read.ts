// @layer shell
import { readOverture } from '../activity/overture';
import { activityFromTilePois, mergeSources } from '../activity/points';
import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { deriveSegments } from '../streets';
import { ensureTileBuild } from '../tiles';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { analyzeArea, centreFor, LANDING_RULES, readTiles, type AreaAnalysis } from './analyze';
import { keyFor, LANDING_VERSION, replacesRow, type LandingRow } from './view';

/** Towns and cities are in the place layer from z10; z11 tiles keep the read to a few. */
const TOWNS_ZOOM = 11;

class Cancelled extends Error {}

export type AreaRead = { ok: true; centre: LngLat; analysis: AreaAnalysis; overture: string | null } | { ok: false; reason: 'failed' | 'cancelled' };

export async function readAround(url: string, build: string, at: LngLat, shouldStop: () => boolean, withOverture = true) {
  const tiles = readTiles(at);
  // Overture's places for the same tiles (AD3), beside the map's; without them the read goes on (AD7). A read that
  // measures no density (a quiet walk's checklists) asks Overture for nothing (activity-density audit 4).
  const [features, overture] = await Promise.all([fetchTiles(url, tiles, undefined, shouldStop), withOverture ? readOverture(tiles, shouldStop) : null]);
  if (shouldStop()) throw new Cancelled();
  const segments = deriveSegments(features.roads, features.names, build);
  const places = placesFromTilePois(features.pois, build);
  // Cached like any read, tagged with the build (L2). Overture's places are never stored.
  await db.putSegments(segments).catch(() => {});
  await db.putPlaces(places).catch(() => {});
  const points = mergeSources(activityFromTilePois(features.pois), overture?.points ?? []);
  return { segments, places, points, overture: overture?.release ?? null, towns: placesFromTiles(features.places), transit: transitFromTilePois(features.pois) };
}

/**
 * "What's good here?" (L1, L2): the z14 tiles of the 1.5 km around the
 * pressed spot are fetched and decoded in code (with Overture's places for
 * the same tiles, AD3), with no camera moves, on
 * both platforms. If a town or city point lies within 3 km, the area around
 * it is read instead. A failed read changes nothing.
 */
export async function readArea(pressed: LngLat, shouldStop: () => boolean): Promise<AreaRead> {
  try {
    const build = await ensureTileBuild().catch(() => 'unknown');
    const url = await db.getMeta('tile_url');
    if (!url || build === 'unknown') return { ok: false, reason: 'failed' };
    // The towns first, from a coarse z11 read of the 3 km around: a z14 read of the area alone
    // would miss a city 2-3 km off (audit). Without it, the pressed spot is the centre.
    const wide = await fetchTiles(url, tilesIn(boundsOf([pressed], LANDING_RULES.townM)!, TOWNS_ZOOM), TOWNS_ZOOM, shouldStop).catch(() => null);
    if (shouldStop()) return { ok: false, reason: 'cancelled' };
    const centre = centreFor(pressed, wide ? placesFromTiles(wide.places) : []);
    const read = await readAround(url, build, centre, shouldStop);
    if (shouldStop()) return { ok: false, reason: 'cancelled' };
    return { ok: true, centre, analysis: analyzeArea({ centre, ...read }), overture: read.overture };
  } catch (e) {
    return { ok: false, reason: e instanceof Cancelled || shouldStop() ? 'cancelled' : 'failed' };
  }
}

/** Saves an analyzed area as a remembered one, replacing any centred within 1 km (L12). */
export async function rememberArea(centre: LngLat, analysis: AreaAnalysis, build: string, overture: string | null): Promise<LandingRow> {
  const known = await db.listLandings().catch(() => []);
  const key = keyFor(known, centre);
  const existing = known.find((r) => r.key === key);
  if (existing && !replacesRow(existing, overture)) return existing;
  const row: LandingRow = { key, centre, analysis, build, rules: LANDING_VERSION, analyzed_at: Date.now(), overture };
  await db.putLanding(row);
  return row;
}
