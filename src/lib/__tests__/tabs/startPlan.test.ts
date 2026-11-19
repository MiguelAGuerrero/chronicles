/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { destLine, NAV_KEY, navValue, pendingDest, startPlan, tabFor } from '../../startPlan';
import type { Waypoint } from '../../nav/types';
import { setUnits } from '../../units';
import { formatRange } from '../../format';
import { EXPLORE_RULES } from '../../explore/explore';

const spot: Waypoint = { at: [-71.4, 41.812], label: 'Your spot', kind: 'point' };

test('NV25, MD12: a start with no destination writes nothing and opens the walk plainly', () => {
  const p = startPlan({ walkId: 'w1', dest: null });
  assert.deepEqual(p.meta, []);
  assert.equal(p.params, undefined);
});

test('MD12: a start writes no mode: no explore_walk, no explored stamp, no start_mode (decision 0231)', () => {
  const p = startPlan({ walkId: 'w1', dest: null, warning: 'Background off' });
  assert.deepEqual(p.meta, []);
  assert.equal((p.meta as [string, string][]).some(([k]) => /explore|start_mode/.test(k)), false);
});

test('NV25: a destination is saved in meta nav for the new walk, and the walk says it is recording', () => {
  const p = startPlan({ walkId: 'w1', dest: spot });
  assert.deepEqual(p.meta, [[NAV_KEY, navValue('w1', spot)]]);
  assert.deepEqual(JSON.parse(p.meta[0][1]), { walk_id: 'w1', dest: spot });
  assert.deepEqual(p.params, { started: '1' });
});

test('NV25: a recorder warning wins over the started note, as today', () => {
  const p = startPlan({ walkId: 'w1', dest: spot, warning: 'Background off' });
  assert.deepEqual(p.params, { warning: 'Background off' });
  assert.equal(p.meta.length, 1, 'only the destination');
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
  assert.equal(destLine(spot, near), 'Your spot · 320\u00a0m away');
  assert.equal(destLine(spot, null), 'Your spot');
});

test('NV1, NV2, NV5: three tabs in order, each with its own web path, Chronicle at the root (amended by HC1, HC3)', () => {
  assert.deepEqual(['chronicle', 'explore', 'navigate'].map((t) => tabFor(t as 'explore').path), ['/', '/explore', '/navigate']);
  assert.deepEqual(['chronicle', 'explore', 'navigate'].map((t) => tabFor(t as 'explore').route), ['index', 'explore', 'navigate']);
  assert.deepEqual(['chronicle', 'explore', 'navigate'].map((t) => tabFor(t as 'explore').label), ['Chronicle', 'Explore', 'Navigate']);
});

test('tend tabs 6: the destination’s distance follows the units setting, as every other distance does (QL14)', () => {
  const near: [number, number] = [-71.4, 41.812 + 320 / 111320];
  const far: [number, number] = [-71.4, 41.812 + 2400 / 111320];
  try {
    setUnits('mi');
    assert.equal(destLine(spot, near), 'Your spot · 0.2\u00a0mi away');
    assert.equal(destLine(spot, [-71.4, 41.812 + 100 / 111320]), 'Your spot · 328\u00a0ft away');
    assert.equal(destLine(spot, far), 'Your spot · 1.5\u00a0mi away');
    setUnits('km');
    assert.equal(destLine(spot, near), 'Your spot · 320\u00a0m away', 'metres still round to ten');
    assert.equal(destLine(spot, far), 'Your spot · 2.4\u00a0km away');
  } finally {
    setUnits('km');
  }
});

test('tend tabs audit 7: in miles the destination is converted from its own distance, never from metres rounded to ten', () => {
  try {
    setUnits('mi');
    // 162 m is 531 ft, past the 528 ft where miles take over; rounded to 160 m first it read "525 ft".
    assert.equal(destLine(spot, [-71.4, 41.812 + 162 / 111320]), 'Your spot · 0.1\u00a0mi away');
    assert.equal(destLine(spot, [-71.4, 41.812 + 101 / 111320]), 'Your spot · 331\u00a0ft away');
    setUnits('km');
    assert.equal(destLine(spot, [-71.4, 41.812 + 162 / 111320]), 'Your spot · 160\u00a0m away', 'metres still round to ten');
  } finally {
    setUnits('km');
  }
});

test('tend tabs audit 6: every step of the "?" range reads a distinct value, in miles as in metres', () => {
  const steps: number[] = [];
  for (let m = EXPLORE_RULES.rangeMin; m <= EXPLORE_RULES.rangeMax; m += EXPLORE_RULES.rangeStep) steps.push(m);
  const mi = steps.map((m) => formatRange(m, 'mi'));
  assert.equal(new Set(mi).size, steps.length, `each step its own value: ${mi.join(', ')}`);
  assert.ok(mi.every((t) => /[ \u00a0]ft$/.test(t)), 'a range this short is said in feet');
  assert.equal(formatRange(100, 'mi'), '328\u00a0ft');
  assert.equal(formatRange(100, 'km'), '100\u00a0m');
  assert.equal(new Set(steps.map((m) => formatRange(m, 'km'))).size, steps.length);
});
