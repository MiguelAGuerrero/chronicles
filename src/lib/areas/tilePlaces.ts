import type { LngLat } from '../types';
import { AREA_REACH_M } from './rules';
import type { AreaLevel, PlaceCandidate } from './types';

/** A feature as the map hands it over (the OpenMapTiles `place` layer). */
export interface TileFeature {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> | null;
}

/**
 * The OpenMapTiles place classes, and what each is to the app. This table is
 * the only place that knows the tile schema; a different source brings its own.
 * Hamlets, islands and the like are not places a walk is "in".
 */
const CLASSES: Record<string, { level: AreaLevel; reachM: number }> = {
  neighbourhood: { level: 'neighborhood', reachM: AREA_REACH_M.neighborhood },
  suburb: { level: 'neighborhood', reachM: AREA_REACH_M.neighborhood },
  quarter: { level: 'neighborhood', reachM: AREA_REACH_M.neighborhood },
  village: { level: 'town', reachM: AREA_REACH_M.town },
  town: { level: 'town', reachM: AREA_REACH_M.town },
  city: { level: 'town', reachM: AREA_REACH_M.city },
  // New York's boroughs: Harlem is 12 km from the city's own point.
  borough: { level: 'town', reachM: AREA_REACH_M.city },
  state: { level: 'state', reachM: AREA_REACH_M.state },
  country: { level: 'country', reachM: AREA_REACH_M.country },
};

/** Place candidates from the map tiles' place points; one per point, however many tiles carried it. */
export function placesFromTiles(features: TileFeature[]): PlaceCandidate[] {
  const out = new Map<string, PlaceCandidate>();
  for (const f of features) {
    const kind = CLASSES[String(f.properties?.class ?? '')];
    const name = f.properties?.name;
    if (!kind || typeof name !== 'string' || !name || f.geometry.type !== 'Point') continue;
    const at = f.geometry.coordinates as LngLat;
    out.set(`${kind.level}|${name}|${at[0].toFixed(5)}|${at[1].toFixed(5)}`, { level: kind.level, name, at, reachM: kind.reachM });
  }
  return [...out.values()];
}
