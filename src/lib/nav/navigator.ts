// @layer core
import { bearingDeg, distanceM, pointSegmentDist, projector } from '../geo';
import type { LngLat } from '../types';
import { NAV } from './rules';
import type { Route, RouteHint, RouteSource, Waypoint } from './types';

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
export function routeTo(
  sources: RouteSource[],
  from: LngLat,
  to: LngLat,
  pick: 'first' | 'shortest' = 'first',
  hint?: RouteHint,
): { route: Route | null; reason?: string } {
  if (tooFar(from, to)) return { route: null, reason: 'Too far to walk from here' };
  let best: Route | null = null;
  for (const s of sources) {
    const route = s.route(from, to, hint);
    if (!route) continue;
    if (pick === 'first') return { route };
    if (!best || route.lengthM < best.lengthM * SHORTER_BY) best = route;
  }
  if (best) return { route: best };
  // The streets read reach only so far around both ends: "nearby" keeps that honest.
  return { route: null, reason: 'No walking route found nearby' };
}

/**
 * A route through `via` in order and on to `to` (a suggested kind walk, KW5): `routeTo` for each leg, the paths joined. Any
 * leg without a route is no route, with its reason.
 */
export function routeVia(
  sources: RouteSource[],
  from: LngLat,
  via: readonly LngLat[],
  to: LngLat,
  pick: 'first' | 'shortest' = 'first',
  hint?: RouteHint,
): { route: Route | null; reason?: string } {
  if (!via.length) return routeTo(sources, from, to, pick, hint);
  const path: LngLat[] = [];
  let lengthM = 0;
  let source = '';
  let at = from;
  for (const next of [...via, to]) {
    const leg = routeTo(sources, at, next, pick, path.length ? undefined : hint);
    if (!leg.route) return leg;
    path.push(...(path.length ? leg.route.path.slice(1) : leg.route.path));
    lengthM += leg.route.lengthM;
    source = leg.route.source;
    at = next;
  }
  return { route: { path, lengthM, source } };
}

/**
 * How many of a route's stops the walker has passed (WP25): those they came within a few arrivals of, and those they have gone by
 * along the route, so a stop skipped on the way is let go and does not pull the re-route back. Never fewer than `already`.
 */
export function passedStops(path: LngLat[], stops: readonly LngLat[], here: LngLat, already = 0, seg?: number): number {
  let n = already;
  const me = progressOn(path, here, seg);
  while (n < stops.length) {
    if (distanceM(here, stops[n]) <= NAV.arriveM * 4) {
      n += 1;
      continue;
    }
    const stopLeft = progressOn(path, stops[n]).leftM;
    if (me.offM <= NAV.offM * 2 && me.leftM < stopLeft - 60) {
      n += 1;
      continue;
    }
    break;
  }
  return n;
}

/** The stops of `via` still ahead: those after the last one the walker has come within `passedM` of. */
export function viaAhead(via: readonly LngLat[], passed: number): LngLat[] {
  return via.slice(Math.max(0, Math.min(passed, via.length)));
}

