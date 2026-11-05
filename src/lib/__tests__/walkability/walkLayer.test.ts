/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { walkabilityGeoJSON } from '../../../components/map/types';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { drawFor, routeSegments } from '../../walk/layer';
import { walkTileKey } from '../../walk/match';
import { waysFromOverpass } from '../../walk/overpass';
import type { WayFacts } from '../../walk/types';

// Walkability (WK13, WK15), written from specs/walkability/spec.md before the code.

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy: number): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
let n = 0;
const way = (cls: string, p: [number, number][], more: Partial<WayFacts> = {}): WayFacts => ({ id: `w${n++}`, cls, level: 0, line: p.map(([x, y]) => at(x, y)), ...more });
const home = tileAt(O);
const tiles = (ws: WayFacts[]) => new Map([[walkTileKey(home.x, home.y), ws]]);

test('WK13: only car and mixed stretches are drawn; foot and unknown draw as nothing', () => {
  const ws = [
    way('motorway', [[0, 0], [300, 0]]),
    way('residential', [[0, 100], [300, 100]], { speedKmh: 40 }),
    way('residential', [[0, 200], [300, 200]], { speedKmh: 40, sidewalk: 'both' }),
    way('pedestrian', [[0, 300], [300, 300]]),
    way('service', [[0, 400], [300, 400]]),
    way('footway', [[0, 700], [300, 700]], { sub: 'sidewalk' }),
  ];
  const d = drawFor(tiles(ws));
  assert.equal(d.car.length, 1);
  assert.equal(d.mixed.length, 1);
  const fc = walkabilityGeoJSON(d);
  assert.deepEqual(fc.features.map((f) => f.properties!.band).sort(), ['car', 'mixed']);
  assert.equal(walkabilityGeoJSON(null).features.length, 0);
  assert.ok(d.key.length > 0 && drawFor(tiles(ws)).key === d.key, 'a key that changes only when the picture does');
});

test('WK15: a route sees the roads of its tiles as named segments with their bands', () => {
  const ws = [way('motorway', [[0, 0], [300, 0]], { name: 'Route 22' }), way('footway', [[0, 8], [300, 8]], { sub: 'sidewalk' })];
  const { segments, bands } = routeSegments(tiles(ws));
  assert.equal(segments.length, 1, 'footways are not streets of a route');
  assert.equal(segments[0].name, 'Route 22');
  assert.equal(bands.get(segments[0].id), 'mixed', 'a path beside a motorway');
});

test('WK15: street names come with the ways from both sources', () => {
  const ways = waysFromOverpass({ elements: [{ type: 'way', id: 1, tags: { highway: 'primary', name: 'Main Street' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.691, lon: -75.19 }] }] });
  assert.equal(ways[0].name, 'Main Street');
});
