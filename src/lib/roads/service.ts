// @layer shell
import type { LngLat } from '../types';
import { tilesAlong } from './corridor';
import { RoadGraph } from './graph';
import { ROAD_RULES, type RoadRules } from './rules';
import type { RoadSource, RoadWay } from './types';
import { findWay } from './way';

/*
 * One way on the road for whoever asks (RE1, RE7, RE8, RE15, RE29): the corridor's tiles about the points, read through the
 * source, built into a graph, and searched in turns so the screen is never held. One read at a time. The graph of the last
 * corridor is kept in memory while the page or the session that asked is open, and dropped on `forget`; nothing is stored.
 */
export type RoadAnswer =
  | { state: 'found'; way: RoadWay }
  /** Too long for one read (RE7). */
  | { state: 'long' }
  /** The roads could not be read. */
  | { state: 'failed' }
  /** Read, and no road joins the points (RE15). */
  | { state: 'none' };

export interface RoadsDeps {
  source: RoadSource;
  /** Gives the screen a turn. */
  pause(): Promise<void>;
  rules?: RoadRules;
}

export function createRoads(deps: RoadsDeps) {
  const rules = deps.rules ?? ROAD_RULES;
  let kept: { tiles: ReadonlySet<string>; graph: RoadGraph } | null = null;
  let last: Promise<unknown> = Promise.resolve();
  async function find(points: readonly LngLat[], shouldStop?: () => boolean): Promise<RoadAnswer | null> {
    const tiles = tilesAlong(points, rules);
    if (!tiles) return { state: 'long' };
    const keys = tiles.map((t) => t.join('/'));
    // A corridor inside the one last read needs no read of its own.
    const held = kept?.tiles;
    let graph = held && keys.every((k) => held.has(k)) ? (kept?.graph ?? null) : null;
    if (!graph) {
      kept = null;
      const roads = await deps.source.read(tiles, shouldStop).catch(() => null);
      if (shouldStop?.()) return null;
      if (!roads) return { state: 'failed' };
      await deps.pause();
      graph = RoadGraph.build(roads, rules.joinM);
      kept = { tiles: new Set(keys), graph };
    }
    const search = findWay(graph, [...points], rules);
    for (;;) {
      const step = search.next();
      if (step.done) return step.value.legs.some((l) => l) ? { state: 'found', way: step.value } : { state: 'none' };
      await deps.pause();
      if (shouldStop?.()) return null;
    }
  }
  return {
    /** The way through these points in order; null when stopped. */
    way(points: readonly LngLat[], shouldStop?: () => boolean): Promise<RoadAnswer | null> {
      const run = last.then(() => (shouldStop?.() ? null : find(points, shouldStop)));
      last = run.catch(() => null);
      return run.catch(() => ({ state: 'failed' as const }));
    },
    /** Drops the graph kept: the page that asked has closed. */
    forget() {
      kept = null;
    },
  };
}
