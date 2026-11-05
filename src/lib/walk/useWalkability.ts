// @layer view
import { useEffect, useState } from 'react';
import type { LngLat } from '../types';
import { cellsFor } from './cells';
import { drawNow, tilesAround, type WalkStatus } from './layer';
import { tintOf, type WalkTint } from './tint';
import { walkBuild, walkPlaces, walkReader } from './walkApp';

/** How far around the centre the layer reads (WK4): enough tiles that a cell's whole neighbourhood is inside them (UF1). */
export const LAYER_RADIUS_M = 1500;

export type { WalkStatus };

export interface Walkability {
  status: WalkStatus;
  /** What the map draws; null when off, still reading or nothing could be read. */
  draw: WalkTint | null;
}

/**
 * The Walkability layer for a map centred on `centre` (specs/walkability-urban-form UF9, UF17): drawn only while `on`
 * (the layer of specs/map-layers). The tiles around it are read (from the device where kept, else Overture, else Overpass)
 * with the places the area already reads, the ground is cut into cells and judged, and the foot and car cells are tinted.
 * Nothing is read while off. The last picture stays while new tiles are read (walkability audit 5).
 */
export function useWalkability(centre: LngLat | null, on: boolean): Walkability {
  const tilesKey = centre ? tilesAround(centre, LAYER_RADIUS_M).map((t) => t.join('/')).join(',') : '';
  const [result, setResult] = useState<{ key: string; draw: WalkTint | null } | null>(null);
  useEffect(() => {
    if (!on || !tilesKey) return;
    let live = true;
    void (async () => {
      const build = await walkBuild().catch(() => null);
      const tiles = tilesKey.split(',').map((t) => t.split('/').map(Number) as [number, number]);
      // A read this screen has moved on from does not queue its remaining tiles (walkability audit 6).
      const read = await walkReader.read(tiles, build ?? 'unknown', () => !live);
      if (!live) return;
      if (!read.tiles.size) return setResult({ key: tilesKey, draw: null });
      const places = await walkPlaces(tiles, () => !live);
      if (live) setResult({ key: tilesKey, draw: tintOf(cellsFor(read.tiles, read.junctions, places)) });
    })();
    return () => {
      live = false;
    };
  }, [on, tilesKey]);
  const { draw, status } = drawNow(on, result, tilesKey);
  return { status, draw };
}
