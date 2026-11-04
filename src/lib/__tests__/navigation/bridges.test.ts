/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { streetRouteSource } from '../../nav/streetRoute';
import { deriveSegments, type RoadFeature } from '../../streets';
import type { LngLat, StreetSegment } from '../../types';

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
  // A bridge with no layer is at 1: it meets a bridge at layer 1 (an elevated deck).
  const deck = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Viaduct', brunnel: 'bridge' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Deck Street', brunnel: 'bridge', layer: 1 }),
  ]);
  assert.ok(cutAt(deck, at(1, 0), 'Viaduct') && cutAt(deck, at(1, 0), 'Deck Street'), 'one level: a junction');
  // A tunnel passes under a street.
  const tunnel = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Surface Street' }),
    road([at(1, -1), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Underpass', brunnel: 'tunnel', layer: -1 }),
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

test('bridges: a footbridge lands on a street mid-block; a ground junction under a bridge does not climb onto it (NB3)', () => {
  const landing = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Water Street' }),
    road([at(1, -1), at(1, 0)], { class: 'path', subclass: 'footway', name: 'Footbridge', brunnel: 'bridge', layer: 1 }),
  ]);
  assert.ok(cutAt(landing, at(1, 0), 'Water Street'), 'the footbridge’s end lands on the street');
  const stub = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    // Bank Path ends on the creek path right under the bridge: a ground junction, not stairs.
    road([at(1, -1), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Creek Path' }),
    road([at(0.5, -0.5), at(1, 0)], { class: 'path', subclass: 'footway', name: 'Bank Path' }),
  ]);
  assert.ok(!cutAt(stub, at(1, 0), 'Broad Street'), 'a ground junction under the bridge is not a junction with it');
  const src = streetRouteSource(stub);
  const r = src.route(at(0.55, -0.45), at(1.9, 0));
  assert.ok(!r || r.lengthM > 300, 'no way up from the bank onto the bridge');
});

test('bridges: a short footway under a bridge is not its crosswalk: the paths either side stay joined (NB4)', () => {
  // Two ground paths meet a 24 m footway that passes under the bridge: a crosswalk by length, but on
  // another level. It must stay, and must not cut the bridge.
  const segs = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    road([at(1, -1), at(1, -0.12)], { class: 'path', subclass: 'footway', name: 'South Bank' }),
    road([at(1, -0.12), at(1, 0.12)], { class: 'path', subclass: 'footway' }),
    road([at(1, 0.12), at(1, 1)], { class: 'path', subclass: 'footway', name: 'North Bank' }),
  ]);
  assert.ok(!cutAt(segs, at(1, 0), 'Broad Street'), 'the bridge is not cut');
  const r = streetRouteSource(segs).route(at(1, -0.9), at(1, 0.9));
  assert.ok(r && r.lengthM < 200, `along the bank under the bridge: ${r && Math.round(r.lengthM)} m`);
});

// The audit (Nov 3), each a regression test before its fix.

test('bridges audit 1: a layer without a bridge or tunnel is the ground (an embankment)', () => {
  // A road tagged layer=1 with no bridge, and side streets ending on it mid-block.
  const segs = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'secondary', name: 'Embankment Road', layer: 1 }),
    road([at(1, -1), at(1, 0)], { class: 'minor', name: 'Side Street' }),
  ]);
  assert.ok(cutAt(segs, at(1, 0), 'Embankment Road'), 'the side street meets it');
  const r = streetRouteSource(segs).route(at(1, -0.9), at(1.9, 0));
  assert.ok(r && r.lengthM < 220, `straight up and along: ${r && Math.round(r.lengthM)} m`);
  // A string layer on a bridge is read as a number.
  const str = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Low Bridge', brunnel: 'bridge', layer: '1' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'High Bridge', brunnel: 'bridge', layer: '2' }),
  ]);
  assert.ok(!cutAt(str, at(1, 0)), 'layers "1" and "2" do not meet');
});

