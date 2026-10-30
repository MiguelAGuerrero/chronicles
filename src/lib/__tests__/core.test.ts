/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, filterFixes, lineLengthM, positionAt, stepToward } from '../geo';
import { groupCaptures, nextStop, PATH_MS, schedule, walkTimeAt } from '../replay';
import { pinsFor } from '../pins';
import { tileAt } from '../tileMath';
import { snap } from '../snapper';
import { deriveSegments, type RoadFeature } from '../streets';
import type { Capture, LngLat, TracePoint } from '../types';

// A small grid near Fox Point, Providence: two east-west streets 100 m apart
// and one north-south street joining them, well inside one z14 tile.
const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({
  geometry: { type: 'LineString', coordinates: coords },
  properties: props,
});

// Ways that meet share a vertex there, as OSM ways share the intersection node.
const roads = [
  road([at(0, 0), at(1, 0), at(3, 0)], { class: 'minor' }), // 300 m, south street
  road([at(0, 1), at(1, 1), at(3, 1)], { class: 'minor' }), // 300 m, north street
  road([at(1, 0), at(1, 1)], { class: 'minor' }), // 100 m connector
  road([at(0, -0.1), at(3, -0.1)], { class: 'path', subclass: 'footway' }), // sidewalk, 11 m off
  road([at(0, 3), at(3, 3)], { class: 'motorway' }),
];
const names = [
  road([at(0, 0), at(3, 0)], { name: 'Wickenden Street' }),
  road([at(0, 1), at(3, 1)], { name: 'Transit Street' }),
];

