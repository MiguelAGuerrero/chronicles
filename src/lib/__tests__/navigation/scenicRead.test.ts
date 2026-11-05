import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../../components/map/types';
import { createScenicRead } from '../../nav/scenicRead/shell';
import { corridorBounds } from '../../nav/scenicSignals';
import { tilesIn } from '../../tileMath';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';
import { at, names, roads } from '../foxPoint';

// Scenic routes, SR9 and SR13: the corridor's read, a shell over fakes. It asks only the tile host
// and Overture for the tiles between the two ends; a failure or a Cancel gives nothing, so the
// walk screen goes the direct way.

const URL = 'https://tiles.example/{z}/{x}/{y}.pbf';
const park: LngLat[][] = [[at(0.5, 0.8), at(2.5, 0.8), at(2.5, 1.2), at(0.5, 1.2), at(0.5, 0.8)]];
const features = (): CollectedFeatures => ({
  roads,
  names,
  places: [],
  pois: [
    { geometry: { type: 'Point', coordinates: at(1.5, 1) }, properties: { class: 'park', subclass: 'park', name: 'Fox Point Park' }, zoom: 14 },
    { geometry: { type: 'Point', coordinates: at(2, 1.2) }, properties: { class: 'monument', subclass: 'monument', name: 'Old Bell' }, zoom: 14 },
  ],
  landcover: [{ geometry: { type: 'Polygon', coordinates: park }, properties: { class: 'grass', subclass: 'park' }, zoom: 14 }],
  complete: true,
});

async function setup() {
  const p = fakePorts();
  await p.db.setMeta('tile_url', URL);
  await p.db.setMeta('tile_build', 'b1');
  const calls: { host: string; tiles: [number, number][] }[] = [];
  const io = {
    fetchTiles: async (url: string, tiles: [number, number][], _zoom?: number, _stop?: () => boolean) => {
      calls.push({ host: url, tiles });
      return features();
    },
    readOverture: async (tiles: [number, number][], _stop?: () => boolean) => {
      calls.push({ host: 'overture', tiles });
      return null;
    },
  };
  return { p, io, calls };
}

const from = at(0, 0);
const to = at(3, 0);

test('SR13: only the tile host and Overture are asked, for the corridor\'s tiles', async () => {
  const { p, io, calls } = await setup();
  const r = await createScenicRead(p, io).read(from, to, () => false);
  assert.ok(r, 'a read');
  const want = tilesIn(corridorBounds(from, to));
  assert.deepEqual(calls.map((c) => c.host).sort(), [URL, 'overture'].sort());
  for (const c of calls) assert.deepEqual(c.tiles, want);
  assert.ok(r.segments.length > 0, 'the streets');
  assert.equal(r.signals.green.length, 1);
  assert.equal(r.signals.green[0].name, 'Fox Point Park', 'named by the park inside it');
  assert.ok(Array.isArray(r.signals.busy), 'no Overture: busy from the map alone');
});

test('SR13: Cancel during the read gives nothing', async () => {
  const { p, io } = await setup();
  let stop = false;
  const slow = { ...io, fetchTiles: async (...a: Parameters<typeof io.fetchTiles>) => { stop = true; return io.fetchTiles(...a); } };
  assert.equal(await createScenicRead(p, slow).read(from, to, () => stop), null);
});

test('SR9: a failed tile read, or no tile host yet, gives nothing', async () => {
  const { p, io } = await setup();
  const failing = { ...io, fetchTiles: async () => { throw new Error('offline'); } };
  assert.equal(await createScenicRead(p, failing).read(from, to, () => false), null);
  const bare = fakePorts();
  assert.equal(await createScenicRead(bare, io).read(from, to, () => false), null, 'no tile_url');
});

test('SR6: a found place is said as found; a kind switched off is no sight', async () => {
  const { p, io } = await setup();
  const r = await createScenicRead(p, io).read(from, to, () => false);
  assert.deepEqual(r?.signals.sights.map((s) => [s.name, s.found]), [['Old Bell', false]]);
  await p.db.setMeta('explore_hidden', JSON.stringify(['monuments']));
  const off = await createScenicRead(p, io).read(from, to, () => false);
  assert.deepEqual(off?.signals.sights, []);
});
