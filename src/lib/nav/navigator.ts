import { bearingDeg, distanceM, pointSegmentDist, projector } from '../geo';
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
/** A later source must beat an earlier one by this share to replace it ('shortest'). */
const SHORTER_BY = 0.9;

/**
 * A route from the sources: the first that answers, or with 'shortest' the
 * shortest of them, an earlier source kept unless a later one is clearly
 * shorter. Walk me back uses 'shortest' with the trace first, so it never
 * retraces a detour the streets can skip (the owner's call, Nov 1).
 */
export function routeTo(sources: RouteSource[], from: LngLat, to: LngLat, pick: 'first' | 'shortest' = 'first'): { route: Route | null; reason?: string } {
  if (tooFar(from, to)) return { route: null, reason: 'Too far to walk from here' };
  let best: Route | null = null;
  for (const s of sources) {
    const route = s.route(from, to);
    if (!route) continue;
    if (pick === 'first') return { route };
    if (!best || route.lengthM < best.lengthM * SHORTER_BY) best = route;
  }
  if (best) return { route: best };
  // The streets read reach only so far around both ends: "nearby" keeps that honest.
  return { route: null, reason: 'No walking route found nearby' };
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

/** The route from where you are on it to its end: the part already walked is not drawn. */
export function routeAhead(path: LngLat[], at: LngLat): LngLat[] {
  if (path.length < 2) return path;
  const proj = projector(at);
  const xy = path.map(proj);
  let best = { i: 1, t: 0, d: Infinity };
  for (let i = 1; i < xy.length; i++) {
    const [ax, ay] = xy[i - 1];
    const [bx, by] = xy[i];
    const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = len2 ? Math.max(0, Math.min(1, (-ax * (bx - ax) - ay * (by - ay)) / len2)) : 0;
    const d = Math.hypot(ax + t * (bx - ax), ay + t * (by - ay));
    if (d < best.d) best = { i, t, d };
  }
  const a = path[best.i - 1];
  const b = path[best.i];
  const on: LngLat = [a[0] + (b[0] - a[0]) * best.t, a[1] + (b[1] - a[1]) * best.t];
  return [on, ...path.slice(best.i)];
}

/**
 * Whether the distance left just crossed a step worth saying aloud: every
 * 100 m, every 50 m under 200 m. The bar updates on every fix; a screen
 * reader hears only these.
 */
export function announceStep(prevM: number, leftM: number): boolean {
  if (leftM >= prevM) return false;
  const step = leftM < 200 ? 50 : 100;
  return Math.floor(prevM / step) !== Math.floor(leftM / step);
}

/** Moving slower than this, there is no heading to show. */
const HEADING_MIN_SPEED = 0.5;

/** A device course further than this from the trace's own direction is not believed. */
const COURSE_AGREE_DEG = 45;

/**
 * The way you are walking, in degrees clockwise from north. The direction of
 * the last 8 m or more of the trace, or the device's course while moving when
 * it agrees with the trace within 45° (it turns sooner). A course that
 * disagrees loses: a phone reported east-north-east while the owner walked
 * south (Nov 1). With no trace yet, a course is used, but never Android's 0
 * for "no bearing". Null while standing still.
 */
export function headingOf(fixes: { t: number; lon: number; lat: number; speed: number | null; course: number | null }[]): number | null {
  const last = fixes[fixes.length - 1];
  if (!last) return null;
  let trace: number | null = null;
  let still = false;
  for (let i = fixes.length - 2; i >= 0; i--) {
    const f = fixes[i];
    const d = distanceM([f.lon, f.lat], [last.lon, last.lat]);
    if (d >= 8) {
      const dt = (last.t - f.t) / 1000;
      if (dt <= 0 || d / dt < HEADING_MIN_SPEED) still = true;
      else trace = bearingDeg([f.lon, f.lat], [last.lon, last.lat]);
      break;
    }
    if (last.t - f.t > 30_000) break;
  }
  const course = last.course != null && Number.isFinite(last.course) && last.course >= 0 && (last.speed ?? 0) >= HEADING_MIN_SPEED ? last.course : null;
  if (trace != null) return course != null && Math.abs(((course - trace + 540) % 360) - 180) <= COURSE_AGREE_DEG ? course : trace;
  if (still) return null;
  return course != null && course !== 0 ? course : null;
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
  // The end of the route counts too: a spot in a park or a block lies off the streets that reach it.
  const routeEnd = state.route.path.length > 1 ? state.route.path[state.route.path.length - 2] : state.dest.at;
  if (distanceM(at, routeEnd) <= NAV.arriveM) return { state: { ...state, arrived: true, leftM: 0, offRoute: false }, reroute: false };
  const p = progressOn(state.route.path, at);
  const off = p.offM > NAV.offM;
  const offCount = off ? state.offCount + 1 : 0;
  const offRoute = offCount >= NAV.offFixes;
  const reroute = offRoute && (state.reroutedAt == null || now - state.reroutedAt >= NAV.rerouteMs);
  return { state: { ...state, leftM: p.leftM, offCount, offRoute, reroutedAt: reroute ? now : state.reroutedAt }, reroute };
}
