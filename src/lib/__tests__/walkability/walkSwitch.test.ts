/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tilesAround } from '../../walk/layer';
import { createWalkSwitch } from '../../walk/switch';
import { fakePorts } from '../fakes';

// Walkability (WK13, WK20), written from specs/walkability/spec.md before the code.

test('WK13: the layer is off until switched on, one setting for every map', async () => {
  const p = fakePorts();
  const sw = createWalkSwitch(p);
  assert.equal(sw.store.get().on, false);
  await sw.load();
  assert.equal(sw.store.get().on, false);
  await sw.set(true);
  assert.equal(sw.store.get().on, true);
});

test('WK20: the switch survives a reload', async () => {
  const p = fakePorts();
  await createWalkSwitch(p).set(true);
  const again = createWalkSwitch(p);
  assert.equal(again.store.get().on, false, 'before it is loaded');
  await again.load();
  assert.equal(again.store.get().on, true);
  await again.set(false);
  const third = createWalkSwitch(p);
  await third.load();
  assert.equal(third.store.get().on, false);
});

test('WK4: the tiles around a point are the few its radius touches, never more than 12', () => {
  const mid = tilesAround([-75.19, 40.69], 1000);
  assert.ok(mid.length >= 1 && mid.length <= 4, `${mid.length}`);
  assert.equal(tilesAround([-75.19, 40.69], 0).length, 1);
  assert.ok(tilesAround([-75.19, 40.69], 50_000).length <= 12);
  assert.deepEqual(tilesAround([-75.19, 40.69], 1000), mid, 'the same every time');
});