function walkAlong(path: LngLat[], walkId = 'w1', t0 = 0, jitter = 0): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 1.4 * 5);
      t += 5000;
      pts.push({ walk_id: walkId, t, lat: pos[1] + jitter * dLat / 100, lon: pos[0], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}

test('derive: splits at intersections, drops motorways and merges sidewalks into their street', () => {
  const segs = deriveSegments(roads, names);
  assert.ok(segs.every((s) => !s.kind_detail.startsWith('motorway')));
  assert.ok(segs.every((s) => !s.kind_detail.startsWith('path')), 'the sidewalk should merge into Wickenden');
  assert.ok(segs.every((s) => s.length_m <= 200.5));
  const wick = segs.filter((s) => s.name === 'Wickenden Street').map((s) => Math.round(s.length_m));
  assert.deepEqual(wick.sort((a, b) => a - b), [100, 200], 'split at the connector, not every 100 m');
  // A block longer than the cap is cut, so a long block is not all-or-nothing.
  const long = deriveSegments([road([at(0, 5), at(5, 5)], { class: 'minor' })]);
  assert.deepEqual(long.map((s) => Math.round(s.length_m / 10) * 10), [200, 200, 100]);
  // Overlapping tiles return the same feature twice; it is stored once.
  assert.equal(deriveSegments([...roads, ...roads], names).length, segs.length);
});

test('derive: finds crossings and T-junctions without a shared vertex', () => {
  // Tile simplification drops the node where straight streets cross.
  const segs = deriveSegments([
    road([at(0, 0), at(3, 0)], { class: 'minor', name: 'Wickenden Street' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Brook Street' }), // crosses
    road([at(2, 0.005), at(2, 1)], { class: 'minor', name: 'Hope Street' }), // ends half a meter short
    road([at(0.5, -0.08), at(0.5, 0.08)], { class: 'path', subclass: 'footway' }), // a 16 m crosswalk
  ]);
  const len = (name: string) => segs.filter((s) => s.name === name).map((s) => Math.round(s.length_m / 10) * 10).sort((a, b) => a - b);
  assert.deepEqual(len('Wickenden Street'), [100, 100, 100], 'cut at Brook and at Hope, not at the crosswalk');
  assert.deepEqual(len('Brook Street'), [100, 100]);
  assert.deepEqual(len('Hope Street'), [100]);
});

test('snap: credits only the pieces walked, within the 20 m buffer', () => {
  const segs = deriveSegments(roads, names);
  // Walk the first 100 m of Wickenden 12 m off-axis (the far sidewalk), then up the connector.
  const trace = walkAlong([at(0, 0.12), at(1, 0.12), at(1, 1)]);
  const visited = snap('w1', trace, segs);
  const walkedNames = visited.map((v) => segs.find((s) => s.id === v.segment_id)!);
  const wick = walkedNames.filter((s) => s.name === 'Wickenden Street');
  assert.equal(wick.length, 1, 'only the block between the corner and the connector');
  assert.ok(Math.abs(wick[0].length_m - 100) < 1);
  assert.ok(walkedNames.some((s) => s.name === null && s.kind_detail === 'minor'), 'the connector');
  assert.ok(!walkedNames.some((s) => s.name === 'Transit Street'), 'crossing a street is not walking it');
  for (const v of visited) assert.ok(v.covered_fraction >= 0.5 && v.covered_fraction <= 1);
});

test('snap: no interpolation across gaps over 60 s', () => {
  const segs = deriveSegments(roads, names);
  const a = walkAlong([at(0, 0), at(0.05, 0)]);
  const b = walkAlong([at(2.95, 0), at(3, 0)], 'w1', a.at(-1)!.t + 10 * 60_000);
  const visited = snap('w1', [...a, ...b], segs);
  assert.equal(visited.length, 0);
});

test('filterFixes drops inaccurate fixes and impossible jumps', () => {
  const base = { walk_id: 'w', speed: null, course: null };
  const pts: TracePoint[] = [
    { ...base, t: 0, lat: O[1], lon: O[0], accuracy_m: 5 },
    { ...base, t: 5000, lat: O[1] + dLat * 0.07, lon: O[0], accuracy_m: 80 },
    { ...base, t: 10000, lat: O[1] + dLat * 5, lon: O[0], accuracy_m: 5 },
    { ...base, t: 15000, lat: O[1] + dLat * 0.1, lon: O[0], accuracy_m: 5 },
  ];
  assert.deepEqual(filterFixes(pts).map((p) => p.t), [0, 15000]);
  assert.deepEqual(positionAt(filterFixes(pts), 7500)!.map((n) => n.toFixed(7)), [O[0].toFixed(7), (O[1] + dLat * 0.05).toFixed(7)]);
});

test('replay: the path runs in fixed time and stops at each group of captures', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const cap = (id: string, t: number, x: number, kind: Capture['kind'] = 'text'): Capture => ({
    id, walk_id: 'w1', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: kind === 'voice' ? '6000' : 'hi', segment_id: null,
  });
  const caps = [cap('a', 20_000, 0.1), cap('b', 30_000, 0.15, 'voice'), cap('c', 150_000, 2.5)];
  const groups = groupCaptures(caps);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].captures.map((c) => c.id), ['a', 'b'], 'nearby captures share one stop, in order');

  const s = schedule(trace, caps, 0);
  assert.equal(s.movingMs, PATH_MS);
  assert.ok(s.groups[0].atMs < s.groups[1].atMs);
  // The stop comes when the path reaches the group's time, and not before.
  assert.equal(nextStop(s, s.groups[0].atMs - 1, 0), null);
  assert.equal(nextStop(s, s.groups[0].atMs, 0), 0);
  assert.equal(nextStop(s, s.groups[1].atMs + 5, 1), 1);
  assert.equal(nextStop(s, PATH_MS, 2), null, 'nothing left once every group was shown');
  assert.ok(Math.abs(walkTimeAt(s, s.groups[0].atMs) - 20_000) < 1);

  // A two-hour walk's path runs in the same time as a ten-minute one.
  const long = walkAlong([at(0, 0), at(3, 0), at(0, 0), at(3, 0), at(0, 0)]);
  assert.equal(schedule(long, [], 0).movingMs, PATH_MS);
});

test('derive: copies of a street from two tiles stitch into the same pieces as the whole street', () => {
  const t = tileAt(O);
  const edge = t.e; // the tile's east edge
  const m = dLon / 100; // one meter of longitude
  const lat = O[1];
  const full = road([[edge - 300 * m, lat], [edge + 300 * m, lat]], { class: 'minor' });
  // Each tile carries its copy plus a buffer reaching into its neighbour.
  const west = road([[edge - 300 * m, lat], [edge + 40 * m, lat]], { class: 'minor' });
  const east = road([[edge - 40 * m, lat], [edge + 300 * m, lat]], { class: 'minor' });
  const ids = (f: RoadFeature[]) => deriveSegments(f).map((s) => s.id).sort();
  assert.deepEqual(ids([west, east]), ids([full]));
  assert.deepEqual(ids([east, west, west]), ids([full]), 'order and duplicates do not matter');
  // With only one tile loaded, the street runs off its edge: nothing partial is stored.
  assert.deepEqual(ids([west]), []);
});

