// @layer shell
import type { Collector } from '../finish';
import { placeAll, withTimeout } from '../placeAll';
import type { Walk } from '../types';

/** A walk's street tiles, then its wider read of places; past these the tiles are not answering. */
const LIMITS = { collect: 60_000, places: 20_000 };

export interface BacklogDeps {
  /** The tile build, or 'unknown' when it has never been read (never online). */
  tileBuild: () => Promise<string>;
  /** Snaps and places one walk with the collector given (`snapWalk`). */
  snap: (walk: Walk, collector: Collector) => Promise<unknown>;
  /** A fresh collector reading tiles in code, with no camera moves (`tileCollector`). */
  collector: () => Collector;
  /** Whether the walk is still there to place: one deleted, or waiting on Undo, since the pass began is not. */
  still: (id: string) => Promise<boolean>;
  ms?: { collect: number; places: number };
}

export type PlaceBacklog = (
  walks: Walk[],
  opts: { onProgress?: (done: number) => void; stopped?: () => boolean; onAttempt?: (id: string) => void },
) => Promise<{ placed: string[]; failed: string[] }>;

/**
 * Places walks that have no places yet (from before v0.5, or offline at stop)
 * in one pass, one after another. The tiles are read in code, never through
 * the home map, so the map stays where it is and in view while the pass runs
 * (the owner, Nov 11: the pass once moved the home map from walk to walk
 * behind a cover). This is the home's one read of traces, kept here so the
 * screen itself reads only walks, summaries, Area and WalkArea. Every read
 * times out, so a read that never answers fails the walk instead of hanging
 * the pass. Without a known tile build (never online), the pass does not start.
 */
export function createBacklog(d: BacklogDeps): PlaceBacklog {
  const ms = d.ms ?? LIMITS;
  return async (walks, opts) => {
    if ((await d.tileBuild().catch(() => 'unknown')) === 'unknown') return { placed: [], failed: walks.map((w) => w.id) };
    const byId = new Map(walks.map((w) => [w.id, w]));
    return placeAll(
      walks.map((w) => w.id),
      async (id) => {
        // A delete waits on Undo with the walk's rows still stored: placing it would write them back (deletion audit 2).
        if (!(await d.still(id))) throw new Error('The walk is gone');
        const c = d.collector();
        await d.snap(byId.get(id)!, {
          plan: (bounds, trace) => c.plan(bounds, trace),
          collect: (centers) => withTimeout(c.collect(centers), ms.collect, 'The tiles'),
          collectPlaces: (center) => withTimeout(c.collectPlaces(center), ms.places, 'The tiles'),
        });
      },
      opts.onProgress,
      opts.stopped,
      opts.onAttempt,
    );
  };
}
