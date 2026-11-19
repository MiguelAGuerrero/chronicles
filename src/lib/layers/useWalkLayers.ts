// @layer view
import { useCallback, useEffect } from 'react';
import { useStore } from '../useStore';
import type { LayerState } from './state';
import { walkLayers } from './walkIndex';

/**
 * What is on for this walk, and how to switch it (specs/modes-to-layers MD3, MD10): the same shape as `useLayers`, for the live
 * walk's own layers, which start off with every walk. The walk screen passes its walk's id; the caller calls `closePanel`
 * from its map's press.
 */
export function useWalkLayers(walkId: string | null): { on: LayerState; loaded: boolean; open: boolean; toggle: (id: string) => void; togglePanel: () => void; closePanel: () => void } {
  useEffect(() => {
    void walkLayers.begin(walkId);
  }, [walkId]);
  const on = useStore(walkLayers.store, (s) => s.on);
  const loaded = useStore(walkLayers.store, (s) => s.loaded);
  const open = useStore(walkLayers.store, (s) => s.open);
  const toggle = useCallback((id: string) => void walkLayers.set(id, !walkLayers.store.get().on[id]), []);
  return { on, loaded, open, toggle, togglePanel: walkLayers.togglePanel, closePanel: walkLayers.closePanel };
}