test('bridges audit 2: stairs landing mid-span on a footbridge, or into an underpass, connect', () => {
  const stairs = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'path', subclass: 'footway', name: 'Skyway', brunnel: 'bridge', layer: 3 }),
    road([at(1.03, -1), at(1.03, 0)], { class: 'path', subclass: 'steps', name: 'Stairs' }),
  ]);
  assert.ok(cutAt(stairs, at(1.03, 0), 'Skyway'), 'the stairs land on the footbridge');
  const underpass = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'path', subclass: 'footway', name: 'Underpass', brunnel: 'tunnel', layer: -1 }),
    road([at(1, 0), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Ramp' }),
  ]);
  assert.ok(cutAt(underpass, at(1, 0), 'Underpass'), 'the ramp leads into the underpass');
  // A path split into two ways right under a bridge still only passes under it.
  const split = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    road([at(1, -1), at(1, 0)], { class: 'path', subclass: 'footway', name: 'Creek Path' }),
    road([at(1, 0), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Creek Path', surface: 'gravel' }),
  ]);
  assert.ok(!cutAt(split, at(1, 0), 'Broad Street'), 'a path passing under, split there, does not climb on');
});

test('bridges audit 2: a short footbridge joining stairs to a bridge is not merged away as its sidewalk', () => {
  const segs = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'High Street', brunnel: 'bridge', layer: 1 }),
    road([at(1, 0), at(1, -0.05)], { class: 'path', subclass: 'footway', brunnel: 'bridge', layer: 1 }),
    road([at(1, -0.05), at(1, -1)], { class: 'path', subclass: 'steps', name: 'Stairs' }),
  ]);
  const r = streetRouteSource(segs).route(at(1, -0.95), at(1.9, 0));
  assert.ok(r && r.lengthM < 220, `up the stairs and along the bridge: ${r && Math.round(r.lengthM)} m`);
});

test('bridges audit 3: the route graph never merges a ground junction into a bridge vertex 2 m away', () => {
  // Two ground paths meet 2 m south of a vertex on the bridge's line.
  const segs = deriveSegments([
    road([at(0, 0), at(0.8, 0)], broad),
    road([at(0.8, 0), at(1, 0), at(1.2, 0)], { ...broad, brunnel: 'bridge', layer: 1 }),
    road([at(1.2, 0), at(2, 0)], broad),
    road([at(1, -1), at(1, -0.02)], { class: 'path', subclass: 'footway', name: 'Creek Path' }),
    road([at(1, -0.02), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Creek Path' }),
    road([at(1, -0.02), at(0.5, -0.5)], { class: 'path', subclass: 'footway', name: 'Spur' }),
    road([at(2, 0), at(2, 1)], { class: 'minor', name: 'Main Street' }),
    road([at(1, 1), at(2, 1)], { class: 'minor', name: 'North Street' }),
  ]);
  const r = streetRouteSource(segs).route(at(1.1, 0), at(1, 1), { heading: 90 })!;
  assert.ok(r && r.lengthM > 250, `round by Main Street, not down onto the path: ${r && Math.round(r.lengthM)} m`);
});

test('bridges audit 7: a tunnel with no layer is a passage at the ground', () => {
  const segs = deriveSegments([
    road([at(0, 0), at(2, 0)], { class: 'minor', name: 'Court Street' }),
    road([at(1, -1), at(1, 1)], { class: 'path', subclass: 'footway', name: 'Passage', brunnel: 'tunnel' }),
  ]);
  assert.ok(cutAt(segs, at(1, 0), 'Court Street'), 'a building passage meets the street it crosses');
});

test('bridges audit 8: a bridge’s sidewalk mapped without bridge tags never leads down to the path under it', () => {
  const segs = deriveSegments([
    ...town,
    // The north sidewalk, 6 m off the bridge's line, tagged as plain ground, joining the approaches.
    road([at(0.8, 0), at(0.82, 0.06), at(1.18, 0.06), at(1.2, 0)], { class: 'path', subclass: 'footway' }),
  ]);
  const r = streetRouteSource(segs).route(at(1.1, 0), at(1, 1), { heading: 90 })!;
  assert.ok(r && r.lengthM > 250, `round by Main Street: ${r && Math.round(r.lengthM)} m`);
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
