// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { drawFor, tilesAround, type WalkDraw } from './layer';
import { walkBuild, walkReader, walkSwitch } from './walkApp';

/** How far around the centre the layer reads (WK4): a ring, an area card, the walker's neighbourhood. */
export const LAYER_RADIUS_M = 1000;

export type WalkStatus = 'off' | 'reading' | 'ready' | 'unavailable';

export interface Walkability {
  on: boolean;
  status: WalkStatus;
  /** What the map draws; null when off, still reading or nothing could be read. */
  draw: WalkDraw | null;
  toggle(): void;
}

/**
 * The walkability layer for a map centred on `centre` (WK13): off until switched on, then the tiles around
 * it are read (from the device where kept, else Overture, else Overpass; WK1-WK4) and the stretches built
 * around cars are drawn. The switch is one setting for every map. Nothing is read while it is off.
 */
export function useWalkability(centre: LngLat | null): Walkability {
  const on = useStore(walkSwitch.store, (s) => s.on);
  useEffect(() => {
    void walkSwitch.load();
  }, []);
  const tilesKey = centre ? tilesAround(centre, LAYER_RADIUS_M).map((t) => t.join('/')).join(',') : '';
  const [result, setResult] = useState<{ key: string; draw: WalkDraw | null } | null>(null);
  useEffect(() => {
    if (!on || !tilesKey) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      const tiles = tilesKey.split(',').map((t) => t.split('/').map(Number) as [number, number]);
      const read = await walkReader.read(tiles, build ?? 'unknown');
      if (live) setResult({ key: tilesKey, draw: read.tiles.size ? drawFor(read.tiles) : null });
    })();
    return () => {
      live = false;
    };
  }, [on, tilesKey]);
  const here = on && result?.key === tilesKey ? result : null;
  const status: WalkStatus = !on || !tilesKey ? 'off' : !here ? 'reading' : here.draw ? 'ready' : 'unavailable';
  return { on, status, draw: here?.draw ?? null, toggle: () => void walkSwitch.set(!on) };
}
