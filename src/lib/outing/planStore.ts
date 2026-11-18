// @layer shell
import type { Ports } from '../ports/types';
import { isJourneyPlan, type JourneyPlan } from './journeyPlan';

const KEY = 'outing_journey';

interface Kept {
  walk_id: string | null;
  at: number;
  plan: JourneyPlan;
}

/** How long after the page offers a plan a session may take it up: the one started from that tap, not a later one. */
export const PLAN_CLAIM_MS = 2 * 60_000;

/**
 * The plan of the open session (OJ48), in meta `outing_journey`. Not truth: the towns still ahead of an outing, kept so a reload or
 * a return to the screen finds them, and gone when the session stops, when the last town is behind, or when the Start it was
 * offered for did not happen.
 */
export function createPlanStore(p: Pick<Ports, 'db' | 'clock'>) {
  // Read and written as the navigation's own key is (`nav/store`): declared in META, held to its shape here.
  const read = async (): Promise<Kept | null> => {
    try {
      const v = JSON.parse((await p.db.getMeta(KEY)) || 'null') as Kept | null;
      return v && (v.walk_id === null || typeof v.walk_id === 'string') && typeof v.at === 'number' && isJourneyPlan(v.plan) ? v : null;
    } catch {
      return null;
    }
  };
  const write = (v: Kept) => p.db.setMeta(KEY, JSON.stringify(v));
  const wipe = () => p.db.setMeta(KEY, '');
  return {
    /** The page, at Start: the plan for the session about to begin. */
    async offer(plan: JourneyPlan): Promise<void> {
      await write({ walk_id: null, at: p.clock.now(), plan });
    },
    /** The Start it was offered for did not happen: a plan no session took up is taken back (audit 44). */
    async withdraw(): Promise<void> {
      const v = await read();
      if (v && v.walk_id === null) await wipe();
    },
    /** The session's plan: its own, or one offered just now, which becomes its own. Another session's is never returned. */
    async load(walkId: string): Promise<JourneyPlan | null> {
      const v = await read();
      if (!v) return null;
      if (v.walk_id === walkId) return v.plan;
      const age = p.clock.now() - v.at;
      if (v.walk_id !== null || age < 0 || age > PLAN_CLAIM_MS) return null;
      await write({ ...v, walk_id: walkId });
      return v.plan;
    },
    /** The towns still ahead, as the session goes; none ahead and the plan is gone. */
    async keep(walkId: string, plan: JourneyPlan | null): Promise<void> {
      if (plan) await write({ walk_id: walkId, at: p.clock.now(), plan });
      else await wipe();
    },
    async clear(): Promise<void> {
      await wipe();
    },
  };
}
