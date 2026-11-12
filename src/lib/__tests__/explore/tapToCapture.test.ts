/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { armedFind, armedLine, armedStill, clampPass, EXPLORE_RULES, passedAlong, passedPlaces, passFor, revealedKeys, walkPassKey, type ChecklistItem, type Kind } from '../../explore/explore';

// Tap to capture a place, and a quiet pass-by (specs/tap-to-capture-places): written before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const item = (name: string, at: LngLat, kind: Kind = 'museums'): ChecklistItem => ({
  key: `k:${name}`, area_key: 'A', name, category: 'culture', kind, at, generic: false,
});

test('TC1: a capture near unfound places finds nothing by itself, with one place or several', () => {
  const a = item('Museum', m(10, 0));
  const b = item('Statue', m(20, 0));
  assert.equal(armedFind(null, ['c1']), null);
  assert.equal(armedFind(null, ['c1', 'c2']), null);
  assert.equal(armedFind(null, ['c1']), null, `${a.name} and ${b.name} are within 60 m and found nothing`);
});

test('TC2: a moment made outside a walk finds nothing by itself (momentFind is gone)', () => {
  assert.equal(existsSync(new URL('../../explore/momentFind/shell.ts', import.meta.url)), false);
});

test('TC3: the armed place is the one tapped, and its line is plain words', () => {
  const a = item('Old Bridge', m(10, 0));
  assert.equal(armedLine(a), 'The next moment is about Old Bridge');
});

test('TC4: the next capture finds the armed place; arming clears after it, past 60 m, and on another walk', () => {
  const a = item('Old Bridge', m(10, 0));
  const armed = { item: a, walkId: 'w1' };
  assert.deepEqual(armedFind(armed, ['c1', 'c2']), { item: a, captureId: 'c1' }, 'the first capture only');
  assert.deepEqual(armedStill(armed, m(30, 0), 'w1'), armed, 'within reach');
  assert.equal(armedStill(armed, m(90, 0), 'w1'), null, 'farther than 60 m');
  assert.equal(armedStill(armed, m(5, 0), 'w2'), null, 'another walk');
  assert.equal(armedStill(armed, null, 'w1') !== null, true, 'no fix yet keeps it');
});

test('TC5: plain capture is unchanged: no arming is needed to keep a moment', () => {
  assert.equal(armedFind(null, []), null);
});

test('TC6: a place is passed within the pass-by distance, not 60 m, and never when found', () => {
  const a = item('Museum', m(300, 0));
  const fixes = [{ at: m(0, 0), t: 1 }, { at: m(280, 0), t: 2 }];
  assert.equal(passedPlaces({ items: [a], fixes, since: 0, hidden: new Set(), foundHere: new Set() }).length, 0, '20 m is not a pass at the default');
  const near = [...fixes, { at: m(296, 0), t: 3 }];
  assert.deepEqual(passedAlong({ items: [a], fixes: near, since: 0, hidden: new Set(), foundHere: new Set() }).map((p) => p.t), [3]);
  assert.equal(passedPlaces({ items: [a], fixes: near, since: 0, hidden: new Set(), foundHere: new Set([a.key]) }).length, 0);
  assert.equal(passedPlaces({ items: [a], fixes, since: 0, hidden: new Set(), foundHere: new Set(), passM: 20 }).length, 1, 'a wider setting passes it');
});

test('TC7: the pass-by distance is 4-20 m in steps of 2, default 8, clamped', () => {
  const r = EXPLORE_RULES;
  assert.deepEqual([r.passMin, r.passMax, r.passStep, r.passDefault], [4, 20, 2, 8]);
  assert.equal(clampPass(NaN), 8);
  assert.equal(clampPass(1), 4);
  assert.equal(clampPass(99), 20);
  assert.equal(clampPass(9), 10);
});

test('TC8: places within 60 m are still named on the map', () => {
  assert.equal(EXPLORE_RULES.revealM, 60);
  assert.equal(revealedKeys([item('P', m(50, 0))], [O]).size, 1);
});

test('TC9: a walk keeps the pass-by distance it was walked with', () => {
  assert.equal(walkPassKey('w1'), 'walk_pass:w1');
  assert.equal(passFor(null), 8, 'a walk with no value reads the default');
  assert.equal(passFor('14'), 14);
  assert.equal(passFor('junk'), 8);
});
