// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { DEFAULT_BUDGET_M, DEFAULT_PREF, isPref, type WalkabilityPref } from './settings';

/*
 * The kind walk's two settings (KW8, KW11), kept in meta `kindwalk_budget` (metres) and `kindwalk_pref`. A shell with a Store
 * the views read, so the panel and the Start dialog change together. These are the only things the kind walk stores (KW14).
 */

export interface KindWalkPrefs {
  budgetM: number;
  pref: WalkabilityPref;
}

export interface KindWalkPrefsStore {
  store: Store<KindWalkPrefs>;
  load(): Promise<void>;
  setBudget(m: number): Promise<void>;
  setPref(p: WalkabilityPref): Promise<void>;
}

export function createKindWalkPrefs(p: Pick<Ports, 'db'>): KindWalkPrefsStore {
  const store = createStore<KindWalkPrefs>({ budgetM: DEFAULT_BUDGET_M, pref: DEFAULT_PREF });
  return {
    store,
    async load() {
      const [b, f] = await Promise.all([p.db.getMeta('kindwalk_budget').catch(() => null), p.db.getMeta('kindwalk_pref').catch(() => null)]);
      const n = Number(b);
      store.set({ budgetM: b && Number.isFinite(n) && n > 0 ? n : DEFAULT_BUDGET_M, pref: isPref(f) ? f : DEFAULT_PREF });
    },
    // The store first, so the panel redraws at once, then kept.
    async setBudget(m) {
      store.set({ ...store.get(), budgetM: m });
      await p.db.setMeta('kindwalk_budget', String(m)).catch(() => {});
    },
    async setPref(pref) {
      store.set({ ...store.get(), pref });
      await p.db.setMeta('kindwalk_pref', pref).catch(() => {});
    },
  };
}
