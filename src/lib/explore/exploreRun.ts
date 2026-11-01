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
export function exploreRead(centre: LngLat, shouldStop: () => boolean = () => false): Promise<ExploreResult> {
  if (running) return running;
  running = (async (): Promise<ExploreResult> => {
    try {
      const build = await ensureTileBuild().catch(() => 'unknown');
      const url = await db.getMeta('tile_url');
      if (!url || build === 'unknown' || shouldStop()) return { ok: false };
      const wide = await fetchTiles(url, tilesIn(boundsOf([centre], TOWNS_M)!, TOWNS_ZOOM), TOWNS_ZOOM, shouldStop).catch(() => null);
      if (shouldStop()) return { ok: false };
      const read = await readAround(url, build, centre, shouldStop);
      if (shouldStop()) return { ok: false };
      // Neighborhoods come from the z14 place points, towns from the z11 read.
      const candidates = [...read.towns, ...(wide ? placesFromTiles(wide.places).filter((c) => c.level === 'town') : [])];
      const now = Date.now();
      const built = buildChecklists({ places: read.places, candidates, centre, build, now });
      const record: ExploreRead = { key: `${centre[0].toFixed(5)},${centre[1].toFixed(5)}`, centre, build, read_at: now, candidates };
      await db.saveChecklists({ ...built, read: record });
      // The busy streets from the same read (E2), unless a current area here is already remembered.
      const known = await db.listLandings().catch(() => []);
      if (!sweepCovered(known, centre, build)) {
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
