// @layer shell
import { LEANINGS, leaningsIn, type Leaning } from '../nav/scenic';
import type { Ports } from '../ports/types';
import { createStore } from '../store';

/** Meta: the leanings switched on for scenic routes (SR1). Unset, all three are on. */
export const ROUTE_LEANINGS_KEY = 'route_leanings';

/**
 * The walk settings' "Scenic routes" switches (SR1): green, sights, streets with life, all on by
 * default, kept in meta. The store changes first, so the drawer and the next Go here agree at once.
 */
export function createRouteLeanings(p: Pick<Ports, 'db'>) {
  const store = createStore<readonly Leaning[]>(LEANINGS);
  return {
    store,
    async load(): Promise<void> {
      const raw = await p.db.getMeta(ROUTE_LEANINGS_KEY).catch(() => null);
      let v: unknown = null;
      try {
        v = raw ? JSON.parse(raw) : null;
      } catch {
        v = null;
      }
      if (!Array.isArray(v)) v = null;
      // An empty list is "all off"; only an unreadable value, or one with nothing known in it, is the default.
      const list = v as unknown[] | null;
      store.set(list == null ? LEANINGS : list.length === 0 ? [] : leaningsIn(list).length ? leaningsIn(list) : LEANINGS);
    },
    async save(leanings: readonly Leaning[]): Promise<void> {
      const kept = leaningsIn(leanings);
      store.set(kept);
      await p.db.setMeta(ROUTE_LEANINGS_KEY, JSON.stringify(kept));
    },
  };
}
