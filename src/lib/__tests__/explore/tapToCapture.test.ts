/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../geo';
import * as ex from '../../explore/explore';
import { EXPLORE_RULES, passedAlong, passedPlaces, type ChecklistItem, type Kind } from '../../explore/explore';

// Tap to capture a place, and a quiet pass-by (specs/tap-to-capture-places): written before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const item = (name: string, at: LngLat, kind: Kind = 'museums'): ChecklistItem => ({
  key: `k:${name}`, area_key: 'A', name, category: 'culture', kind, at, generic: false,
});
// Anything beyond the shipped core is reached through `ex` so the file loads before the code exists.
const x = ex as unknown as Record<string, (...a: unknown[]) => unknown>;

test('TC1: a capture near unfound places finds nothing by itself, with one place or several', { todo: 'test first' }, () => {
  const a = item('Museum', m(10, 0));
  const b = item('Statue', m(20, 0));
  assert.equal(x.armedFind(null, ['c1']), null);
  assert.equal(x.armedFind(null, ['c1', 'c2']), null);
  assert.equal(x.findsByItself, undefined, 'no function finds from a capture alone');
  void a; void b;
});

test('TC2: a moment made outside a walk finds nothing by itself (momentFind is gone)', { todo: 'test first' }, () => {
  assert.equal(existsSync(new URL('../../explore/momentFind/shell.ts', import.meta.url)), false);
});

test('TC3: the armed place is the one tapped, and its line is plain words', { todo: 'test first' }, () => {
  const a = item('Old Bridge', m(10, 0));
  assert.equal(x.armedLine(a), 'The next moment is about Old Bridge');
});

test('TC4: the next capture finds the armed place; arming clears after it, past 60 m, and on another walk', { todo: 'test first' }, () => {
  const a = item('Old Bridge', m(10, 0));
  const armed = { item: a, walkId: 'w1' };
  assert.deepEqual(x.armedFind(armed, ['c1', 'c2']), { item: a, captureId: 'c1' }, 'the first capture only');
  assert.deepEqual(x.armedStill(armed, m(30, 0), 'w1'), armed, 'within reach');
  assert.equal(x.armedStill(armed, m(90, 0), 'w1'), null, 'farther than 60 m');
  assert.equal(x.armedStill(armed, m(5, 0), 'w2'), null, 'another walk');
  assert.equal(x.armedStill(armed, null, 'w1') !== null, true, 'no fix yet keeps it');
});

test('TC5: plain capture is unchanged: no arming is needed to keep a moment', { todo: 'test first' }, () => {
  assert.equal(x.armedFind(null, []), null);
});

test('TC6: a place is passed within the pass-by distance, not 60 m, and never when found', { todo: 'test first' }, () => {
  const a = item('Museum', m(300, 0));
  const fixes = [{ at: m(0, 0), t: 1 }, { at: m(280, 0), t: 2 }];
  assert.equal(passedPlaces({ items: [a], fixes, since: 0, hidden: new Set(), foundHere: new Set() }).length, 0, '20 m is not a pass at the default');
  const near = [...fixes, { at: m(296, 0), t: 3 }];
  assert.deepEqual(passedAlong({ items: [a], fixes: near, since: 0, hidden: new Set(), foundHere: new Set() }).map((p) => p.t), [3]);
  assert.equal(passedPlaces({ items: [a], fixes: near, since: 0, hidden: new Set(), foundHere: new Set([a.key]) }).length, 0);
  assert.equal(passedPlaces({ items: [a], fixes, since: 0, hidden: new Set(), foundHere: new Set(), passM: 20 } as never).length, 1, 'a wider setting passes it');
});

test('TC7: the pass-by distance is 4-20 m in steps of 2, default 8, clamped', { todo: 'test first' }, () => {
  const r = EXPLORE_RULES as unknown as Record<string, number>;
  assert.deepEqual([r.passMin, r.passMax, r.passStep, r.passDefault], [4, 20, 2, 8]);
  assert.equal(x.clampPass(NaN), 8);
  assert.equal(x.clampPass(1), 4);
  assert.equal(x.clampPass(99), 20);
  assert.equal(x.clampPass(9), 10);
});

test('TC8: places within 60 m are still named on the map', { todo: 'test first' }, () => {
  assert.equal(EXPLORE_RULES.revealM, 60);
  assert.equal(ex.revealedKeys([item('P', m(50, 0))], [O]).size, 1);
});

test('TC9: a walk keeps the pass-by distance it was walked with', { todo: 'test first' }, () => {
  assert.equal(x.walkPassKey('w1'), 'walk_pass:w1');
  assert.equal(x.passFor(null), 8, 'a walk with no value reads the default');
  assert.equal(x.passFor('14'), 14);
  assert.equal(x.passFor('junk'), 8);
});
