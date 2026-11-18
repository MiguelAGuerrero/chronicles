// @layer core
import type { LngLat } from '../types';

/*
 * What a map draws for a selected neighborhood (HB9, HB10, HB14, HB15): one line, the same for every
 * neighborhood, polygon or nearest-point share alike, carrying nothing about it: no fill, no name, no
 * figure. The walker's walks, finds and captures never reach it.
 */

/** The ink of the app's text (`theme.ink`), the line of every selection: never an accent, which reads as a win. */
export const GROUND_COLOR = '#1d2430';

/** The line's look: one for every neighborhood, no fill, no input (HB14). */
export const groundStyle = (): { color: string; width: number } => ({ color: GROUND_COLOR, width: 2.5 });

/** The ground as one GeoJSON line feature with no properties (HB10); nothing for no ground. */
export function groundGeoJSON(ground: { polygons: LngLat[][][] } | null): GeoJSON.FeatureCollection {
  const lines = (ground?.polygons ?? []).flatMap((rings) => rings.filter((r) => r.length > 1));
  if (!lines.length) return { type: 'FeatureCollection', features: [] };
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } }] };
}
