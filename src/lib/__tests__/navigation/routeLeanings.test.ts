import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRouteLeanings, ROUTE_LEANINGS_KEY } from '../../routeLeanings/shell';
import { fakePorts } from '../fakes';

// Scenic routes, SR1: the three leanings are settings, all on by default, kept across a reload.

test('SR1: all three leanings are on by default', async () => {
  const r = createRouteLeanings(fakePorts());
  assert.deepEqual(r.store.get(), ['green', 'sights', 'busy'], 'before the load');
  await r.load();
  assert.deepEqual(r.store.get(), ['green', 'sights', 'busy'], 'nothing saved yet');
});

test('SR1: a change is kept across a reload, in leaning order', async () => {
  const p = fakePorts();
  await createRouteLeanings(p).save(['busy', 'green']);
  const again = createRouteLeanings(p);
  await again.load();
  assert.deepEqual(again.store.get(), ['green', 'busy']);
});

test('SR1: all off is kept as all off, not read back as the default', async () => {
  const p = fakePorts();
  const r = createRouteLeanings(p);
  await r.save([]);
  assert.deepEqual(r.store.get(), [], 'the store changes at once');
  const again = createRouteLeanings(p);
  await again.load();
  assert.deepEqual(again.store.get(), []);
});

test('SR1: an unreadable value or a failed read gives the defaults', async () => {
  const p = fakePorts();
  await p.db.setMeta(ROUTE_LEANINGS_KEY, '["purple"');
  const r = createRouteLeanings(p);
  await r.load();
  assert.deepEqual(r.store.get(), ['green', 'sights', 'busy']);
  await p.db.setMeta(ROUTE_LEANINGS_KEY, '["purple","sights"]');
  await r.load();
  assert.deepEqual(r.store.get(), ['sights'], 'unknown leanings are dropped');
  p.db.failNext('getMeta', new Error('disk'));
  const s = createRouteLeanings(p);
  await s.load();
  assert.deepEqual(s.store.get(), ['green', 'sights', 'busy']);
});
