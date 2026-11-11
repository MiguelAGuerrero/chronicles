// @layer adapter
import type { LngLat } from '../types';
import type { BuildingPiece, PlaceIn } from './types';

/*
 * Overture's `buildings` and `places` tiles (CX15): the only file that knows their schema. A building with a name is a piece;
 * its geometry is kept as the tile gave it. The shell reads tiles through the app's own `TileReader`.
 */
type Feature = { id?: string | number; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> | null };

/** The named buildings of one z14 `buildings` tile, as the decoder gives them (`toGeoJSON`). */
export function piecesFromBuildingsTile(_x: number, _y: number, _features: Feature[]): BuildingPiece[] {
  throw new Error('complexes: not implemented');
}
/** The places of one `places` tile (`taxonomy.hierarchy` parsed), as the rule reads them. */
export function placesFromPlacesTile(_features: Feature[]): PlaceIn[] {
  throw new Error('complexes: not implemented');
}
export type { LngLat };
