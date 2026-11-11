/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Archive } from '../../activity/release';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { createBuildingsReader } from '../../walk/buildings';
import { buildingsFromTile } from '../../walk/buildingsTile';
import { encodeTile, type FixtureFeature } from '../mvtFixture';

// The buildings read (specs/place-form PF3, PF17): Overture's `building` layer reduced to a centroid each, read through the generic tile reader.

const O: LngLat = [-76.3, 40.5];
const T = tileAt(O);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / 84_000, O[1] + dy / 110_540];
const square = (cx: number, cy: number, half = 8): FixtureFeature => ({
  layer: 'building',
  props: { id: `b${cx},${cy}` },
  coords: [[at(cx - half, cy - half), at(cx + half, cy - half), at(cx + half, cy + half), at(cx - half, cy + half), at(cx - half, cy - half)]],
});
const bytes = (...f: FixtureFeature[]) => encodeTile(f, 14, T.x, T.y).buffer as ArrayBuffer;
const near = (a: LngLat, b: LngLat) => Math.abs(a[0] - b[0]) < 2e-5 && Math.abs(a[1] - b[1]) < 2e-5;

test('PF3: a building tile is read as one centroid per building, and nothing else is kept', () => {
  const out = buildingsFromTile(bytes(square(0, 0), square(100, 40), { layer: 'segment', props: { subtype: 'road' }, coords: [at(0, 0), at(50, 0)] }), T.x, T.y);
  assert.equal(out.length, 2);
  assert.ok(near(out[0].at, at(0, 0)) && near(out[1].at, at(100, 40)), 'at the middle of each footprint');
  assert.deepEqual(buildingsFromTile(bytes({ layer: 'segment', props: { subtype: 'road' }, coords: [at(0, 0), at(50, 0)] }), T.x, T.y), [], 'no building layer is an empty tile');
});

const archiveOf = (data: ArrayBuffer | null): Archive => ({ getZxy: async () => (data ? { data } : undefined) });

test('PF3: the reader gives the centroids of the tiles asked for, a building on two tiles once, and nothing is stored', async () => {
  const tile = bytes(square(0, 0), square(60, 0), square(120, 0));
  const reader = createBuildingsReader({ release: async () => '2026-10-21.0', open: () => archiveOf(tile) });
  // The same tile twice, as a building on an edge arrives from both of its tiles: each building is one.
  const got = await reader.read([[T.x, T.y], [T.x, T.y]]);
  assert.equal(got!.length, 3);
  assert.deepEqual(await createBuildingsReader({ release: async () => '2026-10-21.0', open: () => archiveOf(null) }).read([[T.x, T.y]]), [], 'a tile with nothing in it is a read that found none');
});

test('PF17: a release that cannot be found, a failing archive, or a read told to stop is null, never an empty list', async () => {
  assert.equal(await createBuildingsReader({ release: async () => null, open: () => archiveOf(null) }).read([[T.x, T.y]]), null, 'no release known');
  const failing: Archive = { getZxy: async () => { throw new Error('offline'); } };
  assert.equal(await createBuildingsReader({ release: async () => '2026-10-21.0', open: () => failing }).read([[T.x, T.y]]), null, 'the archive fails');
  assert.equal(await createBuildingsReader({ release: async () => '2026-10-21.0', open: () => archiveOf(bytes(square(0, 0))) }).read([[T.x, T.y]], () => true), null, 'told to stop');
});

test('PF17: a read that stalls gives up at its deadline and is null', async () => {
  const stalled: Archive = { getZxy: () => new Promise(() => {}) };
  const reader = createBuildingsReader({ release: async () => '2026-10-21.0', open: () => stalled, tileMs: 40, readMs: 80 });
  assert.equal(await reader.read([[T.x, T.y]]), null);
});
