// @layer adapter
import type { LngLat } from '../types';
import type { BuildingPiece, PlaceIn } from './types';

/*
 * Overture's `buildings` and `places` tiles (CX15): the only file that knows their schema. A building with a name is a piece;
 * its geometry is kept exactly as the tile gave it (CX2). Reading the tiles is `overtureReader.ts`.
 */
export type TileFeatureIn = { id?: string | number; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> | null };

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The named buildings of one z14 `buildings` tile, as the decoder gives them (`toGeoJSON`). */
export function piecesFromBuildingsTile(x: number, y: number, features: TileFeatureIn[]): BuildingPiece[] {
  const out: BuildingPiece[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const name = text(p['@name']);
    const id = text(p.id) ?? (f.id != null ? String(f.id) : null);
    if (!name || !id) continue;
    const g = f.geometry;
    const polygons = g.type === 'Polygon' ? [g.coordinates as LngLat[][]] : g.type === 'MultiPolygon' ? (g.coordinates as LngLat[][][]) : null;
    if (!polygons) continue;
    out.push({ id, name, subtype: text(p.subtype), class: text(p.class), tile: [x, y], polygons });
  }
  return out;
}

/** The places of one `places` tile (`taxonomy.hierarchy` parsed), as the rule reads them. */
export function placesFromPlacesTile(features: TileFeatureIn[]): PlaceIn[] {
  const out: PlaceIn[] = [];
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const c = f.geometry.coordinates as LngLat;
    if (!Number.isFinite(c?.[0]) || !Number.isFinite(c?.[1])) continue;
    let tax: unknown = f.properties?.taxonomy;
    if (typeof tax === 'string') {
      try { tax = JSON.parse(tax); } catch { tax = null; }
    }
    const h = (tax as { hierarchy?: unknown } | null)?.hierarchy;
    out.push({ at: [c[0], c[1]], hierarchy: Array.isArray(h) ? h.map(String) : [] });
  }
  return out;
}
