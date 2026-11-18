// @layer adapter
import type { RoadFeature } from '../streets';
import type { LngLat } from '../types';
import { roadsFromTile, type RoadTileFeature } from './fromTiles';
import { ROAD_RULES } from './rules';
import type { Road, RoadSource } from './types';

/*
 * The map's own tiles as a `RoadSource` (RE4, RE8): the corridor's tiles at the engine's zoom, each decoded for its
 * `transportation` layer alone and cut to its own rectangle. All or nothing: a tile that cannot be read leaves no roads, so a
 * way is never found over half a corridor. What fetches and what decodes are given, so a test reads no network.
 */
export interface TileRoadsDeps {
  /** The tiles' bytes at a zoom, in the order asked; rejects when any cannot be read. */
  bodies(tiles: [number, number][], zoom: number, shouldStop?: () => boolean): Promise<ArrayBuffer[]>;
  /** One tile's `transportation` features, in lon/lat. */
  decode(bytes: ArrayBuffer, z: number, x: number, y: number): RoadFeature[];
  /** Gives the screen a turn between tiles. */
  pause(): Promise<void>;
}

/** A decoded tile's line features as the engine reads them; a test tile's values are text, so the sense is read as a number. */
export function tileFeatures(features: readonly RoadFeature[]): RoadTileFeature[] {
  const out: RoadTileFeature[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates as LngLat[]] : f.geometry.type === 'MultiLineString' ? (f.geometry.coordinates as LngLat[][]) : null;
    if (!lines || typeof p.class !== 'string') continue;
    out.push({ class: p.class, oneway: p.oneway == null ? null : Number(p.oneway), ramp: p.ramp == null ? null : Number(p.ramp), lines });
  }
  return out;
}

export function createTileRoads(deps: TileRoadsDeps, zoom: number = ROAD_RULES.zoom): RoadSource {
  return {
    async read(tiles, shouldStop) {
      const list = tiles.map(([x, y]) => [x, y] as [number, number]);
      const bodies = await deps.bodies(list, zoom, shouldStop).catch(() => null);
      if (!bodies || shouldStop?.()) return null;
      const roads: Road[] = [];
      for (let i = 0; i < list.length; i++) {
        const [x, y] = list[i];
        try {
          roads.push(...roadsFromTile(tileFeatures(deps.decode(bodies[i], zoom, x, y)), zoom, x, y));
        } catch {
          return null;
        }
        await deps.pause();
        if (shouldStop?.()) return null;
      }
      return roads;
    },
  };
}
