/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, filterFixes, positionAt, stepToward } from '../geo';
import { cursorAt, groupCaptures, schedule, PATH_AND_PAUSES_MS } from '../replay';
import { snap } from '../snapper';
import { deriveSegments, type RoadFeature } from '../streets';
import type { Capture, LngLat, TracePoint } from '../types';

// A small grid near Fox Point, Providence: two east-west streets 100 m apart
// and one north-south street joining them.
const O: LngLat = [-71.4, 41.82];
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
    road([at(0.5, -0.2), at(0.5, 0.2)], { class: 'path', subclass: 'crossing' }), // crosswalk
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

test('replay: fixed length, nearby captures share one pause', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const cap = (id: string, t: number, x: number, kind: Capture['kind'] = 'text'): Capture => ({
    id, walk_id: 'w1', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: kind === 'voice' ? '6000' : 'hi', segment_id: null,
  });
  const caps = [cap('a', 20_000, 0.1), cap('b', 30_000, 0.15, 'voice'), cap('c', 150_000, 2.5)];
  const groups = groupCaptures(caps);
  assert.equal(groups.length, 2);
  assert.ok(groups[0].ms >= 6500, 'the pause lasts as long as the voice memo');

  const s = schedule(trace, caps, 0);
  assert.equal(s.totalMs, PATH_AND_PAUSES_MS);
  assert.equal(cursorAt(s, 0).kind, 'moving');
  assert.equal(cursorAt(s, s.totalMs + 1).kind, 'done');
  // The cursor stops exactly at each group's time.
  let pausedAt = new Set<number>();
  for (let ms = 0; ms < s.totalMs; ms += 50) {
    const c = cursorAt(s, ms);
    if (c.kind === 'paused') pausedAt.add(c.walkT);
  }
  assert.deepEqual([...pausedAt], [20_000, 150_000]);

  // A two-hour walk replays in the same time as a ten-minute one.
  const long = walkAlong([at(0, 0), at(3, 0), at(0, 0), at(3, 0), at(0, 0)]);
  assert.equal(schedule(long, [], 0).totalMs, PATH_AND_PAUSES_MS);
});
