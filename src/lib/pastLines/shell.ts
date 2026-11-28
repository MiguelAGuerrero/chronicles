// @layer shell
import { fillsOf, gapsOf, stretchesFor } from '../gaps/infer';
import type { Ports } from '../ports/types';
import { untilEnd } from '../quietEnd/core';
import { readTrace, withFilled } from '../rides';
import { createStore, type Store } from '../store';
import type { LngLat, Walk } from '../types';
import { lineOf, nearLines, prepareOrder, reachTiles, staleIds, type WalkLine } from './core';

/*
 * Where I've been (WB6, WB14-WB17): builds each walk's line from what the device holds (its fixes, pauses, stills and the
 * gaps the walker kept; never a tile, never a request), keeps it, and reads the lines near the map. The factory takes its
 * ports so a Node test runs it with fakes; the app's instance is `./index`.
 */

export interface PastLines {
  /** `preparing` while older walks are built; `version` moves on once each preparing is done, so the map re-reads once (WB16). */
  store: Store<{ preparing: boolean; version: number }>;
  /** Builds and keeps one closed walk's line; null for a walk that is gone or still open. */
  build(walkId: string): Promise<WalkLine | null>;
  /** Drops a walk's line, to be built again (a gap kept or dismissed, WB14). */
  drop(walkId: string): Promise<void>;
  /** Builds every closed walk's missing or stale line, nearest the centre first, one at a time, until told to stop (WB15). */
  prepare(centre: LngLat | null, shouldStop?: () => boolean): Promise<void>;
  /** The lines that pass within reach of the centre: one indexed read of the reach's tiles (WB6). */
  near(centre: LngLat): Promise<WalkLine[]>;
}

export function createPastLines(p: Pick<Ports, 'db'>): PastLines {
  const store = createStore({ preparing: false, version: 0 });
  let running: Promise<void> | null = null;

  const buildWalk = async (walk: Walk): Promise<WalkLine | null> => {
    if (walk.open) return null;
    const [points, pauses, stills, decisions] = await Promise.all([
      p.db.getPoints(walk.id),
      p.db.getPauses(walk.id),
      p.db.getStills(walk.id),
      p.db.getGapDecisions(walk.id),
    ]);
    // Up to its end (QE5, decision 0272).
    const plain = readTrace(untilEnd(points, walk.ended_at), walk.started_at, pauses, stills);
    // Only the gaps the walker kept: an inference is never stored, and would need tiles (WB7, WB17).
    const fills = fillsOf(stretchesFor(gapsOf(plain), [], decisions));
    const line = lineOf(walk.id, withFilled(plain, fills));
    await p.db.putWalkLine(line);
    return line;
  };

  return {
    store,
    async build(walkId) {
      const walk = await p.db.getWalk(walkId);
      return walk ? buildWalk(walk) : null;
    },
    drop: (walkId) => p.db.deleteWalkLine(walkId),
    prepare(centre, shouldStop) {
      running ??= (async () => {
        const [walks, codes] = await Promise.all([p.db.listWalks(), p.db.listWalkLineCodes()]);
        const stale = new Set(staleIds(walks, codes));
        if (!stale.size) return;
        store.set((s) => ({ ...s, preparing: true }));
        try {
          // Where each walk was: the middle of its first area's stretch, when it was placed.
          const at = new Map<string, LngLat>();
          for (const r of await p.db.listWalkAreas().catch(() => [])) if (!at.has(r.walk_id)) at.set(r.walk_id, [r.lon, r.lat]);
          const byId = new Map(walks.map((w) => [w.id, w]));
          const order = prepareOrder(
            [...stale].map((id) => ({ id, at: at.get(id) ?? null, started_at: byId.get(id)!.started_at })),
            centre,
          );
          for (const id of order) {
            if (shouldStop?.()) break;
            // A walk that fails is left stale for the next time (WB15).
            await buildWalk(byId.get(id)!).catch(() => null);
          }
        } finally {
          store.set((s) => ({ preparing: false, version: s.version + 1 }));
        }
      })().finally(() => {
        running = null;
      });
      return running;
    },
    async near(centre) {
      return nearLines(await p.db.getWalkLinesIn(reachTiles(centre)), centre);
    },
  };
}
