// @layer shell
import { readOverture } from '../activity/overture';
import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTileBodies, fetchTiles } from '../discovery/tileFetch';
import { boundsOf } from '../geo';
import { ensureTileBuild } from '../tiles';
import { TILE_ZOOM, tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { centreFor, LANDING_RULES, readTiles, type AreaAnalysis } from './analyze';
import { keyFor, LANDING_VERSION, replacesRow, type LandingRow } from './view';
import { placesArchive } from '../discovery/archive';
import { offPage } from './runOffPage';

/** Towns and cities are in the place layer from z10; z11 tiles keep the read to a few. */
const TOWNS_ZOOM = 11;

class Cancelled extends Error {}

export type AreaRead = { ok: true; centre: LngLat; analysis: AreaAnalysis; overture: string | null } | { ok: false; reason: 'failed' | 'cancelled' };

export async function readAround(url: string, build: string, at: LngLat, shouldStop: () => boolean, withOverture = true, analyzeAt: LngLat | null = null) {
  const tiles = readTiles(at);
  // Overture's places for the same tiles (AD3), beside the map's; without them the read goes on (AD7). A read that
  // measures no density (a quiet walk's checklists) asks Overture for nothing (activity-density audit 4).
  // The places archive for the same tiles (PW1, PW9), on every read, quiet walks too, so a capture can find one;
  // without it the read goes on from the map alone (PW3).
  const [bodies, overture, archive] = await Promise.all([
    fetchTileBodies(url, tiles, undefined, shouldStop),
    withOverture ? readOverture(tiles, shouldStop) : null,
    placesArchive.read(tiles, at, shouldStop).catch(() => null),
  ]);
  if (shouldStop()) throw new Cancelled();
  // Decoding, the streets, the places and the measure run off the page on the web (DC7, DC13), between turns on native (DC11).
  const out = await offPage.run({ bodies, tiles, zoom: TILE_ZOOM, build, overturePoints: overture?.points ?? [], archivePlaces: archive?.places ?? null, analyzeAt });
  if (shouldStop()) throw new Cancelled();
  // Cached like any read, tagged with the build (L2), in batches the page draws between, none once the read is
  // cancelled or replaced (DC10). Overture's places, and the archive's, are never stored.
  await db.putSegments(out.segments, shouldStop).catch(() => {});
  await db.putPlaces(out.tilePlaces).catch(() => {});
  const { segments, places, points, towns, transit, analysis } = out;
  return { segments, places, points, overture: overture?.release ?? null, archive: archive?.version ?? null, towns, transit, analysis };
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
    const read = await readAround(url, build, centre, shouldStop, true, centre);
    if (shouldStop() || !read.analysis) return { ok: false, reason: 'cancelled' };
    return { ok: true, centre, analysis: read.analysis, overture: read.overture };
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
