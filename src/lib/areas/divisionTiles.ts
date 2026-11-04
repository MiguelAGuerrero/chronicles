// @layer core
import type { LngLat } from '../types';
import { OUTLINE_ZOOM, outlineTileKey, type OutlinePiece, type OutlineTile } from './outlines';
import type { TileFeature } from './tilePlaces';

/*
 * Overture Maps' divisions theme (TO1-TO4): the only file that knows its
 * schema. A `division_area` of subtype `locality` on land is a town's border,
 * cut at the tile's edge; a `division` point of the same subtype is the
 * town's own point, joined by `division_id`. Counties, regions and countries
 * are left to the boundary pack, and neighborhood areas are not used: they
 * are mostly districts ("Manhattan Community Board 5"), not neighborhoods.
 */

const polygonsOf = (g: TileFeature['geometry']): LngLat[][][] =>
  g.type === 'Polygon' ? [g.coordinates as LngLat[][]] : g.type === 'MultiPolygon' ? (g.coordinates as LngLat[][][]) : [];

/** One divisions tile's towns, from its two layers' features as the decoder gives them (`toGeoJSON`). */
export function outlineTileFrom(
  x: number,
  y: number,
  release: string,
  readAt: number,
  layers: { division_area?: TileFeature[]; division?: TileFeature[] },
  z: number = OUTLINE_ZOOM,
): OutlineTile {
  const pieces: OutlinePiece[] = [];
  for (const f of layers.division_area ?? []) {
    const p = f.properties ?? {};
    const name = p['@name'];
    const id = p.division_id;
    if (p.subtype !== 'locality' || p.class === 'maritime' || typeof name !== 'string' || !name || typeof id !== 'string') continue;
    const polygons = polygonsOf(f.geometry).filter((rings) => rings[0]?.length >= 4);
    if (polygons.length) pieces.push({ id, name, polygons });
  }
  const points: OutlineTile['points'] = [];
  for (const f of layers.division ?? []) {
    const p = f.properties ?? {};
    if (p.subtype !== 'locality' || typeof p.id !== 'string' || f.geometry.type !== 'Point') continue;
    points.push({ id: p.id, at: f.geometry.coordinates as LngLat });
  }
  return { key: outlineTileKey(x, y, z), z, x, y, release, read_at: readAt, pieces, points };
}
