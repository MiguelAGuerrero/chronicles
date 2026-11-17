// @layer core
import { boundsOf, type Bounds } from '../geo';
import type { LngLat } from '../types';
import type { Outing } from './plan';

/**
 * What the outing's map is given (QC24): the route and plain points for the stops. It has no field for a label, a name or a place's
 * kind, so nothing here can say what a stop is; the basemap's own labels are the map style's concern.
 */
export interface OutingMap {
  route: LngLat[] | null;
  /** The stops, plain and unlabelled. */
  pins: LngLat[];
  fit: Bounds | null;
}

export function outingMap(o: Outing | null): OutingMap {
  if (!o) return { route: null, pins: [], fit: null };
  return { route: o.path, pins: o.stops.map((s) => s.at), fit: boundsOf(o.path, 40) };
}
