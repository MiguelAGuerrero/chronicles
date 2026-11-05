// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { drawFor, drawNow, tilesAround, type WalkDraw, type WalkStatus } from './layer';
import { walkBuild, walkReader } from './walkApp';

/** How far around the centre the layer reads (WK4): a ring, an area card, the walker's neighbourhood. */
export const LAYER_RADIUS_M = 1000;

export type { WalkStatus };

export interface Walkability {
  status: WalkStatus;
  /** What the map draws; null when off, still reading or nothing could be read. */
  draw: WalkDraw | null;
}

/**
 * The walkability layer for a map centred on `centre` (WK13): drawn only while `on` (the Walkability layer of specs/map-layers), then the tiles around
 * it are read (from the device where kept, else Overture, else Overpass; WK1-WK4) and the stretches built
 * around cars are drawn. The switch is one setting for every map. Nothing is read while it is off.
 */
export function useWalkability(centre: LngLat | null, on: boolean): Walkability {
  const tilesKey = centre ? tilesAround(centre, LAYER_RADIUS_M).map((t) => t.join('/')).join(',') : '';
  const [result, setResult] = useState<{ key: string; draw: WalkDraw | null } | null>(null);
  useEffect(() => {
    if (!on || !tilesKey) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      const tiles = tilesKey.split(',').map((t) => t.split('/').map(Number) as [number, number]);
      // A read this screen has moved on from does not queue its remaining tiles (walkability audit 6).
      const read = await walkReader.read(tiles, build ?? 'unknown', () => !live);
      if (live) setResult({ key: tilesKey, draw: read.tiles.size ? drawFor(read.tiles) : null });
    })();
    return () => {
      live = false;
    };
  }, [on, tilesKey]);
  // The last drawing stays while the tiles for a new centre are read (walkability audit 5).
  const { draw, status } = drawNow(on, result, tilesKey);
  return { status, draw };
}
