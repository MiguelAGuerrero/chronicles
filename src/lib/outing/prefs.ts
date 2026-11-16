// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { DEFAULT_CHAINS } from './settings';

/** The outing's one saved setting (QC41), in meta `outing_chains` (as `kindWalk/prefs.ts`): a Store the page reads. */
export interface OutingPrefs {
  chains: boolean;
}

export interface OutingPrefsStore {
  store: Store<OutingPrefs>;
  load(): Promise<void>;
  setChains(on: boolean): Promise<void>;
}

const KEY = 'outing_chains';

export function createOutingPrefs(p: Pick<Ports, 'db'>): OutingPrefsStore {
  const store = createStore<OutingPrefs>({ chains: DEFAULT_CHAINS });
  return {
    store,
    async load() {
      const raw = await p.db.getMeta(KEY).catch(() => null);
      store.set({ chains: raw === '1' ? true : raw === '0' ? false : DEFAULT_CHAINS });
    },
    // The store first, so the switch redraws at once, then kept; a failed write leaves it changed on screen.
    async setChains(on) {
      store.set({ chains: on });
      await p.db.setMeta(KEY, on ? '1' : '0').catch(() => {});
    },
  };
}
