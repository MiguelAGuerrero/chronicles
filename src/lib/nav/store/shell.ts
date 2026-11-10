// @layer shell
import type { Ports } from '../../ports/types';
import { NAV_KEY, navValue, pendingDest } from '../../startPlan';
import { leaningsIn } from '../scenic';
import type { LngLat } from '../../types';
import type { Waypoint } from '../types';

/** Meta: the spot chosen with Walk back here, for one walk (DW7). */
const WAY_BACK_KEY = 'way_back';

/**
 * The destination of the open walk's navigation, kept so a reload resumes it
 * (N13). It is not truth: just where you were heading, cleared on arrival,
 * End or stop. Before a walk, the drawer's destination (NV23) is the same key
 * held for no walk.
 */
export function createNavStore(p: Pick<Ports, 'db'>) {
  return {
    async saveNav(walkId: string, dest: Waypoint): Promise<void> {
      await p.db.setMeta(NAV_KEY, navValue(walkId, dest));
    },
    async loadNav(walkId: string): Promise<Waypoint | null> {
      try {
        const v = JSON.parse((await p.db.getMeta(NAV_KEY)) || 'null') as { walk_id: string; dest: Waypoint } | null;
        if (!v || v.walk_id !== walkId) return null;
        // SR11: only known leanings come back; none, or a value from before scenic routes, is the direct way.
        const { leanings, ...dest } = v.dest;
        const kept = leaningsIn(leanings);
        return kept.length ? { ...dest, leanings: kept } : dest;
      } catch {
        return null;
      }
    },
    async clearNav(): Promise<void> {
      await p.db.setMeta(NAV_KEY, '');
    },
    /** The drawer's destination, before a walk (NV23); null clears it. */
    async loadPendingDest(): Promise<Waypoint | null> {
      return pendingDest(await p.db.getMeta(NAV_KEY).catch(() => null));
    },
    async savePendingDest(dest: Waypoint | null): Promise<void> {
      await p.db.setMeta(NAV_KEY, dest ? navValue(null, dest) : '');
    },
    /**
     * When I get there (DW3, DW4): the place becomes Navigate's destination, held for no walk. Nothing
     * else: no walk, no location, nothing scheduled. Only Start begins the walk.
     */
    async saveForLater(dest: Waypoint): Promise<void> {
      await p.db.setMeta(NAV_KEY, navValue(null, dest));
    },
    /** Walk back here (DW7): this walk's way-back spot; a later one replaces it. */
    async saveWayBack(walkId: string, at: LngLat): Promise<void> {
      await p.db.setMeta(WAY_BACK_KEY, JSON.stringify({ walk_id: walkId, at }));
    },
    async loadWayBack(walkId: string): Promise<LngLat | null> {
      try {
        const v = JSON.parse((await p.db.getMeta(WAY_BACK_KEY)) || 'null') as { walk_id: string; at: LngLat } | null;
        return v && v.walk_id === walkId && Array.isArray(v.at) && v.at.length === 2 && v.at.every(Number.isFinite) ? v.at : null;
      } catch {
        return null;
      }
    },
    /** Stop clears it (DW7). */
    async clearWayBack(): Promise<void> {
      await p.db.setMeta(WAY_BACK_KEY, '');
    },
  };
}
