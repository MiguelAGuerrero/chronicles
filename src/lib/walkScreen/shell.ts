// @layer shell
import { type Faced, facedAll } from '../moment';
import { placesFromTilePois } from '../discovery/tilePois';
import { EXPLORE_KEY, exploredKey } from '../explore/explore';
import { boundsOf, distanceToLinesM, nearPoints } from '../geo';
import { LANDING_VERSION, type LandingRow } from '../landing/view';
import { MEMORY_RULES } from '../memories';
import type { Ports } from '../ports/types';
import type { RecorderStatus } from '../recorder/types';
import { deriveSegments } from '../streets';
import type { LngLat, StreetSegment } from '../types';
import type { CollectedFeatures } from '../../components/map/types';

/** Streets around the walker: read from the map and shown as fog this far out. */
export const NEAR_RADIUS_M = 1000;
/** A street piece whose middle the live trace passed this close to counts as walked for now. */
const ON_TRACE_M = 20;
/** The walk that has had its dead-zone nudge (L15): once a walk. */
const NUDGED_KEY = 'deadzone_walk';
/** The "press and hold the map" hint, once ever. */
const HINT_KEY = 'hint_go';

function midpointOf(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  return line[Math.floor(line.length / 2)] ?? [0, 0];
}

export type StreetsAround = {
  /** The map's view was whole: false means read the streets again on the next fix. */
  complete: boolean;
  fog: StreetSegment[];
  walked: StreetSegment[];
  /** The credited streets, read once per walk screen: hand them back on the next run. */
  visited: Set<string>;
};

/**
 * The walk screen's effects (the walk screen in parts, WS6): what `walk.tsx` read and wrote itself,
 * in the same order and with the same guards, so its views import no db or recorder (WS5).
 */
export function createWalkScreen(p: Pick<Ports, 'db' | 'recorder'>) {
  const { db, recorder } = p;
  return {
    /**
     * Streets around the walker: the map reads the streets in its loaded z14 tiles, they join the
     * cache tagged with the build being served, and those no walk has credited show as fog. The trace
     * is read last, so a run that waited on storage leaves out what was walked meanwhile.
     */
    async streetsAround(a: {
      at: LngLat;
      build: string;
      collect: () => Promise<CollectedFeatures | null | undefined>;
      trace: () => LngLat[];
      visited?: Set<string> | null;
    }): Promise<StreetsAround> {
      const { at, build } = a;
      const features = await a.collect().catch(() => null);
      if (features?.complete && features.roads.length && build !== 'unknown') {
        await db.putSegments(deriveSegments(features.roads, features.names, build)).catch(() => {});
        // Not awaited: the fog shouldn't wait on the place cache.
        db.putPlaces(placesFromTilePois(features.pois, build, { complete: features.complete })).catch(() => {});
      }
      const segs = (await db.getSegmentsIn(boundsOf([at], NEAR_RADIUS_M)!)).filter((x) => distanceToLinesM(at, x.geometry) <= NEAR_RADIUS_M);
      // Credited streets change only at a stop: read once per walk screen.
      const visited = a.visited ?? (await db.visitedSegmentIds());
      // Streets this walk has already gone down are only credited at stop; until then, those along the trace are left out of the fog.
      const walkedNow = nearPoints(a.trace(), ON_TRACE_M);
      return {
        complete: !!features?.complete,
        fog: segs.filter((x) => !visited.has(x.id) && !walkedNow(midpointOf(x))),
        walked: segs.filter((x) => visited.has(x.id)),
        visited,
      };
    },

    /** The remembered areas, current rules only (hotspots on the walk, v1.5 slice 3). */
    async landings(): Promise<LandingRow[]> {
      return (await db.listLandings()).filter((x) => x.rules === LANDING_VERSION);
    },

    /** Every moment around a spot, for memories on revisit (MR8). */
    async momentsNear(at: LngLat): Promise<Faced[]> {
      return facedAll(await db.momentsIn(boundsOf([at], MEMORY_RULES.readBoxM)!));
    },

    /** This walk explores only once switched on (E1). */
    async exploring(walkId: string): Promise<boolean> {
      return (await db.getMeta(EXPLORE_KEY)) === walkId;
    },

    /** Switches this walk's Explore; its replay counts what it passed from the first time it was on (E11, audit 9). */
    async setExploring(walkId: string, on: boolean, now: number): Promise<void> {
      const write = db.setMeta(EXPLORE_KEY, on ? walkId : '').catch(() => {});
      if (on) {
        const key = exploredKey(walkId);
        await db.getMeta(key).then((v) => (v ? undefined : db.setMeta(key, String(now))), () => {}).catch(() => {});
      }
      await write;
    },

    /** The dead-zone nudge was spent on this walk (L15). */
    async nudgeSpent(walkId: string): Promise<boolean> {
      return (await db.getMeta(NUDGED_KEY)) === walkId;
    },
    async spendNudge(walkId: string): Promise<void> {
      await db.setMeta(NUDGED_KEY, walkId);
    },

    /** The hint is due once ever: true the first time, and it is spent as it is said. */
    async hintDue(): Promise<boolean> {
      if (await db.getMeta(HINT_KEY)) return false;
      await db.setMeta(HINT_KEY, '1');
      return true;
    },

    /** The recorder's status, as it changes. */
    subscribeStatus(cb: (s: RecorderStatus) => void): () => void {
      return recorder.subscribeStatus(cb);
    },

    /** Whether the recorder keeps tracing with the page hidden (a phone does, a browser doesn't). */
    backgroundCapable(): boolean {
      return recorder.capabilities.background;
    },
  };
}

export type WalkScreenShell = ReturnType<typeof createWalkScreen>;
