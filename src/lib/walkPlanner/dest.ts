// @layer core
import type { Waypoint } from '../nav/types';
import { planRoutes, type Leg, type PlanInput, type PlannedRoute } from './planner';
import { PRESET_NAMES } from './words';

/*
 * Starting a route (WP19, WP21, WP24). The destination is an ordinary one with its stops and its planned path: nothing marks the
 * walk it starts, only the destination, which is cleared with the walk.
 */

/** The destination for a planned route: a loop ends where it began, a one-way trip at its last stop. */
export function destFor(r: PlannedRoute): Waypoint {
  const stops = r.stops;
  return {
    at: r.loop ? r.path[0] : stops[stops.length - 1],
    label: PRESET_NAMES[r.preset],
    kind: 'point',
    via: r.loop ? stops : stops.slice(0, -1),
    suggested: true,
    ...(r.loop ? { loop: true } : {}),
    path: r.path,
  };
}

/**
 * Start plans again from where the walker stands now, with the same settings (WP24), and takes the route of the same preset;
 * if that preset gives none from here, the route that was highlighted.
 */
export function routeToStart(input: PlanInput, chosen: PlannedRoute, leg: Leg): PlannedRoute {
  const again = planRoutes({ ...input, round: 0, shown: [] }, leg).routes.find((r) => r.preset === chosen.preset);
  return again ?? chosen;
}
