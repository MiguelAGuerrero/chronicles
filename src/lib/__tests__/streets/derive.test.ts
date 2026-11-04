/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceToLinesM, lineLengthM } from '../../geo';
import { snap } from '../../snapper';
import { deriveSegments, type RoadFeature } from '../../streets';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { at, dLat, dLon, names, O, road, roads, walkAlong } from '../foxPoint';

// Deriving street pieces from tile features and snapping a walk to them
// (the concept's streets, fog and snapping; .claude/rules/streets-fog-snapping.md).

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

test('snap: crossing streets along a main street credits none of them, and a street needs about a block', () => {
  // Main runs east; Oak, Elm and Ash cross it every 100 m.
  const segs = deriveSegments([
    road([at(-1, 0), at(4, 0)], { class: 'minor', name: 'Main Street' }),
    road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Oak Street' }),
    road([at(2, -1), at(2, 1)], { class: 'minor', name: 'Elm Street' }),
    road([at(3, -1), at(3, 1)], { class: 'minor', name: 'Ash Street' }),
  ]);
  const named = (v: { segment_id: string }[]) => new Set(v.map((x) => segs.find((s) => s.id === x.segment_id)!.name));
  // Down Main, across all three, on the sidewalk 8 m off its line.
  const main = named(snap('w', walkAlong([at(-0.9, 0.08), at(3.9, 0.08)]), segs));
  assert.deepEqual([...main], ['Main Street'], 'the cross streets are crossed, not walked');
  // 40 m up Oak and back: not a block.
  const peek = named(snap('w', walkAlong([at(0.5, 0.05), at(1, 0.05), at(1.03, 0.4), at(1.03, 0.05), at(1.5, 0.05)]), segs));
  assert.ok(!peek.has('Oak Street'), 'a few steps in and back out is not walking it');
  // The whole block of Oak, 100 m: walked.
  const block = named(snap('w', walkAlong([at(1.03, 0), at(1.03, 1)]), segs));
  assert.ok(block.has('Oak Street'), 'a block of it is');
});

test('snap: no interpolation across gaps over 60 s', () => {
  const segs = deriveSegments(roads, names);
  const a = walkAlong([at(0, 0), at(0.05, 0)]);
  const b = walkAlong([at(2.95, 0), at(3, 0)], 'w1', a.at(-1)!.t + 10 * 60_000);
  const visited = snap('w1', [...a, ...b], segs);
  assert.equal(visited.length, 0);
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

/** Every vertex of every piece lies on the streets it came from: none is invented elsewhere. */
function assertOnStreets(segs: ReturnType<typeof deriveSegments>, streets: LngLat[][]) {
  for (const s of segs)
    for (const p of s.geometry.flat())
      assert.ok(distanceToLinesM(p, streets) < 0.5, `${s.id} has a vertex ${distanceToLinesM(p, streets).toFixed(0)} m off every street`);
}

test('derive: junctions stay where the streets cross when the first line is a crosswalk (streaks, Nov 1)', () => {
  // A scan's sweep in Hampden filled the walk map with fog streaks: every junction point
  // collapsed onto one spot whenever the first line read wasn't the first line kept.
  const crosswalk = road([at(0.5, -0.08), at(0.5, 0.08)], { class: 'path', subclass: 'footway' });
  const main = road([at(0, 0), at(3, 0)], { class: 'minor', name: 'Main Street' });
  const brook = road([at(1, -1), at(1, 1)], { class: 'minor', name: 'Brook Street' });
  const hope = road([at(2, -1), at(2, 1)], { class: 'minor', name: 'Hope Street' });
  const streets = [main, brook, hope].map((r) => r.geometry.coordinates as LngLat[]);
  const segs = deriveSegments([crosswalk, main, brook, hope]);
  assertOnStreets(segs, streets);
  const total = segs.reduce((d, s) => d + s.length_m, 0);
  assert.ok(Math.abs(total - 700) < 2, `kept ${total.toFixed(0)} m of 700 m`);
  // The order roads come in never changes the pieces.
  const ids = (f: RoadFeature[]) => deriveSegments(f).map((s) => s.id).sort();
  assert.deepEqual(ids([crosswalk, main, brook, hope]), ids([main, brook, hope, crosswalk]));
});

test('derive: junctions stay put when the first line is stitched to a copy from the next tile', () => {
  // Stitching starts the first chain at its far end, away from the first point read.
  const t = tileAt(O);
  const m = dLon / 100;
  const lat = O[1];
  const west = road([[t.e - 300 * m, lat], [t.e + 40 * m, lat]], { class: 'minor' });
  const east = road([[t.e - 40 * m, lat], [t.e + 300 * m, lat]], { class: 'minor' });
  const cross = road([[t.e - 150 * m, lat - 100 * dLat / 100], [t.e - 150 * m, lat + 100 * dLat / 100]], { class: 'minor' });
  const streets = [[[t.e - 300 * m, lat], [t.e + 300 * m, lat]], cross.geometry.coordinates as LngLat[]] as LngLat[][];
  for (const order of [[east, west, cross], [west, east, cross], [cross, east, west]]) {
    const segs = deriveSegments(order);
    assertOnStreets(segs, streets);
    const total = segs.reduce((d, s) => d + s.length_m, 0);
    assert.ok(Math.abs(total - 800) < 2, `kept ${total.toFixed(0)} m of 800 m`);
  }
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
  // Walking along Main for well over a block credits it, the short piece included.
  const along = snap('w', walkAlong([at(-0.95, 0.03), at(0.95, 0.03)]), segs);
  assert.ok(along.some((v) => v.segment_id === short.id), 'walking along it still credits it');
});
