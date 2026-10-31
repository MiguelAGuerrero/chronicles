import { distanceM, pointSegmentDist, projector } from '../geo';
import type { LngLat } from '../types';
import { NAV } from './rules';
import type { Route, RouteSource, Waypoint } from './types';

export { NAV };

/** Further than NAV.maxM in a straight line: not a walk (N5). */
export const tooFar = (from: LngLat, to: LngLat) => distanceM(from, to) > NAV.maxM;

/**
 * A route from the first source that has one, or the reason there is none
 * (N3-N5). Sources are tried in order: walk me back puts the trace first.
 */
export function routeTo(sources: RouteSource[], from: LngLat, to: LngLat): { route: Route | null; reason?: string } {
  if (tooFar(from, to)) return { route: null, reason: 'Too far to walk from here' };
  for (const s of sources) {
    const route = s.route(from, to);
    if (route) return { route };
  }
  return { route: null, reason: 'No walking route here' };
}

/** How far is left along the path from where you are, and how far off it you are (N7, N8). */
export function progressOn(path: LngLat[], at: LngLat): { leftM: number; offM: number } {
  if (path.length < 2) return { leftM: path[0] ? distanceM(at, path[0]) : 0, offM: path[0] ? distanceM(at, path[0]) : 0 };
  const proj = projector(at);
  const xy = path.map(proj);
  let best = { i: 1, t: 0, d: Infinity };
  for (let i = 1; i < xy.length; i++) {
    const d = pointSegmentDist([0, 0], xy[i - 1], xy[i]);
    if (d < best.d) {
      const [ax, ay] = xy[i - 1];
      const [bx, by] = xy[i];
      const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
      const t = len2 ? Math.max(0, Math.min(1, (-ax * (bx - ax) - ay * (by - ay)) / len2)) : 0;
      best = { i, t, d };
    }
  }
  const segLen = (i: number) => distanceM(path[i - 1], path[i]);
  let left = segLen(best.i) * (1 - best.t);
  for (let i = best.i + 1; i < path.length; i++) left += segLen(i);
  return { leftM: left, offM: best.d };
}

export interface NavState {
  dest: Waypoint;
  route: Route;
  /** When it last re-routed (null: not yet, so the first re-route is at once). */
  reroutedAt: number | null;
  leftM: number;
  offCount: number;
  offRoute: boolean;
  arrived: boolean;
}

export function startNav(dest: Waypoint, route: Route, _now: number): NavState {
  return { dest, route, reroutedAt: null, leftM: route.lengthM, offCount: 0, offRoute: false, arrived: false };
}

/**
 * One accepted fix while navigating: distance left, off-route after
 * NAV.offFixes fixes in a row further than NAV.offM (re-routing at most every
 * NAV.rerouteMs), and arrival within NAV.arriveM (N7-N9).
 */
export function navStep(state: NavState, at: LngLat, now: number): { state: NavState; reroute: boolean } {
  if (distanceM(at, state.dest.at) <= NAV.arriveM) return { state: { ...state, arrived: true, leftM: 0, offRoute: false }, reroute: false };
  const p = progressOn(state.route.path, at);
  const off = p.offM > NAV.offM;
  const offCount = off ? state.offCount + 1 : 0;
  const offRoute = offCount >= NAV.offFixes;
  const reroute = offRoute && (state.reroutedAt == null || now - state.reroutedAt >= NAV.rerouteMs);
  return { state: { ...state, leftM: p.leftM, offCount, offRoute, reroutedAt: reroute ? now : state.reroutedAt }, reroute };
}
