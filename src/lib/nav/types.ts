import type { LngLat } from '../types';

/**
 * Navigation's contract. A destination is a Waypoint; a RouteSource turns two
 * points into a walking Route, or says it can't. The navigator knows only
 * these, so a later source (suggested spots, downloaded regions) plugs in
 * without changing it (criterion N15).
 */
export interface Waypoint {
  at: LngLat;
  label: string;
  kind: 'start' | 'capture' | 'point' | 'place' | 'mark';
  /** A scan's mark: labelled "Mark" until it is revealed, then by its name (S12). */
  markId?: string;
  /** A loop (v1.5, L13): the legs after this one, and where this one sits ("1 of 3"). */
  legs?: Waypoint[];
  leg?: { n: number; of: number };
  /** Reaching it runs a scan there (the landing, L16). */
  scanOnArrive?: boolean;
}

export interface Route {
  path: LngLat[];
  lengthM: number;
  /** The RouteSource id that made it. */
  source: string;
}

export interface RouteSource {
  id: string;
  /** A walking route from `from` to `to`, or null when this source has none. */
  route(from: LngLat, to: LngLat): Route | null;
}
