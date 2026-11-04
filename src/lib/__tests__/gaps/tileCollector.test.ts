import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_DERIVE_VIEWS } from '../../../components/map/types';
import { tileAt } from '../../tileMath';
import { tileCollectorOf } from '../../tileCollector/shell';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';
import { at } from '../foxPoint';

// The replay's tile reads with no camera moves (Filling gaps, G12; specs/test-gaps, TD6).

const empty = { roads: [], names: [], places: [], complete: true } as never;

test('TD6 the streets are read from the tiles the walk crossed, each z14 tile once, at most as many as the map reads', async () => {
  const p = fakePorts();
  await p.db.setMeta('tile_url', 'https://tiles.example/{z}/{x}/{y}.pbf');
  const asked: { url: string; tiles: [number, number][]; zoom?: number }[] = [];
  const c = tileCollectorOf({ ...p, fetchTiles: async (url, tiles, zoom) => { asked.push({ url, tiles, zoom }); return empty; } });
  const trace: LngLat[] = Array.from({ length: 40 }, (_, i) => at(i * 0.5, 0));
  const centres = c.plan([0, 0, 0, 0], trace);
  assert.ok(centres.length > 1 && centres.length <= MAX_DERIVE_VIEWS, `${centres.length} views`);
  await c.collect([...centres, centres[0], at(0, 0)]);
  const keys = asked[0].tiles.map(([x, y]) => `${x},${y}`);
  assert.equal(new Set(keys).size, keys.length, 'each tile once');
  assert.ok(keys.includes(`${tileAt(at(0, 0)).x},${tileAt(at(0, 0)).y}`));
  assert.equal(asked[0].url, 'https://tiles.example/{z}/{x}/{y}.pbf');
});

test('TD6 without a tile address the read fails; a failed read of place points gives none', async () => {
  const p = fakePorts();
  const c = tileCollectorOf({ ...p, fetchTiles: async () => empty });
  await assert.rejects(c.collect([at(0, 0)]), /No tile URL/);
  await p.db.setMeta('tile_url', 'https://tiles.example/{z}/{x}/{y}.pbf');
  const failing = tileCollectorOf({ ...p, fetchTiles: async () => { throw new Error('offline'); } });
  assert.equal(await failing.collectPlaces(at(0, 0)), null);
});
