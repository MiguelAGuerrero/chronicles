// @layer view
import { useEffect } from 'react';
import { useLayers } from './useLayers';
import { walkLayers } from './walkIndex';

/**
 * The walk screen's layers (decision 0260): the one setting every map shares, so the walk starts with what the ready map
 * shows and a switch on the walk is remembered. The walk screen passes its walk's id, so the spans Places is on during the
 * walk are kept for its replay (MD9); the caller calls `closePanel` from its map's press.
 */
export function useWalkLayers(walkId: string | null): ReturnType<typeof useLayers> {
  useEffect(() => {
    void walkLayers.begin(walkId);
  }, [walkId]);
  return useLayers();
}
