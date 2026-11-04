/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { outlineOf } from '../areas/borders';
import { outlineTileFrom } from '../areas/divisionTiles';
import { outlineSet, type OutlineTile } from '../areas/outlines';
import type { TileFeature } from '../areas/tilePlaces';
import { extentTiles, inExtent, TILE_BUDGET } from '../atlas/extent';
import { distanceM } from '../geo';
import type { LngLat } from '../types';

// Town presence (TP1-TP3): the whole outline is the z10 read the borders draw from, never the z12
// pieces that are cut at tile edges. Both are Overture's real divisions (release 2026-10-21.0).
const require = createRequire(import.meta.url);
type Fixture = { release: string; z: number; tiles: { x: number; y: number; division_area: TileFeature[]; division: TileFeature[] }[] };
const tilesOf = (f: Fixture): OutlineTile[] => f.tiles.map((t) => outlineTileFrom(t.x, t.y, f.release, 1, t, f.z));
const z10 = outlineSet(tilesOf(require('./townBorders.json') as Fixture));
const z12 = outlineSet(tilesOf({ z: 12, ...(require('./townOutlines.json') as Omit<Fixture, 'z'>) }));

const LABEL: LngLat = [-75.507445, 40.657413];
const CORRIDOR: LngLat = [-75.4841, 40.6342];

test('TP2: the extent is the whole-town outline, wider than the z12 pieces that were read', () => {
  const whole = outlineOf({ name: 'Whitehall', at: LABEL }, z10)!;
  const piece = outlineOf({ name: 'Whitehall', at: LABEL }, z12)!;
  assert.ok(whole.areaM2 > piece.areaM2, 'the z12 read is clipped at its tiles; the z10 one holds the town');
  assert.equal(inExtent(CORRIDOR, whole), true, 'MacArthur Road and the mall are in the whole outline');
  assert.equal(inExtent([-75.4, 40.5], whole), false);
  assert.equal(inExtent(LABEL, whole), true);
});

test('TP3: a read takes the outline\'s tiles, nearest the point first, capped; a capped town is partial', () => {
  const whole = outlineOf({ name: 'Whitehall', at: LABEL }, z10)!;
  const all = extentTiles(whole, LABEL, 1000);
  assert.equal(all.partial, false);
  assert.ok(all.tiles.length >= 15 && all.tiles.length <= TILE_BUDGET, `Whitehall touches ${all.tiles.length} tiles: a read takes them whole`);
  const cut = extentTiles(whole, LABEL, 10);
  assert.equal(cut.tiles.length, 10);
  assert.equal(cut.partial, true);
  // Nearest first: the kept tiles are the ones around the point.
  const keptFar = Math.max(...cut.tiles.map(([x, y]) => distanceM(centreOf(x, y), LABEL)));
  const droppedNear = Math.min(...all.tiles.filter((t) => !cut.tiles.some((k) => k[0] === t[0] && k[1] === t[1])).map(([x, y]) => distanceM(centreOf(x, y), LABEL)));
  assert.ok(keptFar <= droppedNear + 1, 'nothing nearer was dropped');
  assert.equal(extentTiles(whole, LABEL).partial, false, 'the default budget holds Whitehall');
});

function centreOf(x: number, y: number): LngLat {
  const n = 2 ** 14;
  const lon = ((x + 0.5) / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n))) * 180) / Math.PI;
  return [lon, lat];
}
