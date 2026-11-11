// @layer core
import type { LngLat } from '../types';
import type { PlacePoint } from './cells';
import type { WayFacts } from './types';

/*
 * What is measured of the ground around an area's middle (specs/place-form PF3, PF4, PF8, PF17), from the tiles already read plus the buildings. Pure.
 * Nothing here is shown: the measures only feed `placeForm`. Not built yet (tests first).
 */

/** What was read around a centre: the tiles (by key), and everything in them. A null `places` or `buildings` means the read failed (PF17). */
export interface RingRead {
  at: LngLat;
  radiusM: number;
  /** The keys of the z14 tiles that were read. */
  tilesRead: readonly string[];
  ways: readonly WayFacts[];
  junctions: readonly LngLat[];
  places: readonly PlacePoint[] | null;
  buildings: readonly LngLat[] | null;
}

export interface Measures {
  /** Metres of local street and arterial inside the ring. */
  streetM: number;
  placesPerKm2: number;
  junctionsPerKm2: number;
  buildingsPerKm2: number;
  /** Motorway and trunk over all street length, 0 to 1. */
  highwayShare: number;
  /** The largest chain of places, each within 80 m of the next, as a share of the places, 0 to 1. */
  chainShare: number;
  /** The longest distance between two places of that chain, in metres. */
  chainSpanM: number;
}

/** The measures of the ring, or null when it cannot be said: a tile unread, under 300 m of street, or places or buildings not read (PF8, PF17). */
export function measureRing(_read: RingRead): Measures | null {
  throw new Error('not built: specs/place-form PF4');
}
