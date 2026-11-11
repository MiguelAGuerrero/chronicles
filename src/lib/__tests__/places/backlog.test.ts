import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBacklog } from '../../backlog/shell';
import type { Collector } from '../../finish';
import type { Walk } from '../../types';

const walk = (id: string): Walk => ({
  id, started_at: 0, ended_at: 1, title: null, epilogue: null, open: false, area: null, snapped_build: null,
});
const EMPTY = { roads: [], names: [], places: [], pois: [], complete: true };
const tiles = (): Collector => ({ plan: () => [], collect: async () => EMPTY, collectPlaces: async () => [] });

// The owner, Nov 11: the cover hid the map while old walks were placed through it, the camera jumping to each.
test('fix background-placing 1: old walks are placed from the tiles, one after another, each reported as placed', async () => {
  const collector = tiles();
  const snapped: string[] = [];
  const order: string[] = [];
  const place = createBacklog({
    tileBuild: async () => 'b1',
    collector: () => collector,
    still: async () => true,
    snap: async (w, c) => {
      // The tile collector, wrapped in time limits: never the home map.
      await c.collect([]);
      snapped.push(w.id);
      order.push(`snap ${w.id}`);
    },
  });
  const r = await place([walk('a'), walk('b')], {
    onAttempt: (id) => order.push(`start ${id}`),
    onProgress: (done) => order.push(`done ${done}`),
  });
  assert.deepEqual(r, { placed: ['a', 'b'], failed: [] });
  assert.deepEqual(snapped, ['a', 'b']);
  assert.deepEqual(order, ['start a', 'snap a', 'done 1', 'start b', 'snap b', 'done 2']);
});

test('fix background-placing 2: a walk deleted, or waiting on Undo, since the pass began is never placed', async () => {
  const snapped: string[] = [];
  const place = createBacklog({
    tileBuild: async () => 'b1',
    collector: tiles,
    still: async (id) => id !== 'gone',
    snap: async (w) => {
      snapped.push(w.id);
    },
  });
  const r = await place([walk('gone'), walk('kept')], {});
  assert.deepEqual(snapped, ['kept']);
  assert.deepEqual(r, { placed: ['kept'], failed: ['gone'] });
});

test('fix background-placing 3: a tile read that never answers fails its walk, and the pass goes on', async () => {
  const snapped: string[] = [];
  const place = createBacklog({
    tileBuild: async () => 'b1',
    collector: () => ({ ...tiles(), collect: (c) => (c.length ? new Promise(() => {}) : Promise.resolve(EMPTY)) }),
    still: async () => true,
    snap: async (w, c) => {
      await c.collect(w.id === 'hangs' ? [[0, 0]] : []);
      snapped.push(w.id);
    },
    ms: { collect: 20, places: 20 },
  });
  const r = await place([walk('hangs'), walk('fine')], {});
  assert.deepEqual(r, { placed: ['fine'], failed: ['hangs'] });
});

test('fix background-placing 4: with no tile build known, nothing is tried', async () => {
  let snaps = 0;
  const attempts: string[] = [];
  const place = createBacklog({
    tileBuild: async () => 'unknown',
    collector: tiles,
    still: async () => true,
    snap: async () => {
      snaps++;
    },
  });
  const r = await place([walk('a')], { onAttempt: (id) => attempts.push(id) });
  assert.equal(snaps, 0);
  assert.deepEqual(attempts, []);
  assert.deepEqual(r, { placed: [], failed: ['a'] });
});
