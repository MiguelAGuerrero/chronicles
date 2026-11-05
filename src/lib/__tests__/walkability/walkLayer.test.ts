/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { routeSegments, tilesAround } from '../../walk/layer';
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

test('WK4: the tiles around a point are the few its radius touches, never more than 12', () => {
  const mid = tilesAround([-75.19, 40.69], 1000);
  assert.ok(mid.length >= 1 && mid.length <= 4, `${mid.length}`);
  assert.equal(tilesAround([-75.19, 40.69], 0).length, 1);
  assert.ok(tilesAround([-75.19, 40.69], 50_000).length <= 12);
  assert.deepEqual(tilesAround([-75.19, 40.69], 1000), mid, 'the same every time');
});
