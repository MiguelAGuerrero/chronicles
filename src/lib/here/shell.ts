// @layer shell
import { type Faced, facedAll } from '../moment';
import { boundsOf, distanceM, pausedMs } from '../geo';
import type { Ports } from '../ports/types';
import type { LngLat, Pause } from '../types';
import { suggestTitle } from '../walkTitle';

/** "What happened here" looks this far around the tapped spot, unless the map says how far a tap reaches. */
export const HERE_RADIUS_M = 50;

export interface HereResult {
  captures: Faced[];
  /** Per capture id: "Tuesday evening in Fox Point · 40 min in"; the capture's own line has its date. */
  context: Map<string, string>;
}

/** The chronicle read by place instead of by time (TD3). */
export function createHere(p: Pick<Ports, 'db'>) {
  return {
    /**
     * Every capture taken near a spot, across all walks, oldest first, with
     * where in its walk it was taken.
     */
    async capturesHere(
      at: LngLat,
      /** The open walk's captures as shown: one taken without a fix has no stored place until stop. */
      live: Faced[] = [],
      radiusM = HERE_RADIUS_M,
    ): Promise<HereResult> {
      const isNear = (c: Faced) => c.lat != null && c.lon != null && distanceM(at, [c.lon, c.lat]) <= radiusM;
      const stored = (await p.db.momentsIn(boundsOf([at], radiusM)!).then(facedAll)).filter(isNear);
      const ids = new Set(stored.map((c) => c.id));
      const near = [...stored, ...live.filter((c) => !ids.has(c.id) && isNear(c))].sort((a, b) => a.t - b.t);
      const context = new Map<string, string>();
      const walks = new Map<string, { title: string; startedAt: number; pauses: Pause[] }>();
      for (const c of near) {
        // A moment made outside any walk (M4): its own line already has its date.
        if (c.walk_id == null) {
          context.set(c.id, 'Not on a walk');
          continue;
        }
        let w = walks.get(c.walk_id);
        if (!w) {
          const walk = await p.db.getWalk(c.walk_id);
          if (!walk) continue;
          w = { title: walk.title ?? suggestTitle(walk), startedAt: walk.started_at, pauses: await p.db.getPauses(walk.id) };
          walks.set(c.walk_id, w);
        }
        const minutesIn = Math.max(0, Math.round((c.t - w.startedAt - pausedMs(w.pauses, w.startedAt, c.t)) / 60_000));
        context.set(c.id, `${w.title} · ${minutesIn ? `${minutesIn} min in` : 'at the start'}`);
      }
      return { captures: near.filter((c) => context.has(c.id)), context };
    },
  };
}
