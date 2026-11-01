import { placesFromTiles } from '../areas/tilePlaces';
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { boundsOf } from '../geo';
import { analyzeArea } from '../landing/analyze';
import { readAround, rememberArea } from '../landing/read';
import { sweepCovered } from '../landing/view';
import { ensureTileBuild } from '../tiles';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { buildChecklists, EXPLORE_RULES, type ChecklistArea, type ExploreRead } from './explore';

/** The tile build, checked at most every 10 min: never a TileJSON fetch per fix (audit 1, 6). */
const BUILD_MS = 10 * 60_000;
let buildSeen: { value: string; at: number } | null = null;
export async function exploreBuild(): Promise<string> {
  if (buildSeen && Date.now() - buildSeen.at < BUILD_MS) return buildSeen.value;
  const value = await ensureTileBuild().catch(() => 'unknown');
  if (value !== 'unknown') buildSeen = { value, at: Date.now() };
  return value;
}

/** Towns and cities are in the place layer from z10; a z11 read of 3 km finds the one a walk is in (E3). */
const TOWNS_ZOOM = 11;
const TOWNS_M = 3000;

export type ExploreResult = { ok: true; areas: ChecklistArea[] } | { ok: false };

let running: Promise<ExploreResult> | null = null;

/**
 * One explore read (E2): the z14 tiles of the 1.5 km around `centre`, decoded
 * in code with no camera moves, plus a z11 read for the towns. That one read
 * builds the checklists of the areas it saw whole and, as information, the
 * busy streets (remembered like "What's good here"). Never two at once. A
 * failed or cancelled read stores nothing (E5).
 */
export function exploreRead(centre: LngLat, opts: { remember: boolean }, shouldStop: () => boolean = () => false): Promise<ExploreResult> {
  if (running) return running;
  running = (async (): Promise<ExploreResult> => {
    try {
      const build = await exploreBuild();
      const url = await db.getMeta('tile_url');
      if (!url || build === 'unknown' || shouldStop()) return { ok: false };
      const wide = await fetchTiles(url, tilesIn(boundsOf([centre], TOWNS_M)!, TOWNS_ZOOM), TOWNS_ZOOM, shouldStop).catch(() => null);
      if (shouldStop()) return { ok: false };
      const read = await readAround(url, build, centre, shouldStop);
      if (shouldStop()) return { ok: false };
      // Neighborhoods come from the z14 place points, towns from the z11 read.
      const candidates = [...read.towns, ...(wide ? placesFromTiles(wide.places).filter((c) => c.level === 'town') : [])];
      const now = Date.now();
      // Areas built for this build stay as they are; earlier reads' candidates keep places with their areas (audit 3).
      const [done, reads] = await Promise.all([db.listChecklistAreas(), db.listExploreReads()]);
      const built = buildChecklists({
        places: read.places, candidates, centre, build, now,
        built: done.filter((a) => a.build === build),
        known: reads.filter((r) => r.build === build).flatMap((r) => r.candidates),
      });
      const record: ExploreRead = { key: `${centre[0].toFixed(5)},${centre[1].toFixed(5)}`, centre, build, read_at: now, candidates };
      await db.saveChecklists({ ...built, read: record });
      // The busy streets from the same read (E2), on an exploring walk only (the owner's call: quiet walks
      // keep checklists, not magenta), unless a current area here is already remembered.
      const known = opts.remember ? await db.listLandings().catch(() => []) : [];
      if (opts.remember && !sweepCovered(known, centre, build)) {
        await rememberArea(centre, analyzeArea({ centre, ...read }), build).catch(() => {});
      }
      return { ok: true, areas: built.areas };
    } catch {
      return { ok: false };
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Whether an explore read is running now. */
export const exploreBusy = () => running != null;

/** The bounds a walk's items are read in: the read's reach around where you are. */
export const itemBounds = (at: LngLat) => boundsOf([at], EXPLORE_RULES.readM)!;
