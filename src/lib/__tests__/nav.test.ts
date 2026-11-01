/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, stepToward } from '../geo';
import { announceStep, headingOf, NAV, navStep, progressOn, routeAhead, routeTo, startNav, tooFar } from '../nav/navigator';
import { streetRouteSource } from '../nav/streetRoute';
import { traceRouteSource } from '../nav/traceRoute';
import type { RouteSource } from '../nav/types';
import { deriveSegments, type RoadFeature } from '../streets';
import type { LngLat, TracePoint } from '../types';

// Slice 4 of v0.5 (navigate; walk me back is one use), written from criteria
// N1-N15 before the code. Routes are computed from in-memory sources only.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

function walk(path: LngLat[], t0 = 0): TracePoint[] {
  const pts: TracePoint[] = [{ walk_id: 'w', t: t0, lon: path[0][0], lat: path[0][1], accuracy_m: 8, speed: 1.4, course: null }];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 7);
      t += 5000;
      pts.push({ walk_id: 'w', t, lon: pos[0], lat: pos[1], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}
const pathLength = (p: LngLat[]) => p.slice(1).reduce((d, q, i) => d + distanceM(p[i], q), 0);
/** Shortest distance from p to the polyline. */
function offLine(p: LngLat, line: LngLat[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    for (let k = 0; k <= 20; k++) {
      const f = k / 20;
      best = Math.min(best, distanceM(p, [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f]));
    }
  }
  return best;
}

test('nav: walk me back runs from where you stand back along the trace to the start (N1)', () => {
  const trace = walk([at(0, 0), at(3, 0), at(3, 2)]);
  const src = traceRouteSource(trace, []);
  const here = at(3, 2);
  const r = src.route(here, at(0, 0))!;
  assert.ok(r, 'a route');
  assert.ok(distanceM(r.path[0], here) < 15, 'starts where you stand');
  assert.ok(distanceM(r.path.at(-1)!, at(0, 0)) < 1, 'ends at the start');
  assert.ok(Math.abs(r.lengthM - 500) < 25, `about 500 m back, got ${Math.round(r.lengthM)}`);
  assert.equal(r.source, src.id);
});

test('nav: a loop in the trace is skipped, staying on walked ground (N2)', () => {
  // Out east, a 400 m loop around a block that returns to the same corner, then on north.
  const trace = walk([at(0, 0), at(2, 0), at(2, 1), at(3, 1), at(3, 0), at(2.05, 0), at(2.05, -2)]);
  const src = traceRouteSource(trace, []);
  const r = src.route(at(2.05, -2), at(0, 0))!;
  assert.ok(r.lengthM < pathLength(trace.map((p): LngLat => [p.lon, p.lat])), 'never longer than the trace');
  assert.ok(r.lengthM < 450, `the loop is cut, got ${Math.round(r.lengthM)} m`);
  for (const p of r.path) assert.ok(offLine(p, trace.map((q): LngLat => [q.lon, q.lat])) <= NAV.loopM, 'every point near the trace');
});

test('nav: walk me back can end at a capture’s pin (N1)', () => {
  const trace = walk([at(0, 0), at(4, 0)]);
  const r = traceRouteSource(trace, []).route(at(4, 0), at(1, 0.05))!;
  assert.ok(Math.abs(r.lengthM - 300) < 25, `about 300 m to the pin, got ${Math.round(r.lengthM)}`);
  assert.ok(distanceM(r.path.at(-1)!, at(1, 0.05)) < 1);
});

test('nav: the trace router never crosses a pause or a gap it did not walk', () => {
  // Paused while carried 300 m east: the way back runs only along what was walked.
  const a = walk([at(0, 0), at(1, 0)]);
  const pause = { started_at: a.at(-1)!.t + 1000, ended_at: a.at(-1)!.t + 60_000 };
  const b = walk([at(4, 0), at(5, 0)], pause.ended_at);
  const r = traceRouteSource([...a, ...b], [pause]).route(at(5, 0), at(0, 0));
  assert.equal(r, null, 'the walked pieces don’t connect');
});

// A street grid 100 m apart: three east-west streets, four north-south.
const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: props });
const grid = deriveSegments([
  ...[0, 1, 2].map((y) => road([at(0, y), at(3, y)], { class: 'minor', name: `Street ${y}` })),
  ...[0, 1, 2, 3].map((x) => road([at(x, 0), at(x, 2)], { class: 'minor', name: `Avenue ${x}` })),
  // An island street, connected to nothing.
  road([at(10, 10), at(11, 10)], { class: 'minor', name: 'Lone Lane' }),
]);