/** How far is left along the path from where you are, and how far off it you are (N7, N8). */
export function progressOn(path: LngLat[], at: LngLat, fromSeg = 1): { leftM: number; offM: number; seg: number; t: number } {
  if (path.length < 2) return { leftM: path[0] ? distanceM(at, path[0]) : 0, offM: path[0] ? distanceM(at, path[0]) : 0, seg: 1, t: 0 };
  const proj = projector(at);
  const xy = path.map(proj);
  let best = { i: 1, t: 0, d: Infinity };
  // A path that touches itself (a loop begins and ends at one point) is searched from the segment last matched, a little back, so the
  // finish is not mistaken for the start (walk planner audit 4).
  for (let i = Math.max(1, fromSeg - 2); i < xy.length; i++) {
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
  return { leftM: left, offM: best.d, seg: best.i, t: best.t };
}

/**
 * A planned way, rejoined (walk planner audit 1): from where the walker is, the shortest way to the nearest point on the planned path,
 * then the rest of the planned path as it was planned, so a loop's way back is not replaced by the streets the way out used.
 */
export function rejoinPlanned(planned: readonly LngLat[], here: LngLat, leg: (a: LngLat, b: LngLat) => Route | null): Route | null {
  if (planned.length < 2) return null;
  const p = progressOn([...planned], here);
  const a = planned[p.seg - 1];
  const b = planned[p.seg];
  const join: LngLat = [a[0] + (b[0] - a[0]) * p.t, a[1] + (b[1] - a[1]) * p.t];
  const to = distanceM(here, join) < 5 ? null : leg(here, join);
  if (distanceM(here, join) >= 5 && !to) return null;
  const rest = [join, ...planned.slice(p.seg)];
  let lengthM = to ? to.lengthM : 0;
  for (let i = 1; i < rest.length; i++) lengthM += distanceM(rest[i - 1], rest[i]);
  const path = to ? [...to.path, ...rest.slice(1)] : [here, ...rest];
  return { path, lengthM, source: 'planned' };
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
 * How far back along the trace its direction is read. 8 m was too short: a
 * phone's wander carries a few metres sideways for several fixes, and the
 * cone pointed east while the owner walked north (Nov 3). Over 20 m the same
 * wander moves the direction far less (simulated at 5 m of wander: 21% of
 * headings more than 45° off over 8 m, under 2% over 20 m).
 */
export const HEADING_WINDOW_M = 20;

/**
 * The live dot's direction further than this from the trace's is not shown.
 * Tighter than a course: told walking, the dot's filter swings with the wander
 * (simulated at 5 m: 19% of its headings more than 45° off; the cone 5% at
 * 45°, under 1% at 20°).
 */
const DOT_AGREE_DEG = 20;

const agrees = (a: number, b: number, deg = COURSE_AGREE_DEG) => Math.abs(((a - b + 540) % 360) - 180) <= deg;

/**
 * The way you are walking, in degrees clockwise from north. The direction of
 * the last 20 m or more of the trace (HEADING_WINDOW_M), or the device's
 * course while moving when it agrees with the trace within 45° (it turns
 * sooner). A course that disagrees loses: a phone reported east-north-east
 * while the owner walked south (Nov 1). With no trace yet, a course is used,
 * but never Android's 0 for "no bearing". Null while standing still.
 */
export function headingOf(fixes: { t: number; lon: number; lat: number; speed: number | null; course: number | null }[]): number | null {
  const last = fixes[fixes.length - 1];
  if (!last) return null;
  let trace: number | null = null;
  let still = false;
  for (let i = fixes.length - 2; i >= 0; i--) {
    const f = fixes[i];
    const d = distanceM([f.lon, f.lat], [last.lon, last.lat]);
    if (d >= HEADING_WINDOW_M) {
      const dt = (last.t - f.t) / 1000;
      if (dt <= 0 || d / dt < HEADING_MIN_SPEED) still = true;
      else trace = bearingDeg([f.lon, f.lat], [last.lon, last.lat]);
      break;
    }
    if (last.t - f.t > 30_000) break;
  }
  const course = last.course != null && Number.isFinite(last.course) && last.course >= 0 && (last.speed ?? 0) >= HEADING_MIN_SPEED ? last.course : null;
  if (trace != null) return course != null && agrees(course, trace) ? course : trace;
  if (still) return null;
  return course != null && course !== 0 ? course : null;
}

/**
 * The cone's direction, from the live dot's (`dot`: per fix, null while it
 * holds still) and the trace's (`trace`: headingOf). The dot turns sooner, so
 * it is shown where it agrees with the trace within 20°; otherwise the trace
 * wins. The dot alone was once drawn, and pointed east while the owner walked
 * north (Nov 3). Hidden while the dot holds still or there is no trace yet.
 */
export function coneHeading(dot: number | null, trace: number | null): number | null {
  if (dot == null || trace == null) return null;
  return agrees(dot, trace, DOT_AGREE_DEG) ? dot : trace;
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
  /** The segment of the route last matched, for a loop (a path that touches itself): progress follows the walker's order. */
  seg?: number;
}

export function startNav(dest: Waypoint, route: Route, _now: number): NavState {
  return { dest, route, reroutedAt: null, leftM: route.lengthM, offCount: 0, offRoute: false, arrived: false };
}

/**
 * One accepted fix while navigating: distance left, off-route after
 * NAV.offFixes fixes in a row further than NAV.offM (re-routing at most every
 * NAV.rerouteMs), and arrival within NAV.arriveM (N7-N9).
 */
export function navStep(state: NavState, at: LngLat, now: number, stopsLeft = 0): { state: NavState; reroute: boolean } {
  // A loop ends where it began: it is not arrived at while stops are still ahead (WP9).
  if (stopsLeft > 0) return stepAlong(state, at, now);
  if (distanceM(at, state.dest.at) <= NAV.arriveM) return { state: { ...state, arrived: true, leftM: 0, offRoute: false }, reroute: false };
  // The end of the route counts too: a spot in a park or a block lies off the streets that reach it.
  const routeEnd = state.route.path.length > 1 ? state.route.path[state.route.path.length - 2] : state.dest.at;
  if (distanceM(at, routeEnd) <= NAV.arriveM) return { state: { ...state, arrived: true, leftM: 0, offRoute: false }, reroute: false };
  return stepAlong(state, at, now);
}

/** Distance left, and off the route after NAV.offFixes fixes in a row: everything but arriving. */
function stepAlong(state: NavState, at: LngLat, now: number): { state: NavState; reroute: boolean } {
  const p = progressOn(state.route.path, at, state.dest.loop ? state.seg : undefined);
  const off = p.offM > NAV.offM;
  const offCount = off ? state.offCount + 1 : 0;
  const offRoute = offCount >= NAV.offFixes;
  const reroute = offRoute && (state.reroutedAt == null || now - state.reroutedAt >= NAV.rerouteMs);
  return { state: { ...state, leftM: p.leftM, offCount, offRoute, reroutedAt: reroute ? now : state.reroutedAt, ...(state.dest.loop ? { seg: p.seg } : {}) }, reroute };
}
