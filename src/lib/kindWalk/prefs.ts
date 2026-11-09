// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { DEFAULT_DENSITY, DEFAULT_MODE, isDensity, isMode, type Density, type Mode } from '../walkPlanner/settings';
import { DEFAULT_BUDGET_M, DEFAULT_PREF, isPref, type WalkabilityPref } from './settings';

/*
 * The kind walk's two settings (KW8, KW11), kept in meta `kindwalk_budget` (metres) and `kindwalk_pref`. A shell with a Store
 * the views read, so the panel and the Start dialog change together. These are the only things the kind walk stores (KW14).
 */

export interface KindWalkPrefs {
  budgetM: number;
  pref: WalkabilityPref;
  /** The walk planner's mode and density (WP8, WP11), kept beside the kind walk's two settings (WP27). */
  mode: Mode;
  density: Density;
}

export interface KindWalkPrefsStore {
  store: Store<KindWalkPrefs>;
  load(): Promise<void>;
  setBudget(m: number): Promise<void>;
  setPref(p: WalkabilityPref): Promise<void>;
  setMode(m: Mode): Promise<void>;
  setDensity(d: Density): Promise<void>;
}

export function createKindWalkPrefs(p: Pick<Ports, 'db'>): KindWalkPrefsStore {
  const store = createStore<KindWalkPrefs>({ budgetM: DEFAULT_BUDGET_M, pref: DEFAULT_PREF, mode: DEFAULT_MODE, density: DEFAULT_DENSITY });
  return {
    store,
    async load() {
      const [b, f, m, d] = await Promise.all([
        p.db.getMeta('kindwalk_budget').catch(() => null),
        p.db.getMeta('kindwalk_pref').catch(() => null),
        p.db.getMeta('kindwalk_mode').catch(() => null),
        p.db.getMeta('kindwalk_density').catch(() => null),
      ]);
      const n = Number(b);
      store.set({ budgetM: b && Number.isFinite(n) && n > 0 ? n : DEFAULT_BUDGET_M, pref: isPref(f) ? f : DEFAULT_PREF, mode: isMode(m) ? m : DEFAULT_MODE, density: isDensity(d) ? d : DEFAULT_DENSITY });
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
    async setMode(mode) {
      store.set({ ...store.get(), mode });
      await p.db.setMeta('kindwalk_mode', mode).catch(() => {});
    },
    async setDensity(density) {
      store.set({ ...store.get(), density });
      await p.db.setMeta('kindwalk_density', density).catch(() => {});
    },
  };
}