test('nav: a street route is the shortest over the streets, joined within 150 m at each end (N3)', () => {
  const src = streetRouteSource(grid);
  const r = src.route(at(0.02, 0.5), at(2.98, 1.6))!;
  assert.ok(r, 'a route');
  // Up Avenue 0 to Street 1 (50 m), along to Avenue 3 (300 m), up 60 m: about 410 m.
  assert.ok(Math.abs(r.lengthM - 410) < 30, `about 410 m, got ${Math.round(r.lengthM)}`);
  for (const p of r.path.slice(1, -1)) assert.ok(offLine(p, [at(0, 0), at(0, 2)]) < 5 || offLine(p, [at(0, 1), at(3, 1)]) < 5 || offLine(p, [at(3, 0), at(3, 2)]) < 5, 'on the streets');
  // A point 120 m off the grid still joins it.
  assert.ok(src.route(at(-1.2, 1), at(3, 1)));
});

test('nav: no route when an end is over 150 m from a street, or the streets don’t connect (N4)', () => {
  const src = streetRouteSource(grid);
  assert.equal(src.route(at(-2, 1), at(3, 1)), null, '200 m off the grid');
  assert.equal(src.route(at(0, 0), at(10.5, 10)), null, 'Lone Lane is not connected');
});

test('nav: a destination over 10 km away is too far (N5)', () => {
  assert.equal(tooFar(at(0, 0), at(99, 0)), false);
  assert.equal(tooFar(at(0, 0), at(101, 0)), true);
});

test('nav: distance left is measured along the route from where you are (N7)', () => {
  const path = [at(0, 0), at(3, 0), at(3, 2)];
  const p = progressOn(path, at(1, 0.1));
  assert.ok(Math.abs(p.leftM - 400) < 5, `400 m left, got ${p.leftM}`);
  assert.ok(Math.abs(p.offM - 10) < 1);
});

const dest = { at: at(3, 2), label: 'Fox Point', kind: 'point' as const };
const route = { path: [at(0, 0), at(3, 0), at(3, 2)], lengthM: 500, source: 'test' };

test('nav: off your route after two fixes over 50 m away, re-routing at most every 15 s (N8)', () => {
  let s = startNav(dest, route, 0);
  let r = navStep(s, at(1, 0.6), 1000);
  assert.equal(r.state.offRoute, false, 'one fix off is GPS, not a wrong turn');
  assert.equal(r.reroute, false);
  r = navStep(r.state, at(1.1, 0.7), 2000);
  assert.equal(r.state.offRoute, true);
  assert.equal(r.reroute, true, 'first re-route at once');
  s = { ...r.state, route };
  r = navStep(s, at(1.2, 0.8), 9000);
  assert.equal(r.reroute, false, 'not again within 15 s');
  r = navStep(r.state, at(1.3, 0.9), 17_500);
  assert.equal(r.reroute, true);
  r = navStep(r.state, at(2, 0.1), 18_000);
  assert.equal(r.state.offRoute, false, 'back on the route');
});

test('nav: within 30 m of the destination you have arrived (N9)', () => {
  const s = startNav(dest, route, 0);
  assert.equal(navStep(s, at(3, 1.5), 1000).state.arrived, false);
  assert.equal(navStep(s, at(3, 1.75), 1000).state.arrived, true);
});

test('nav: routeTo tries each source in turn and says why when none can (N3-N5, N15)', () => {
  const none: RouteSource = { id: 'none', route: () => null };
  const straight: RouteSource = { id: 'straight', route: (a, b) => ({ path: [a, b], lengthM: distanceM(a, b), source: 'straight' }) };
  assert.equal(routeTo([none, straight], at(0, 0), at(1, 0)).route?.source, 'straight');
  assert.equal(routeTo([none], at(0, 0), at(1, 0)).reason, 'No walking route found nearby');
  assert.equal(routeTo([straight], at(0, 0), at(200, 0)).reason, 'Too far to walk from here');
});

test('nav: walk me back never cuts a corner the walk turned, only a loop it came back to (screenshot)', () => {
  // An L: 300 m east, 200 m north. Points either side of the corner are within 30 m of each other.
  const trace = walk([at(0, 0), at(3, 0), at(3, 2)]);
  const r = traceRouteSource(trace, []).route(at(3, 2), at(0, 0))!;
  assert.ok(r.lengthM >= 495, `the corner is walked round, not cut: ${Math.round(r.lengthM)} m`);
});

// Regression tests from the slice's audit and UI review, written before the fixes.

test('audit: a destination on the same block is reached along it, not back via the corner', () => {
  const src = streetRouteSource(grid);
  const r = src.route(at(0.2, 0.02), at(0.7, 0.02))!;
  assert.ok(r.lengthM < 60, `about 50 m along the block, got ${Math.round(r.lengthM)}`);
});

