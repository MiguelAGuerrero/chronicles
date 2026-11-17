// @layer shell
import type { Ports } from '../ports/types';
import { isJourneyPlan, type JourneyPlan } from './journeyPlan';

/** Meta: the plan of the open session (OJ48). Not truth: where the outing was headed, cleared when it stops. */
const KEY = 'outing_journey';

/** How long after the page offers a plan a session may take it up: the one started from that tap, not a later one. */
export const PLAN_CLAIM_MS = 2 * 60_000;

interface Kept {
  walk_id: string | null;
  at: number;
  plan: JourneyPlan;
}

export function createPlanStore(p: Pick<Ports, 'db' | 'clock'>) {
  const read = async (): Promise<Kept | null> => {
    try {
      const v = JSON.parse((await p.db.getMeta(KEY)) || 'null') as Kept | null;
      return v && (v.walk_id === null || typeof v.walk_id === 'string') && typeof v.at === 'number' && isJourneyPlan(v.plan) ? v : null;
    } catch {
      return null;
    }
  };
  return {
    /** The page, at Start: the plan for the session about to begin. */
    async offer(plan: JourneyPlan): Promise<void> {
      await p.db.setMeta(KEY, JSON.stringify({ walk_id: null, at: p.clock.now(), plan } satisfies Kept));
    },
    /** The session's plan: its own, or one offered just now, which becomes its own. Another session's is never returned. */
    async load(walkId: string): Promise<JourneyPlan | null> {
      const v = await read();
      if (!v) return null;
      if (v.walk_id === walkId) return v.plan;
      if (v.walk_id !== null || p.clock.now() - v.at > PLAN_CLAIM_MS) return null;
      await p.db.setMeta(KEY, JSON.stringify({ ...v, walk_id: walkId } satisfies Kept));
      return v.plan;
    },
    async clear(): Promise<void> {
      await p.db.setMeta(KEY, '');
    },
  };
}
