import type { WalkMapHandle } from '../components/map/types';
import { planViews } from '../components/map/types';
import { snapWalk } from './finish';
import { placeAll, withTimeout } from './places';
import { ensureTileBuild } from './tiles';
import type { Walk } from './types';

/** A walk's street views (each up to 4 s) plus its wide read; past this the map is not answering. */
const COLLECT_MS = 60_000;
const PLACES_MS = 20_000;

/**
 * Places walks that have no places yet (from before v0.5, or offline at stop)
 * in one pass, reading their tiles through the home map. This is the home's
 * one read of traces, kept here so the screen itself reads only walks,
 * summaries, Area and WalkArea. Every map read times out, so a map that
 * never loads fails the walk instead of hanging the pass. Without a known
 * tile build (never online), the pass does not start.
 */
export async function placeBacklog(
  walks: Walk[],
  map: () => WalkMapHandle | null,
  opts: { onProgress?: (done: number) => void; stopped?: () => boolean; onAttempt?: (id: string) => void },
): Promise<{ placed: string[]; failed: string[] }> {
  if ((await ensureTileBuild().catch(() => 'unknown')) === 'unknown') return { placed: [], failed: walks.map((w) => w.id) };
  const byId = new Map(walks.map((w) => [w.id, w]));
  return placeAll(
    walks.map((w) => w.id),
    async (id) => {
      const m = map();
      if (!m) throw new Error('The map is gone');
      await snapWalk(byId.get(id)!, {
        plan: (bounds, trace) => {
          const { width, height } = m.size();
          return planViews(bounds, width, height, trace);
        },
        collect: (centers) => withTimeout(m.collect(centers), COLLECT_MS, 'The map'),
        collectPlaces: (center) => withTimeout(m.collectPlaces(center), PLACES_MS, 'The map'),
      });
    },
    opts.onProgress,
    opts.stopped,
    opts.onAttempt,
  );
}
