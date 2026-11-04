// @layer shell
import type { Ports } from '../../ports/types';
import { NAV_KEY, navValue, pendingDest } from '../../startPlan';
import type { Waypoint } from '../types';

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
        return v && v.walk_id === walkId ? v.dest : null;
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
  };
}
