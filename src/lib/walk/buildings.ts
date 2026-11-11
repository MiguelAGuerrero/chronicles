// @layer shell
import type { Archive } from '../activity/release';
import { TileReader } from '../net/tileReader';
import type { LngLat } from '../types';
import { buildingsFromTile, type BuildingPoint } from './buildingsTile';

/*
 * The buildings of the z14 tiles around an area, for the place-form rule's count (specs/place-form PF3). One release's buildings.pmtiles, read by byte
 * range from the bucket the places and the streets come from, with nothing about the user: the same generic `TileReader` as the places (deadlines, one
 * load per tile, an archive dropped after a failure). Centroids are held in memory only, never stored. Any failure is null, and the rule then says nothing (PF17).
 * Takes its archive opener and the release as arguments, so a test hands it a fake; the app's instance is in `walkApp.ts`.
 */

export const BUILDINGS_TILE_MS = 15_000;
export const BUILDINGS_READ_MS = 20_000;
/** A dense downtown tile holds thousands of buildings: few tiles are kept. */
const KEPT_TILES = 24;

export interface BuildingsReader {
  /** The building centroids in these tiles, or null when they cannot be read in time. */
  read(tiles: [number, number][], shouldStop?: () => boolean): Promise<LngLat[] | null>;
}

export function createBuildingsReader(o: { release: () => Promise<string | null>; open: (release: string) => Archive; tileMs?: number; readMs?: number }): BuildingsReader {
  const reader = new TileReader<BuildingPoint>({ open: o.open, decode: buildingsFromTile, zoom: 14, tileMs: o.tileMs ?? BUILDINGS_TILE_MS, readMs: o.readMs ?? BUILDINGS_READ_MS, cap: KEPT_TILES });
  return {
    async read(tiles, shouldStop) {
      const release = await o.release().catch(() => null);
      if (!release || shouldStop?.()) return null;
      const r = await reader.read(release, tiles, shouldStop);
      return r.ok ? r.items.map((b) => b.at) : null;
    },
  };
}
