/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXPLORE_KEY, exploredKey } from '../explore/explore';
import { destLine, NAV_KEY, navValue, parseStartMode, pendingDest, START_MODE_KEY, startPlan, tabFor } from '../startPlan';
import type { Waypoint } from '../nav/types';

const spot: Waypoint = { at: [-71.4, 41.812], label: 'Your spot', kind: 'point' };

test('NV22: the mode opens on Quiet the first time, then on the last one picked', () => {
  assert.equal(START_MODE_KEY, 'start_mode');
  assert.equal(parseStartMode(null), 'quiet');
  assert.equal(parseStartMode(''), 'quiet');
  assert.equal(parseStartMode('nonsense'), 'quiet');
  assert.equal(parseStartMode('explore'), 'explore');
  assert.equal(parseStartMode('quiet'), 'quiet');
});

test('NV25: a quiet start with no destination writes nothing and opens the walk plainly', () => {
  const p = startPlan({ walkId: 'w1', now: 1000, mode: 'quiet', dest: null });
  assert.deepEqual(p.meta, []);
  assert.equal(p.params, undefined);
});

test('NV25: Explore marks the walk as exploring from the moment it starts (E1)', () => {
  const p = startPlan({ walkId: 'w1', now: 1234, mode: 'explore', dest: null });
  assert.deepEqual(p.meta, [[EXPLORE_KEY, 'w1'], [exploredKey('w1'), '1234']]);
});

test('NV25: a destination is saved in meta nav for the new walk, and the walk says it is recording', () => {
  const p = startPlan({ walkId: 'w1', now: 1, mode: 'quiet', dest: spot });
  assert.deepEqual(p.meta, [[NAV_KEY, navValue('w1', spot)]]);
  assert.deepEqual(JSON.parse(p.meta[0][1]), { walk_id: 'w1', dest: spot });
  assert.deepEqual(p.params, { started: '1' });
});

test('NV25: a recorder warning wins over the started note, as today', () => {
  const p = startPlan({ walkId: 'w1', now: 1, mode: 'explore', dest: spot, warning: 'Background off' });
  assert.deepEqual(p.params, { warning: 'Background off' });
  assert.equal(p.meta.length, 3);
});

test('NV22, NV23: the drawer keeps its destination in nav with no walk yet; a walk’s own is not the drawer’s', () => {
  assert.deepEqual(pendingDest(navValue(null, spot)), spot);
  assert.equal(pendingDest(navValue('w1', spot)), null, 'an open walk’s destination is not a drawer choice');
  assert.equal(pendingDest(''), null, 'Stop clears it');
  assert.equal(pendingDest(null), null);
  assert.equal(pendingDest('{bad'), null);
});

test('NV20: the destination shows its name and straight-line distance', () => {
  const near: [number, number] = [-71.4, 41.812 + 320 / 111320];
  assert.equal(destLine(spot, near), 'Your spot · 320 m away');
  assert.equal(destLine(spot, null), 'Your spot');
});

test('NV1, NV5: three tabs in order, each with its own web path', () => {
  assert.deepEqual(['explore', 'navigate', 'chronicle'].map((t) => tabFor(t as 'explore').path), ['/explore', '/', '/chronicle']);
  assert.deepEqual(['explore', 'navigate', 'chronicle'].map((t) => tabFor(t as 'explore').label), ['Explore', 'Navigate', 'Chronicle']);
});
