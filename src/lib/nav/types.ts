// @layer core
import type { LngLat } from '../types';
import type { Leaning } from './scenic';

/**
 * Navigation's contract. A destination is a Waypoint; a RouteSource turns two
 * points into a walking Route, or says it can't. The navigator knows only
 * these, so a later source (suggested spots, downloaded regions) plugs in
 * without changing it (criterion N15).
 */
export interface Waypoint {
  at: LngLat;
  label: string;
  kind: 'start' | 'capture' | 'point' | 'place' | 'find';
  /** A checklist place (E12): its key, so the bar can show its name once it is revealed. */
  placeKey?: string;
  /**
   * Stops to pass on the way, in order, before `at` (a suggested kind walk, KW5): the route is made leg by leg through them.
   * Not a destination of their own: arrival is at `at`.
   */
  via?: LngLat[];
  /**
   * A way the app suggested (decision 0101): it says distance only, never a time left (KW7b). On the destination, which is
   * cleared with the walk, never on the walk.
   */
  suggested?: boolean;
  /** A loop (the walk planner, WP8): `at` is where it began, so it arrives only once the stops are passed (WP9). */
  loop?: boolean;
  /** The way the planner planned, from where the walker stood: followed as it is, not made again by the shortest streets (WP20, KW17). */
  path?: LngLat[];
  /** The scenic route chosen for the way there (SR8, SR11); none is the direct way. */
  leanings?: Leaning[];
}

export interface Route {
  path: LngLat[];
  lengthM: number;
  /** The RouteSource id that made it. */
  source: string;
}

/** What is known about the walker at `from`, beyond the point. */
export interface RouteHint {
  /** The way you are walking, degrees clockwise from north (headingOf); null standing still. */
  heading?: number | null;
}

export interface RouteSource {
  id: string;
  /** A walking route from `from` to `to`, or null when this source has none. */
  route(from: LngLat, to: LngLat, hint?: RouteHint): Route | null;
}
