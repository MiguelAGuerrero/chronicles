/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { join } from 'node:path';
import { cardCapture, findOnKept } from '../../explore/placeCard';
import { stampFor } from '../../pieceStamp';
import { passMeta, clampPass, EXPLORE_RULES, passedAlong, passedPlaces, passFor, revealedKeys, walkPassKey, type ChecklistItem, type Kind } from '../../explore/explore';

// Tap to capture a place, and a quiet pass-by (specs/tap-to-capture-places): written before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const item = (name: string, at: LngLat, kind: Kind = 'museums'): ChecklistItem => ({
  key: `k:${name}`, area_key: 'A', name, category: 'culture', kind, at, generic: false,
});

// TC3 and TC4 (arming by "Capture here") are retired by specs/capture-at-a-place (CA1-CA12): a capture begun on the
// place's card carries the place itself. TC1 and TC5 stand, held now by what a kept capture with no place does.
test('TC1: a capture near unfound places finds nothing by itself, with one place or several', () => {
  const a = item('Museum', m(10, 0));
  const b = item('Statue', m(20, 0));
  const plain = stampFor(5, { here: O, lastFixAt: 5 }, null);
  assert.equal(plain.place, null, `${a.name} and ${b.name} are within 60 m and the stamp carries neither`);
  assert.equal(findOnKept({ place: plain.place, piece: false, momentId: 'c1' }, new Set()), null);
});

test('TC2: a moment made outside a walk finds nothing by itself (momentFind is gone)', () => {
  assert.equal(existsSync(new URL('../../explore/momentFind/shell.ts', import.meta.url)), false);
});

test('TC5: plain capture is unchanged: no place is needed to keep a moment', () => {
  const plain = stampFor(5, { here: O, lastFixAt: 5 }, null);
  assert.deepEqual({ t: plain.t, at: plain.at, locate: plain.locate, into: plain.into }, { t: 5, at: O, locate: false, into: null });
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


test('tap-to-capture-places audit 1: the drawer slider writes the open walk its own distance', () => {
  assert.deepEqual(passMeta('w1', 14), ['walk_pass:w1', '14']);
  assert.deepEqual(passMeta('w1', 99), ['walk_pass:w1', '20'], 'clamped');
});

// Audits 2-5 guarded the arming, which is gone (capture-at-a-place); each concern is held on what replaced it.
// Audit 2's rule (no capture past 60 m) is reversed by the owner's decision 0247 (fix poi-any-distance): a place is a
// point, and a long bridge's far end is still the bridge. The row is offered at any distance.
test('tap-to-capture-places audit 2: a place more than 60 m away offers capture too (decision 0247)', () => {
  const far = item('Far', m(150, 0));
  assert.equal(cardCapture({ name: far.name, found: false }).row, true, 'the card reads no distance: near, far or with no fix yet');
});

test('tap-to-capture-places audit 3: with Places off there is no place card to capture from', () => {
  const walk = readFileSync(join(__dirname, '../../../app/walk.tsx'), 'utf8');
  // But for the one place the walk goes to (ready-map-places RQ18, the owner, Nov 21): no other card opens with Places off.
  assert.match(walk, /\{openMark && !spot && markCardOn && \(/);
  assert.match(walk, /const markCardOn = !!walk && surface\.card === 'walk' && \(placesOn \|\| openMark\?\.key === surface\.only\);/);
});

test('tap-to-capture-places audit 4: a place found some other way is not found again', () => {
  const b = item('Bridge', m(10, 0));
  assert.equal(findOnKept({ place: b.key, piece: false, momentId: 'm' }, new Set([b.key])), null);
});

test('tap-to-capture-places audit 5: a capture begun before the card finds nothing', () => {
  // Its stamp was taken before the card's tap, with no place on it.
  const before = stampFor(90, { here: O, lastFixAt: 90 }, null);
  assert.equal(findOnKept({ place: before.place, piece: false, momentId: 'old' }, new Set()), null);
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
