// @layer view
import { useCallback, useEffect } from 'react';
import { useStore } from '../useStore';
import { layers } from './index';
import type { LayerState } from './state';

/**
 * What is on, and how to switch it (ML5, ML7): one setting for every map, loaded when the first map mounts. The caller
 * calls `closePanel` from its map's press, so a tap on the map closes the panel (ML4).
 */
export function useLayers(): { on: LayerState; loaded: boolean; open: boolean; toggle: (id: string) => void; togglePanel: () => void; closePanel: () => void } {
  useEffect(() => {
    void layers.load();
  }, []);
  const on = useStore(layers.store, (s) => s.on);
  const loaded = useStore(layers.store, (s) => s.loaded);
  const open = useStore(layers.store, (s) => s.open);
  const toggle = useCallback((id: string) => void layers.set(id, !layers.store.get().on[id]), []);
  return { on, loaded, open, toggle, togglePanel: layers.togglePanel, closePanel: layers.closePanel };
}
