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
  const { placeBacklog: place } = createBacklog({
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
  const { placeBacklog: place } = createBacklog({
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

test('fix background-placing 3: a tile read that never answers is cut off, and the pass goes on', async () => {
  const snapped: string[] = [];
  const { placeBacklog: place } = createBacklog({
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
  const { placeBacklog: place } = createBacklog({
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

// Audit 1: a section switch remounts Chronicle mid-pass; the new screen joined the old pass's callbacks, lost
// "Placing…" and the star, and the walks after the one at hand were never tried.
test('fix background-placing audit 1: a second pass waits for the one under way, then places its own walks; the walk at hand is in the store', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const snapped: string[] = [];
  const { placeBacklog, status } = createBacklog({
    tileBuild: async () => 'b1',
    collector: tiles,
    still: async () => true,
    snap: async (w) => {
      if (w.id === 'x') await gate;
      snapped.push(w.id);
    },
  });
  let leftFirst = false;
  const first = placeBacklog([walk('x'), walk('y')], { stopped: () => leftFirst });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(status.get().at, 'x');
  // The screen is left mid-walk and a new one asks for what is still waiting.
  leftFirst = true;
  const attempts: string[] = [];
  const second = placeBacklog([walk('y'), walk('z')], { onAttempt: (id) => attempts.push(id) });
  release();
  assert.deepEqual(await first, { placed: ['x'], failed: [] });
  assert.deepEqual(await second, { placed: ['y', 'z'], failed: [] });
  assert.deepEqual(snapped, ['x', 'y', 'z']);
  assert.deepEqual(attempts, ['y', 'z']);
  assert.deepEqual(status.get(), { at: null, placed: 3 });
});

// Audit 10: each section switch queued a pass for a screen already gone, and two queued passes placed the same walk.
test('fix background-placing audit 10: a pass whose screen left before it began places nothing, and no walk is placed twice', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const snapped: string[] = [];
  const { placeBacklog } = createBacklog({
    tileBuild: async () => 'b1',
    collector: tiles,
    still: async () => true,
    snap: async (w) => {
      if (w.id === 'x') await gate;
      snapped.push(w.id);
    },
  });
  let leftA = false;
  const a = placeBacklog([walk('x'), walk('y'), walk('z')], { stopped: () => leftA });
  await new Promise((r) => setTimeout(r, 0));
  // A's screen goes mid-walk, B's screen comes and goes while x is read, and C is in front.
  leftA = true;
  const b = placeBacklog([walk('y'), walk('z')], { stopped: () => true });
  const c = placeBacklog([walk('x'), walk('y'), walk('z')], {});
  release();
  await Promise.all([a, b]);
  assert.deepEqual(await c, { placed: ['y', 'z'], failed: [] });
  assert.deepEqual(snapped, ['x', 'y', 'z']);
});
