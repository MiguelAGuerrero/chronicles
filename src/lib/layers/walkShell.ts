// @layer shell
import type { Ports } from '../ports/types';
import { placesSpansKey, decodeSpans, encodeSpans, toggleSpans } from '../explore/placesSpans';
import { createStore, type Store } from '../store';
import { decodeWalkLayers, encodeLayers, walkLayerDefaults, walkLayersKey, type LayerState } from './state';

/*
 * The live walk's layers (specs/modes-to-layers MD3, MD10, decision 0231): every layer off at the start of every walk, kept
 * for that walk only (meta `walk_layers:<walk>`, so a resumed walk finds its own), never the setting of the maps. Turning
 * Places on or off also keeps the spans it was on (`places_spans:<walk>`), which the replay counts passes within (MD9).
 * The factory takes its ports so a Node test runs it with fakes; the app's instance is `./walkIndex`.
 */

export interface WalkLayers {
  store: Store<{ walkId: string | null; on: LayerState; loaded: boolean; open: boolean }>;
  /** A walk's layers are read (or start off), as the walk screen opens it. */
  begin(walkId: string | null): Promise<void>;
  /** The store first, so the map redraws at once, then kept with the walk. */
  set(id: string, on: boolean): Promise<void>;
  togglePanel(): void;
  closePanel(): void;
}

export function createWalkLayers(p: Pick<Ports, 'db' | 'clock'>): WalkLayers {
  const store = createStore({ walkId: null as string | null, on: walkLayerDefaults(), loaded: false, open: false });
  return {
    store,
    async begin(walkId) {
      if (store.get().walkId === walkId && store.get().loaded) return;
      store.set((s) => ({ ...s, walkId, on: walkLayerDefaults(), loaded: !walkId }));
      if (!walkId) return;
      const raw = await p.db.getMeta(walkLayersKey(walkId)).catch(() => null);
      // A walk opened meanwhile is not overwritten by a read that finished late.
      if (store.get().walkId === walkId) store.set((s) => ({ ...s, on: decodeWalkLayers(raw), loaded: true }));
    },
    async set(id, on) {
      const walkId = store.get().walkId;
      if (!walkId) return;
      const next = { ...store.get().on, [id]: on };
      store.set((s) => ({ ...s, on: next }));
      await p.db.setMeta(walkLayersKey(walkId), encodeLayers(next)).catch(() => {});
      if (id === 'places') {
        const spans = decodeSpans(await p.db.getMeta(placesSpansKey(walkId)).catch(() => null));
        const after = toggleSpans(spans, on, p.clock.now());
        if (after !== spans) await p.db.setMeta(placesSpansKey(walkId), encodeSpans(after)).catch(() => {});
      }
    },
    togglePanel() {
      store.set((s) => ({ ...s, open: !s.open }));
    },
    closePanel() {
      store.set((s) => (s.open ? { ...s, open: false } : s));
    },
  };
}
