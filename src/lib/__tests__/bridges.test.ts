/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../geo';
import { streetRouteSource } from '../nav/streetRoute';
import { deriveSegments, type RoadFeature } from '../streets';
import type { LngLat, StreetSegment } from '../types';

// Bridges and Open in Maps (the concept doc's tab, NB1-NB7), written before the
// code. On Nov 3 a route told the owner to turn off a bridge onto the path
// under it: every crossing was a junction, whatever the tiles' bridge tags said.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: props });

/** Whether any piece of the named street (or any piece, with no name) has an end within 1 m of p. */
const cutAt = (segs: StreetSegment[], p: LngLat, name?: string) =>
  segs.some((s) => (!name || s.name === name) && s.geometry.some((l) => distanceM(l[0], p) < 1 || distanceM(l[l.length - 1], p) < 1));

/** Shortest distance from p to the polyline. */
function offLine(p: LngLat, line: LngLat[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++)
    for (let k = 0; k <= 20; k++) {
      const f = k / 20;
      best = Math.min(best, distanceM(p, [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * f, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * f]));
    }
  return best;
}

// The screenshot, drawn small: Broad Street runs east over a bridge (x 0.8 to
// 1.2); the creek path runs north under it at x 1. The only real way from the
// bridge to the path's north end is round by Main Street and North Street.
const broad = { class: 'minor', name: 'Broad Street' };
const creekPath = road([at(1, -1), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Creek Path' });
const town = [
  road([at(0, 0), at(0.8, 0)], broad),
  road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
  road([at(1.2, 0), at(2, 0)], broad),
  creekPath,
  road([at(2, 0), at(2, 1)], { class: 'minor', name: 'Main Street' }),
  road([at(1, 1), at(2, 1)], { class: 'minor', name: 'North Street' }),
];

test('bridges: a path under a bridge is no junction with it; neither is cut there (NB2)', () => {
  const segs = deriveSegments(town);
  assert.ok(!cutAt(segs, at(1, 0), 'Broad Street'), 'the bridge runs on over the path');
  assert.ok(!cutAt(segs, at(1, 0), 'Creek Path'), 'the path runs on under the bridge');
  // The bridge still joins its approaches at both ends (NB3).
  assert.ok(cutAt(segs, at(0.8, 0), 'Broad Street') && cutAt(segs, at(1.2, 0), 'Broad Street'));
});

test('bridges: a route from the bridge never turns down onto the path under it (NB2, the screenshot)', () => {
  const src = streetRouteSource(deriveSegments(town));
  const r = src.route(at(1.1, 0), at(1, 1))!;
  assert.ok(r, 'a route');
  // East off the bridge (90 m), up Main Street (100 m), back along North Street (100 m).
  assert.ok(Math.abs(r.lengthM - 290) < 25, `round by Main Street, about 290 m; got ${Math.round(r.lengthM)}`);
  for (const p of r.path.slice(1, -1)) assert.ok(offLine(p, [at(1, -0.9), at(1, 0.9)]) > 5, 'never on the creek path');
});

test('bridges: the level is the layer, else 1 for a bridge and -1 for a tunnel, else 0 (NB1, NB5)', () => {
  // Two bridges stacked (layers 1 and 2) cross without meeting.
  const stacked = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Low Bridge', brunnel: 'bridge', layer: 1 }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'High Bridge', brunnel: 'bridge', layer: 2 }),
  ]);
  assert.ok(!cutAt(stacked, at(1, 0)), 'layers 1 and 2 do not meet');
  // A bridge with no layer is at 1: it meets an untagged line at layer 1 (an elevated deck).
  const deck = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Viaduct', brunnel: 'bridge' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Deck Street', layer: 1 }),
  ]);
  assert.ok(cutAt(deck, at(1, 0), 'Viaduct') && cutAt(deck, at(1, 0), 'Deck Street'), 'one level: a junction');
  // A tunnel passes under a street.
  const tunnel = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Surface Street' }),
    road([at(1, -1), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Underpass', brunnel: 'tunnel' }),
  ]);
  assert.ok(!cutAt(tunnel, at(1, 0)), 'a tunnel does not meet the street above');
  // A ford is at the ground: it meets what it crosses.
  const ford = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'River Road' }),
    road([at(1, -1), at(1, 1)], { class: 'track', name: 'Ford Lane', brunnel: 'ford' }),
  ]);
  assert.ok(cutAt(ford, at(1, 0), 'River Road'), 'a ford is on the ground');
  // Ground streets still meet wherever they cross (NB5).
  const plain = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'First Street' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Cross Street' }),
  ]);
  assert.ok(cutAt(plain, at(1, 0), 'First Street') && cutAt(plain, at(1, 0), 'Cross Street'));
});

test('bridges: a footbridge lands on a street mid-block; a path ending under a bridge does not climb onto it (NB3)', () => {
  const landing = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Water Street' }),
    road([at(1, -1), at(1, 0)], { class: 'path', subclass: 'footway', name: 'Footbridge', brunnel: 'bridge', layer: 1 }),
  ]);
  assert.ok(cutAt(landing, at(1, 0), 'Water Street'), 'the footbridge’s end lands on the street');
  const stub = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    road([at(1, -1), at(1, 0)], { class: 'path', subclass: 'footway', name: 'Bank Path' }),
  ]);
  assert.ok(!cutAt(stub, at(1, 0), 'Broad Street'), 'a ground path ending under the bridge is not a junction');
  const src = streetRouteSource(stub);
  const r = src.route(at(1, -0.9), at(1.9, 0));
  assert.ok(!r || r.lengthM > 300, 'no way up from the bank onto the bridge');
});

test('bridges: a short footway under a bridge is not its crosswalk, and does not cut it (NB4)', () => {
  const segs = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    road([at(1, -0.1), at(1, 0.1)], { class: 'path', subclass: 'footway' }),
  ]);
  assert.ok(!cutAt(segs, at(1, 0), 'Broad Street'));
});

test('bridges: a route starts on the street you are walking along, not the one under you (NB7)', () => {
  const src = streetRouteSource(deriveSegments(town));
  // 3 m north of the bridge's middle: right over the creek path, which is nearer.
  const here = at(1, 0.03);
  const bare = src.route(here, at(1, 1))!;
  assert.ok(bare.lengthM < 120, `with no heading, the nearest street (the path): ${Math.round(bare.lengthM)} m`);
  const east = src.route(here, at(1, 1), { heading: 90 })!;
  assert.ok(east, 'a route');
  assert.ok(east.lengthM > 250, `walking east over the bridge, it starts on the bridge: ${Math.round(east.lengthM)} m`);
  // It joins the bridge right over the path, then runs east along it.
  for (const p of east.path.slice(2, -1)) assert.ok(offLine(p, [at(1, -0.9), at(1, 0.9)]) > 5, 'never on the creek path');
  // Walking north up the path, 2 m from the bridge's line: the path is the street you are on.
  const north = src.route(at(1.02, 0), at(1, 1), { heading: 0 })!;
  assert.ok(north.lengthM < 120, `walking up the path, the path: ${Math.round(north.lengthM)} m`);
  assert.ok(src.route(at(1.02, 0), at(1, 1))!.lengthM > 250, 'with no heading, the nearer bridge');
  // A street further than 12 m beyond the nearest never wins on heading alone.
  const far = src.route(at(1, 0.15), at(1, 1), { heading: 90 })!;
  assert.ok(far.lengthM < 120, `the bridge 15 m off loses to the path under you: ${Math.round(far.lengthM)} m`);
});
