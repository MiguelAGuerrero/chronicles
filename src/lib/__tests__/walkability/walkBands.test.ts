/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { bandOf, WALK_CODE } from '../../walk/bands';
import { bandsFor, walkTileKey } from '../../walk/match';
import type { WayFacts } from '../../walk/types';

// Walkability (WK5-WK10), written from specs/walkability/spec.md before the code.

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const KY = 110_540;
/** A point `dx` m east and `dy` m north of the origin. */
const at = (dx: number, dy: number): LngLat => [O[0] + dx / KX, O[1] + dy / KY];
const line = (...p: [number, number][]) => p.map(([x, y]) => at(x, y));
let n = 0;
const way = (cls: string, l: LngLat[], more: Partial<WayFacts> = {}): WayFacts => ({ id: `w${n++}`, cls, level: 0, line: l, ...more });
const seg = (id: string, l: LngLat[]) => ({ id, name: null, kind_detail: '', length_m: 200, geometry: [l], build: 'b' });
const home = tileAt(O);
const tiles = (ways: WayFacts[], extra: Record<string, WayFacts[]> = {}) => new Map([[walkTileKey(home.x, home.y), ways], ...Object.entries(extra)]);
/** A 200 m east-west street through the origin. */
const street = line([0, 0], [200, 0]);

test('WK5: the band follows the tags: made for people, calm with a sidewalk, busy, fast, or too little to say', () => {
  const no = { path: false };
  const yes = { path: true };
  assert.equal(bandOf(way('pedestrian', []), no), 'foot');
  assert.equal(bandOf(way('living_street', []), no), 'foot');
  assert.equal(bandOf(way('footway', []), no), 'foot');
  assert.equal(bandOf(way('path', []), no), 'foot');
  assert.equal(bandOf(way('residential', [], { sidewalk: 'both', speedKmh: 40 }), no), 'foot');
  assert.equal(bandOf(way('residential', [], { speedKmh: 48 }), yes), 'foot', '30 mph with a path beside it');
  assert.equal(bandOf(way('residential', [], { sidewalk: 'left', speedKmh: 60 }), no), 'mixed', 'faster than 50 km/h');
  assert.equal(bandOf(way('primary', [], { sidewalk: 'both' }), no), 'mixed', 'a major class with a sidewalk');
  assert.equal(bandOf(way('secondary', [], { sidewalk: 'none' }), no), 'car', 'a secondary road mapped with none');
  assert.equal(bandOf(way('residential', [], { speedKmh: 80 }), no), 'car', '70 km/h or more with nothing beside it');
  assert.equal(bandOf(way('residential', [], { speedKmh: 80 }), yes), 'mixed', 'fast, but a path runs beside it');
  assert.equal(bandOf(way('motorway', []), no), 'car');
  assert.equal(bandOf(way('trunk', [], { sub: 'link' }), no), 'car');
  assert.equal(bandOf(way('motorway', []), yes), 'mixed', 'a separate path beside it');
  assert.equal(bandOf(way('service', []), no), 'unknown');
  assert.equal(bandOf(way('track', []), no), 'unknown');
  assert.equal(bandOf(way('unclassified', []), no), 'unknown');
});

test('WK6: a footway running the street\'s way within 25 m is its sidewalk; one across, far, or on another level is not', () => {
  const road = way('residential', street, { speedKmh: 40 });
  const band = (...ws: WayFacts[]) => bandsFor([seg('s', street)], tiles([road, ...ws])).get('s');
  assert.equal(band(way('footway', line([0, 8], [200, 8]), { sub: 'sidewalk' })), 'foot');
  assert.equal(band(way('footway', line([0, -12], [200, -12]))), 'foot', 'a plain path beside it counts');
  assert.equal(band(way('footway', line([0, 40], [200, 40]), { sub: 'sidewalk' })), 'mixed', '40 m away is another street\'s');
  assert.equal(band(way('footway', line([100, -30], [100, 30]))), 'mixed', 'a path across is not a sidewalk');
  assert.equal(band(way('footway', line([0, 8], [200, 8]), { sub: 'sidewalk', level: 1 })), 'mixed', 'on a bridge above');
  const tagged = way('residential', street, { speedKmh: 40, sidewalk: 'separate' });
  assert.equal(bandsFor([seg('s', street)], tiles([tagged])).get('s'), 'foot', 'sidewalk=separate');
});

