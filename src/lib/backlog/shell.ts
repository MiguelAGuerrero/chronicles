// @layer shell
import type { Collector } from '../finish';
import { placeAll, withTimeout } from '../placeAll';
import { createStore, type Store } from '../store';
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

/** What any screen shows of the passes: the walk at hand, and how many have been placed, to read the rows again. */
export interface BacklogStatus {
  at: string | null;
  placed: number;
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
export function createBacklog(d: BacklogDeps): { placeBacklog: PlaceBacklog; status: Store<BacklogStatus> } {
  const ms = d.ms ?? LIMITS;
  // Kept here, not in a screen: Chronicle remounts on a section switch, and the new screen still shows the
  // walk at hand and its star (fix background-placing audit 1).
  const status = createStore<BacklogStatus>({ at: null, placed: 0 });
  // Every walk any pass has begun: two queued passes never place the same walk (audit 10).
  const begun = new Set<string>();
  const run: PlaceBacklog = async (all, opts) => {
    const walks = all.filter((w) => !begun.has(w.id));
    if ((await d.tileBuild().catch(() => 'unknown')) === 'unknown') return { placed: [], failed: walks.map((w) => w.id) };
    const byId = new Map(walks.map((w) => [w.id, w]));
    return placeAll(
      walks.map((w) => w.id),
      async (id) => {
        // A delete waits on Undo with the walk's rows still stored: placing it would write them back (deletion audit 2).
        begun.add(id);
        if (!(await d.still(id))) throw new Error('The walk is gone');
        status.set((s) => ({ ...s, at: id }));
        const c = d.collector();
        await d.snap(byId.get(id)!, {
          plan: (bounds, trace) => c.plan(bounds, trace),
          collect: (centers) => withTimeout(c.collect(centers), ms.collect, 'The tiles'),
          collectPlaces: (center) => withTimeout(c.collectPlaces(center), ms.places, 'The tiles'),
        });
        status.set((s) => ({ ...s, placed: s.placed + 1 }));
      },
      opts.onProgress,
      opts.stopped,
      opts.onAttempt,
    ).finally(() => status.set((s) => (s.at === null ? s : { ...s, at: null })));
  };
  // One pass at a time: a second asks after the one under way, with its own walks and callbacks, never joining
  // the first's (whose screen may be gone and whose pass stops after the walk at hand).
  let last: Promise<unknown> = Promise.resolve();
  const placeBacklog: PlaceBacklog = (walks, opts) => {
    // A pass whose screen left while it waited places nothing (audit 10).
    const pass = last.catch(() => {}).then(() => (opts.stopped?.() ? { placed: [], failed: [] } : run(walks, opts)));
    last = pass;
    return pass;
  };
  return { placeBacklog, status };
}
