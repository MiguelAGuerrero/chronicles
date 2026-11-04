// @layer shell
import type { CollectedFeatures } from '../../components/map/types';
import { placesFromTilePois } from '../discovery/tilePois';
import { boundsOf } from '../geo';
import { perfCount } from '../perfCount';
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { deriveSegments } from '../streets';
import type { LngLat, StreetSegment } from '../types';
import { FOG_RULES, fogDue, fogOf } from './rules';

export interface FogState {
  fog: StreetSegment[];
  walked: StreetSegment[];
}

export interface FogRefresh {
  /** The walker's position now. */
  here: LngLat | null;
  riding: boolean;
  /** The tile build (`ensureTileBuild`), null until known, 'unknown' when it can't be. */
  build: string | null;
  /** This walk's trace, read when the fog is decided (the newest, not the one at the fix). */
  runs: () => LngLat[][];
  /** The map's read of what is around it (the view's `collectView`). */
  collect: () => Promise<CollectedFeatures | null | undefined>;
}

/**
 * The walk screen's fog (FR1-FR6): reads the streets around the walker from
 * the map, stores them and their places, reads the cache back and decides
 * the fog with `./rules`. One per walk screen: credited streets are read once
 * (they change only at a stop) and the last read's place is the screen's.
 * `newFog()` (`./index`) builds it with the app's ports.
 */
export function createFog(p: Pick<Ports, 'db'>) {
  const store: Store<FogState> = createStore<FogState>({ fog: [], walked: [] });
  let busy = false;
  let lastAt: LngLat | null = null;
  let visited: Set<string> | null = null;
  let open = true;

  async function run(r: FogRefresh, here: LngLat, build: string) {
    perfCount('fog:read');
    const features = await r.collect().catch(() => null);
    if (features?.complete && features.roads.length && build !== 'unknown') {
      await p.db.putSegments(deriveSegments(features.roads, features.names, build)).catch(() => {});
      // Not awaited: the fog shouldn't wait on the place cache.
      p.db.putPlaces(placesFromTilePois(features.pois, build, { complete: features.complete })).catch(() => {});
    } else if (!features?.complete) {
      lastAt = null; // zoomed out or not loaded yet: read the streets again on the next fix
    }
    const pieces = await p.db.getSegmentsIn(boundsOf([here], FOG_RULES.nearM)!);
    visited ??= await p.db.visitedSegmentIds();
    // A newer fix never cancels a read under way (a slow read on a phone was always
    // thrown away by the next fix, 2 s later); a closed screen takes nothing.
    if (!open) return;
    store.set(fogOf({ pieces, visited, runs: r.runs(), here }));
  }

  return {
    store,
    /** Hands the fog a fix: reads the streets if one is due, else does nothing. */
    refresh(r: FogRefresh): Promise<void> {
      if (!fogDue({ here: r.here, lastAt, busy, riding: r.riding, build: r.build })) return Promise.resolve();
      const here = r.here!;
      busy = true;
      lastAt = here;
      return run(r, here, r.build!)
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    },
    /** The screen has gone: a read under way ends without changing anything. */
    close() {
      open = false;
    },
  };
}

export type Fog = ReturnType<typeof createFog>;