test('audit: routing leaves the street graph as it was (no growth per query)', () => {
  const src = streetRouteSource(grid);
  const first = src.route(at(0.02, 0.5), at(2.98, 1.6))!.lengthM;
  for (let k = 0; k < 20; k++) src.route(at(0.02 + k * 0.01, 0.5), at(2.98, 1.6 - k * 0.01));
  assert.equal(Math.round(src.route(at(0.02, 0.5), at(2.98, 1.6))!.lengthM), Math.round(first));
});

test('audit: walk me back joins the trace only within 150 m; further off, the streets take over', () => {
  const trace = walk([at(0, 0), at(3, 0)]);
  const src = traceRouteSource(trace, []);
  assert.ok(src.route(at(1, 1), at(0, 0)), '100 m off: joins');
  assert.equal(src.route(at(1, 3), at(0, 0)), null, '300 m off: not a straight line through the block');
});

test('audit: reaching the end of the route is arriving, even for a spot off the streets', () => {
  const offStreet = { at: at(3, 2.6), label: 'A park', kind: 'point' as const };
  // As routes are built: the streets, then a last leg from the street to the spot itself.
  const toPark = { ...route, path: [...route.path, offStreet.at] };
  const s = startNav(offStreet, toPark, 0);
  assert.equal(navStep(s, at(3, 1.8), 1000).state.arrived, true, 'the streets end at (3, 2), 60 m short of the spot');
});

test('audit: the route is drawn only ahead of you', () => {
  const ahead = routeAhead(route.path, at(1, 0.1));
  assert.ok(distanceM(ahead[0], at(1, 0)) < 2, 'from where you are on it');
  assert.equal(ahead.length, 3);
  assert.ok(distanceM(ahead.at(-1)!, at(3, 2)) < 1);
});

test('audit: the distance left is announced in steps, not on every fix', () => {
  assert.equal(announceStep(560, 530), false);
  assert.equal(announceStep(510, 495), true, 'crossing 500 m');
  assert.equal(announceStep(160, 145), true, 'every 50 m under 200 m');
  assert.equal(announceStep(140, 120), false);
});

test('heading: the way you are walking, only once you are moving', () => {
  const east = walk([at(0, 0), at(0.5, 0)]);
  assert.ok(Math.abs(headingOf(east)! - 90) < 5, 'east is 90°');
  const still: TracePoint[] = east.map((p) => ({ ...p, lon: east[0].lon, lat: east[0].lat, speed: 0 }));
  assert.equal(headingOf(still), null);
  const north = walk([at(0, 0), at(0, 0.5)]).map((p) => ({ ...p, course: null }));
  assert.ok(Math.abs(headingOf(north)! - 0) < 5 || Math.abs(headingOf(north)! - 360) < 5, 'north is 0°');
});

test('nav: the shortest route wins, so walk me back never retraces a detour the streets can skip (owner, Nov 1)', () => {
  const mk = (id: string, lengthM: number): RouteSource => ({ id, route: (from, to) => ({ path: [from, to], lengthM, source: id }) });
  const none: RouteSource = { id: 'none', route: () => null };
  const a: LngLat = [-71.4, 41.812];
  const b: LngLat = [-71.398, 41.812];
  // The trace back is 513 m; the streets have 300 m: the streets win.
  assert.equal(routeTo([mk('trace', 513), mk('streets', 300)], a, b, 'shortest').route?.source, 'streets');
  // Within 10% of each other, the way you came wins (it is known to be walkable).
  assert.equal(routeTo([mk('trace', 320), mk('streets', 300)], a, b, 'shortest').route?.source, 'trace');
  assert.equal(routeTo([none, mk('streets', 300)], a, b, 'shortest').route?.source, 'streets');
  // The default is still first that answers.
  assert.equal(routeTo([mk('trace', 513), mk('streets', 300)], a, b).route?.source, 'trace');
});

test('heading: the trace wins over a device course that disagrees with it (owner, Nov 1: south, the cone said east-north-east)', () => {
  const south = walk([at(0, 0.5), at(0, 0)]);
  const lying = south.map((p) => ({ ...p, speed: 1.2, course: 68 }));
  assert.ok(Math.abs(headingOf(lying)! - 180) < 5, `${headingOf(lying)}`);
  const agreeing = south.map((p) => ({ ...p, speed: 1.2, course: 170 }));
  assert.equal(headingOf(agreeing), 170, 'a course near the trace is kept: it turns sooner');
  // No trace yet to check it against: a course is used, but not Android's 0 for "no bearing".
  const first = [{ ...south[0], speed: 1.2, course: 0 }];
  assert.equal(headingOf(first), null);
  assert.equal(headingOf([{ ...south[0], speed: 1.2, course: 200 }]), 200);
});
