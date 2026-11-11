// @layer core
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { LngLat } from '../types';

/*
 * Overture's buildings, reduced to a centroid each (specs/place-form PF3): the place-form rule counts buildings per km², nothing more, so no footprint,
 * height or name is kept. A building near a tile's edge is in both tiles: once by its id (the rounded centroid). Pure.
 */

const Z = 14;

export interface BuildingPoint {
  /** The centroid rounded to about 10 cm, so the same building from two tiles is one. */
  id: string;
  at: LngLat;
}

/** A z14 tile's `building` layer as centroids (the mean of the outer ring's corners). Nothing but polygons is a building; no layer is an empty tile. */
export function buildingsFromTile(bytes: ArrayBuffer, x: number, y: number): BuildingPoint[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.building;
  if (!layer) return [];
  const out: BuildingPoint[] = [];
  for (let i = 0; i < layer.length; i++) {
    const g = layer.feature(i).toGeoJSON(x, y, Z).geometry;
    const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null;
    if (!ring || ring.length < 3) continue;
    let sx = 0;
    let sy = 0;
    for (const c of ring) {
      sx += c[0];
      sy += c[1];
    }
    const at: LngLat = [sx / ring.length, sy / ring.length];
    out.push({ id: `${at[0].toFixed(6)},${at[1].toFixed(6)}`, at });
  }
  return out;
}
