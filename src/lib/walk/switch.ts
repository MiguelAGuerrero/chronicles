// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';

/*
 * The walkability layer's switch (WK13, WK20): off by default, one setting for every map, kept in meta
 * `walk_layer`. A shell with a Store the views read.
 */

export interface WalkSwitch {
  store: Store<{ on: boolean }>;
  /** Reads the saved setting; until then the layer is off. */
  load(): Promise<void>;
  set(on: boolean): Promise<void>;
}

export function createWalkSwitch(p: Pick<Ports, 'db'>): WalkSwitch {
  const store = createStore({ on: false });
  return {
    store,
    async load() {
      // '1' on, '0' off: the encoding of the key's codec in lib/meta.ts.
      const v = await p.db.getMeta('walk_layer').catch(() => null);
      store.set({ on: v === '1' });
    },
    async set(on) {
      // The store first, so every map redraws at once, then kept.
      store.set({ on });
      await p.db.setMeta('walk_layer', on ? '1' : '0').catch(() => {});
    },
  };
}