test('WK7: no sidewalk data never makes a street car by that alone', () => {
  const band = (cls: string, more: Partial<WayFacts> = {}) => bandsFor([seg('s', street)], tiles([way(cls, street, more)])).get('s');
  assert.equal(band('residential'), 'mixed', 'calm, nothing mapped');
  assert.equal(band('tertiary'), 'mixed');
  assert.equal(band('primary'), 'mixed', 'busy, nothing mapped');
  assert.equal(band('secondary', { speedKmh: 50 }), 'mixed');
  assert.equal(band('trunk'), 'car', 'by class');
  assert.equal(band('residential', { speedKmh: 80 }), 'car', 'by speed');
  assert.equal(band('tertiary', { sidewalk: 'none' }), 'mixed', 'mapped none on a minor class is still not car');
  assert.equal(band('secondary', { sidewalk: 'none' }), 'car');
});

test('WK8: a crossing near a short car stretch lifts it to mixed; a long one stays; a footbridge is its own foot', () => {
  const fast = way('primary', street, { speedKmh: 90 });
  const crossing = way('footway', line([100, -10], [100, 10]), { sub: 'crosswalk' });
  const shortSeg = { ...seg('short', line([80, 0], [130, 0])), length_m: 50 };
  const longSeg = seg('long', street);
  const alone = bandsFor([shortSeg, longSeg], tiles([fast]));
  assert.equal(alone.get('short'), 'car');
  const withCrossing = bandsFor([shortSeg, longSeg], tiles([fast, crossing]));
  assert.equal(withCrossing.get('short'), 'mixed', 'a crossing within 30 m of its end');
  assert.equal(withCrossing.get('long'), 'car', 'too long for a crossing to lift');
  // A footbridge over the road is a segment of its own and never takes the road's band.
  const bridge = way('footway', line([100, -40], [100, 40]), { level: 1 });
  const b = bandsFor([longSeg, seg('bridge', bridge.line)], tiles([fast, bridge]));
  assert.equal(b.get('bridge'), 'foot');
  assert.equal(b.get('long'), 'car');
});

test('WK9: bands are derived on read and never change the inputs', () => {
  const ws = [way('residential', street, { speedKmh: 40 }), way('footway', line([0, 8], [200, 8]), { sub: 'sidewalk' })];
  const t = tiles(ws);
  const before = JSON.stringify([...t]);
  const a = bandsFor([seg('s', street)], t);
  const b = bandsFor([seg('s', street)], t);
  assert.deepEqual([...a], [...b]);
  assert.equal(JSON.stringify([...t]), before);
  assert.equal(typeof WALK_CODE, 'string', 'a code to bump when the table changes');
});

test('WK10: a segment reads only its own tile: neighbours loaded or not change nothing; a missing tile is unknown', () => {
  const road = way('residential', street, { speedKmh: 40 });
  const walk = way('footway', line([0, 8], [200, 8]), { sub: 'sidewalk' });
  const plain = bandsFor([seg('s', street)], tiles([road, walk])).get('s');
  // Other tiles' ways, even right on top of the segment, are not used.
  const crowded = bandsFor([seg('s', street)], tiles([road, walk], { '1/1': [way('motorway', street)], '2/2': [way('footway', line([0, -8], [200, -8]))] })).get('s');
  assert.equal(crowded, plain);
  // The segment's own tile was never read: unknown, however near a neighbour's ways run.
  const noTile = bandsFor([seg('s', street)], new Map([['1/1', [way('motorway', street)]]])).get('s');
  assert.equal(noTile, 'unknown');
  // Read, but empty: also unknown.
  assert.equal(bandsFor([seg('s', street)], tiles([])).get('s'), 'unknown');
});
