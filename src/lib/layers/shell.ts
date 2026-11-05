// @layer shell
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import { decodeLayers, encodeLayers, layerDefaults, type LayerState } from './state';

/*
 * The layers' state (ML5, ML7): one setting for every map, kept in meta `map_layers`. Until it is loaded the
 * defaults show. The factory takes its ports so a Node test runs it with fakes; the app's instance is `./index`.
 */

export interface Layers {
  store: Store<{ on: LayerState; loaded: boolean; open: boolean }>;
  /** Reads the saved setting (and the old `walk_layer` once). */
  load(): Promise<void>;
  /** The store first, so every map redraws at once, then kept. */
  set(id: string, on: boolean): Promise<void>;
  /** The panel (ML4): open on the Layers button, closed on it again, and by a tap on the map (a screen calls `closePanel`). */
  togglePanel(): void;
  closePanel(): void;
}

export function createLayers(p: Pick<Ports, 'db'>): Layers {
  const store = createStore({ on: layerDefaults(), loaded: false, open: false });
  return {
    store,
    async load() {
      const [raw, legacy] = await Promise.all([p.db.getMeta('map_layers').catch(() => null), p.db.getMeta('walk_layer').catch(() => null)]);
      store.set((s) => ({ ...s, on: decodeLayers(raw, legacy), loaded: true }));
    },
    async set(id, on) {
      const next = { ...store.get().on, [id]: on };
      store.set((s) => ({ ...s, on: next }));
      await p.db.setMeta('map_layers', encodeLayers(next)).catch(() => {});
    },
    togglePanel() {
      store.set((s) => ({ ...s, open: !s.open }));
    },
    closePanel() {
      store.set((s) => (s.open ? { ...s, open: false } : s));
    },
  };
}
