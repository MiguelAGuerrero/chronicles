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
 * A locality inside another locality is a subdivision, not a town: Allentown's
 * "10th Ward" is a `locality` whose hierarchy runs through Allentown (fix
 * ward-subdivision). Only the `division` points carry the hierarchy, so a
 * piece is dropped by its id when its point, in the same tile, is nested.
 * A nested locality that Overture classes a settlement (a borough such as
 * Coplay, class village) or gives a population (Manhattan in New York) stays
 * a town: the smaller outline wins there (TO2).
 */

/** Overture classes of a locality that is a settlement in its own right. */
const SETTLEMENT_CLASSES = new Set(['megacity', 'city', 'town', 'village']);

/** True when every hierarchy of this division has another locality above it (a ward in a city). */
function nestedLocality(id: string, hierarchies: unknown): boolean {
  let chains: unknown = hierarchies;
  if (typeof chains === 'string') {
    try {
      chains = JSON.parse(chains);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(chains) || !chains.length) return false;
  return chains.every((chain) => {
    if (!Array.isArray(chain)) return false;
    const localities = chain.filter((h): h is { division_id: string; subtype: string } => h?.subtype === 'locality').map((h) => h.division_id);
    return localities.includes(id) && localities[0] !== id;
  });
}

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
  const nested = new Set<string>();
  for (const f of layers.division ?? []) {
    const p = f.properties ?? {};
    const settlement = SETTLEMENT_CLASSES.has(String(p.class)) || Number(p.population) > 0;
    if (p.subtype === 'locality' && typeof p.id === 'string' && !settlement && nestedLocality(p.id, p.hierarchies)) nested.add(p.id);
  }
  for (const f of layers.division_area ?? []) {
    const p = f.properties ?? {};
    const name = p['@name'];
    const id = p.division_id;
    if (p.subtype !== 'locality' || p.class === 'maritime' || typeof name !== 'string' || !name || typeof id !== 'string' || nested.has(id)) continue;
    const polygons = polygonsOf(f.geometry).filter((rings) => rings[0]?.length >= 4);
    if (polygons.length) pieces.push({ id, name, polygons });
  }
  const points: OutlineTile['points'] = [];
  for (const f of layers.division ?? []) {
    const p = f.properties ?? {};
    if (p.subtype !== 'locality' || typeof p.id !== 'string' || nested.has(p.id) || f.geometry.type !== 'Point') continue;
    points.push({ id: p.id, at: f.geometry.coordinates as LngLat });
  }
  return { key: outlineTileKey(x, y, z), z, x, y, release, read_at: readAt, pieces, points, nested: [...nested] };
}
