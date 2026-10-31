import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { deriveSegments } from '../streets';
import { ensureTileBuild } from '../tiles';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { analyzeArea, centreFor, LANDING_RULES, type AreaAnalysis } from './analyze';

/** Towns and cities are in the place layer from z10; z11 tiles keep the read to a few. */
const TOWNS_ZOOM = 11;

export type AreaRead = { ok: true; centre: LngLat; analysis: AreaAnalysis } | { ok: false; reason: 'failed' | 'cancelled' };

async function readAround(url: string, build: string, at: LngLat) {
  const features = await fetchTiles(url, tilesIn(boundsOf([at], LANDING_RULES.radiusM)!));
  const segments = deriveSegments(features.roads, features.names, build);
  const places = placesFromTilePois(features.pois, build);
  // Cached like any read, tagged with the build (L2).
  await db.putSegments(segments).catch(() => {});
  await db.putPlaces(places).catch(() => {});
  return { segments, places, towns: placesFromTiles(features.places), transit: transitFromTilePois(features.pois) };
}

/**
 * "What's good here?" (L1, L2): the z14 tiles of the 1.5 km around the
 * pressed spot are fetched and decoded in code, with no camera moves, on
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
    const wide = await fetchTiles(url, tilesIn(boundsOf([pressed], LANDING_RULES.townM)!, TOWNS_ZOOM), TOWNS_ZOOM).catch(() => null);
    if (shouldStop()) return { ok: false, reason: 'cancelled' };
    const centre = centreFor(pressed, wide ? placesFromTiles(wide.places) : []);
    const read = await readAround(url, build, centre);
    if (shouldStop()) return { ok: false, reason: 'cancelled' };
    return { ok: true, centre, analysis: analyzeArea({ centre, ...read }) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
