import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { CollectedFeatures } from '../../components/map/types';
import type { RoadFeature } from '../streets';

const LAYERS = { roads: 'transportation', names: 'transportation_name', places: 'place', pois: 'poi' } as const;

/**
 * One vector tile decoded without the map (A11): the background location
 * task can't move a camera, so it reads tiles itself. The same layers as the
 * map's reads, as GeoJSON in lon/lat, tagged with the tile's zoom.
 */
export function decodeTile(bytes: Uint8Array | ArrayBuffer, z: number, x: number, y: number): CollectedFeatures {
  const tile = new VectorTile(new PbfReader(bytes));
  const read = (name: string): RoadFeature[] => {
    const layer = tile.layers[name];
    if (!layer) return [];
    const out: RoadFeature[] = [];
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i).toGeoJSON(x, y, z);
      out.push({ geometry: f.geometry as RoadFeature['geometry'], properties: (f.properties ?? {}) as Record<string, unknown>, zoom: z });
    }
    return out;
  };
  return { roads: read(LAYERS.roads), names: read(LAYERS.names), places: read(LAYERS.places), pois: read(LAYERS.pois), complete: true };
}