test('derive: lines of one MultiLineString cut each other, and a loop keeps its length', () => {
  const multi: RoadFeature = {
    geometry: { type: 'MultiLineString', coordinates: [[at(0, 0), at(2, 0)], [at(1, -1), at(1, 1)]] },
    properties: { class: 'minor' },
  };
  assert.deepEqual(deriveSegments([multi]).map((s) => Math.round(s.length_m / 10) * 10), [100, 100, 100, 100]);
  // A loop court whose stem meets it away from the ring's first vertex.
  const ring = [at(0, 0), at(0.4, 0), at(0.4, 0.4), at(0, 0.4), at(0, 0)];
  const segs = deriveSegments([road(ring, { class: 'minor' }), road([at(0.2, 0), at(0.2, -0.5)], { class: 'minor' })]);
  const total = segs.reduce((d, s) => d + s.length_m, 0);
  assert.ok(Math.abs(total - (lineLengthM(ring) + 50)) < 2, `kept ${total.toFixed(0)} m`);
});

test('snap: reaching a corner does not credit the short piece around it', () => {
  // North St comes down to Main; the offset junctions leave a 30 m piece of Main.
  const segs = deriveSegments([
    road([at(-1, 0), at(1, 0)], { class: 'minor', name: 'Main Street' }),
    road([at(0, 1), at(0, 0)], { class: 'minor', name: 'North Street' }),
    road([at(0.3, 0), at(0.3, -1)], { class: 'minor', name: 'South Street' }),
  ]);
  const short = segs.find((s) => s.name === 'Main Street' && Math.round(s.length_m) === 30)!;
  assert.ok(short, 'the 30 m piece exists');
  const toCorner = snap('w', walkAlong([at(0, 1), at(0, 0)]), segs);
  assert.ok(!toCorner.some((v) => v.segment_id === short.id));
  const along = snap('w', walkAlong([at(-0.3, 0.03), at(0.6, 0.03)]), segs);
  assert.ok(along.some((v) => v.segment_id === short.id), 'walking along it still credits it');
});

test('filterFixes: a bad first fix does not lock out the good ones after it', () => {
  const base = { walk_id: 'w', speed: null, course: null, accuracy_m: 10 };
  const bad = { ...base, t: 0, lat: O[1] + dLat * 3, lon: O[0] }; // 300 m off, looks accurate
  const good = [5, 10, 15, 20].map((s, i) => ({ ...base, t: s * 1000, lat: O[1] + dLat * 0.01 * i, lon: O[0] }));
  assert.deepEqual(filterFixes([bad, ...good]).map((p) => p.t), [5000, 10000, 15000, 20000]);
  // A cached position from before the walk began is dropped.
  assert.deepEqual(filterFixes([{ ...base, t: 0, lat: O[1], lon: O[0] }, ...good], 6000).map((p) => p.t), [5000, 10000, 15000, 20000]);
});

test('replay: gaps collapse, so a resumed walk does not crawl across the night', () => {
  const morning = walkAlong([at(0, 0), at(1, 0)]);
  const evening = walkAlong([at(1, 0), at(2, 0)], 'w1', morning.at(-1)!.t + 12 * 3600_000);
  const s = schedule([...morning, ...evening], [], 0);
  let crossed = -1;
  for (let ms = 0; ms <= s.movingMs; ms += 50) {
    if (walkTimeAt(s, ms) >= evening[0].t) { crossed = ms; break; }
  }
  const activeShare = (morning.at(-1)!.t - morning[0].t) / ((morning.at(-1)!.t - morning[0].t) + (evening.at(-1)!.t - evening[0].t));
  assert.ok(Math.abs(crossed / s.movingMs - activeShare) < 0.1, `crossed at ${crossed} ms of ${s.movingMs}`);
});

test('replay: every capture keeps its stop, and an empty walk has no path to run', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const many: Capture[] = Array.from({ length: 300 }, (_, i) => ({
    id: String(i), walk_id: 'w1', t: i * 150, lat: null, lon: null, kind: 'photo', file_path: 'x', body: null, segment_id: null,
  }));
  const s = schedule(trace, many, 0);
  assert.equal(s.groups.reduce((n, g) => n + g.captures.length, 0), 300, 'nothing dropped');
  assert.equal(schedule([], [], 0).movingMs, 0);
});

test('pins: nearby captures share a pin, and the pin says what it holds', () => {
  const cap = (id: string, x: number, kind: Capture['kind'], t = 0): Capture => ({
    id, walk_id: 'w', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: null, segment_id: null,
  });
  const pins = pinsFor([cap('a', 0, 'photo'), cap('b', 0.1, 'photo', 5), cap('c', 0.15, 'voice', 9), cap('d', 2, 'text', 20)]);
  assert.equal(pins.length, 2);
  assert.deepEqual(pins[0].captures.map((c) => c.id), ['a', 'b', 'c']);
  assert.equal(pins[0].kind, 'mixed');
  assert.equal(pins[1].kind, 'text');
  // A capture without a position has no pin.
  assert.equal(pinsFor([{ ...cap('e', 0, 'photo'), lat: null, lon: null }]).length, 0);
});
