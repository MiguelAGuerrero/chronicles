/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { armedFind, canArm, passMeta, armedLine, armedStill, clampPass, EXPLORE_RULES, passedAlong, passedPlaces, passFor, revealedKeys, walkPassKey, type ChecklistItem, type Kind } from '../../explore/explore';

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
  assert.equal(armedFind(null, [{ id: 'c1', t: 5 }]), null);
  assert.equal(armedFind(null, [{ id: 'c1', t: 5 }, { id: 'c2', t: 6 }]), null);
  assert.equal(armedFind(null, [{ id: 'c1', t: 5 }]), null, `${a.name} and ${b.name} are within 60 m and found nothing`);
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
  const armed = { item: a, walkId: 'w1', at: 100 };
  assert.deepEqual(armedFind(armed, [{ id: 'c1', t: 150 }, { id: 'c2', t: 160 }]), { item: a, captureId: 'c1' }, 'the first capture only');
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
  assert.equal(passFor(null), 60, 'a walk before the setting keeps the 60 m it was shown with (audit 7)');
  assert.equal(passFor('14'), 14);
  assert.equal(passFor('junk'), 8);
});

const arm = (a: ChecklistItem, at = 100) => ({ item: a, walkId: 'w1', at });

test('tap-to-capture-places audit 1: the drawer slider writes the open walk its own distance', () => {
  assert.deepEqual(passMeta('w1', 14), ['walk_pass:w1', '14']);
  assert.deepEqual(passMeta('w1', 99), ['walk_pass:w1', '20'], 'clamped');
});

test('tap-to-capture-places audit 2: a place more than 60 m away cannot be armed', () => {
  const far = item('Far', m(150, 0));
  assert.equal(canArm(far, O), false);
  assert.equal(canArm(far, m(100, 0)), true);
  assert.equal(canArm(far, null), true, 'no fix yet: allowed, as armedStill keeps it');
});

test('tap-to-capture-places audit 3: Explore switched off disarms', () => {
  const a = arm(item('Bridge', m(10, 0)));
  assert.equal(armedStill(a, O, 'w1', { exploring: false }), null);
  assert.deepEqual(armedStill(a, O, 'w1', { exploring: true }), a);
});

test('tap-to-capture-places audit 4: a place found some other way disarms', () => {
  const b = item('Bridge', m(10, 0));
  assert.equal(armedStill(arm(b), O, 'w1', { found: new Set([b.key]) }), null);
});

test('tap-to-capture-places audit 5: only a capture made after arming finds', () => {
  const b = item('Bridge', m(10, 0));
  const got = armedFind(arm(b, 100), [{ id: 'old', t: 90 }, { id: 'new', t: 120 }, { id: 'newer', t: 130 }]);
  assert.deepEqual(got, { item: b, captureId: 'new' });
  assert.equal(armedFind(arm(b, 100), [{ id: 'old', t: 90 }]), null);
});

test('tap-to-capture-places audit 6: a walk crossing the disc between two fixes passes the place', () => {
  const a = item('Statue', m(100, 2));
  const fixes = [{ at: m(80, 0), t: 1 }, { at: m(120, 0), t: 3 }];
  assert.equal(passedPlaces({ items: [a], fixes, since: 0, hidden: new Set(), foundHere: new Set() }).length, 1, '2 m off the line, fixes 40 m apart');
  const apart = [{ at: m(80, 0), t: 1 }, { at: m(120, 0), t: 400_000 }];
  assert.equal(passedPlaces({ items: [a], fixes: apart, since: 0, hidden: new Set(), foundHere: new Set() }).length, 0, 'a gap in time is not walked through');
  const wide = [{ at: m(80, 0), t: 1 }, { at: m(120, 0), t: 3 }];
  assert.equal(passedPlaces({ items: [item('Away', m(100, 30))], fixes: wide, since: 0, hidden: new Set(), foundHere: new Set() }).length, 0);
});

test('tap-to-capture-places audit 7: a walk with no stored distance reads 60 m, so its old lines stay', () => {
  assert.equal(passFor(null), 60);
});
