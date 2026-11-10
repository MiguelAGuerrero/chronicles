/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ATLAS_CODE, type AtlasArea, type Listed } from '../../atlas/atlas';
import { busyNamesNear, busyNamesOn, busyRadiusM, cardFooter, firstSelection, offsetOf, rowOf, rowStep, settledIndex, settleStep, stepKey, townNote } from '../../atlas/carousel';
import { readFileSync } from 'node:fs';
import type { LandingView } from '../../landing/view';
import type { LngLat } from '../../types';

const O: LngLat = [-71.4, 41.812];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];

const area = (name: string, at: LngLat, level: AtlasArea['level'] = 'neighborhood'): AtlasArea => ({
  key: name, level, name, at, reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null,
});
const listed = (name: string, m: number, level: AtlasArea['level'] = 'neighborhood', here = false): Listed => ({ area: area(name, east(m), level), distanceM: m, here });
const keys = (l: Listed[]) => l.map((x) => x.area.key);


test('EC3: near you the row is the neighborhoods, then the other towns, in the order given', () => {
  const hoods = [listed('Fox Point', 100, 'neighborhood', true), listed('College Hill', 400), listed('Elmhurst', 900)];
  const towns = [listed('Cranston', 5000, 'town'), listed('Pawtucket', 7000, 'town')];
  assert.deepEqual(keys(rowOf({ ownTown: null, neighborhoods: hoods, towns })), ['Fox Point', 'College Hill', 'Elmhurst', 'Cranston', 'Pawtucket']);
});

test('EC3: on a town\'s page the row is the town\'s own card, then its neighborhoods, never other towns', () => {
  const own = listed('Providence', 0, 'town');
  const hoods = [listed('Fox Point', 100), listed('College Hill', 400)];
  assert.deepEqual(keys(rowOf({ ownTown: own, neighborhoods: hoods, towns: [listed('Cranston', 5000, 'town')] })), ['Providence', 'Fox Point', 'College Hill']);
  assert.deepEqual(keys(rowOf({ ownTown: own, neighborhoods: [], towns: [] })), ['Providence'], 'a town with no neighborhoods is one card');
  assert.deepEqual(rowOf({ ownTown: null, neighborhoods: [], towns: [] }), [], 'nothing listed is an empty row');
});

test('EC1: the selected area stays while it is in the row; else the first; else none', () => {
  const order = ['Fox Point', 'College Hill', 'Cranston'];
  assert.equal(firstSelection(order, null), 'Fox Point', 'on arrival the first is selected');
  assert.equal(firstSelection(order, 'College Hill'), 'College Hill', 'a selection still listed stands');
  assert.equal(firstSelection(order, 'Gone'), 'Fox Point', 'one that left the list gives way to the first');
  assert.equal(firstSelection([], null), null, 'nothing listed, nothing selected');
  assert.equal(firstSelection([], 'Gone'), null);
});

test('EC8: left is next, right previous; a vertical or short drag is nothing; the bearing never enters', () => {
  assert.equal(rowStep(-80, 5, 24), 1, 'a drag left goes to the next card');
  assert.equal(rowStep(80, -5, 24), -1, 'a drag right goes to the previous');
  assert.equal(rowStep(10, 0, 24), 0, 'under the 24 px floor is not a swipe');
  assert.equal(rowStep(-30, 90, 24), 0, 'more vertical than horizontal does nothing');
  assert.equal(rowStep(0, -90, 24), 0);
  assert.equal(rowStep(-30, 30, 24), 1, 'equal drags count as horizontal');
});

test('EC8: stepping holds at the ends and with nothing in the row', () => {
  const order = ['a', 'b', 'c'];
  assert.equal(stepKey(order, 'a', 1), 'b');
  assert.equal(stepKey(order, 'b', -1), 'a');
  assert.equal(stepKey(order, 'c', 1), null, 'no wrap past the last card');
  assert.equal(stepKey(order, 'a', -1), null, 'no wrap before the first');
  assert.equal(stepKey(order, 'b', 0), null);
  assert.equal(stepKey(order, null, 1), null, 'with nothing selected there is nothing to step from');
  assert.equal(stepKey(order, 'Gone', 1), null);
  assert.equal(stepKey([], 'a', 1), null);
});

test('EC9: the arrow keys are the same steps: ArrowRight is a 48 px swipe left, next', () => {
  assert.equal(rowStep(-48, 0, 24), 1);
  assert.equal(rowStep(48, 0, 24), -1);
  assert.equal(rowStep(0, 48, 24), 0, 'ArrowUp and ArrowDown do nothing');
  assert.equal(rowStep(0, -48, 24), 0);
});

test('EC4: a scroll settles on the nearest card, clamped to the row', () => {
  assert.equal(settledIndex(0, 324, 5), 0);
  assert.equal(settledIndex(150, 324, 5), 0, 'under half a step stays');
  assert.equal(settledIndex(170, 324, 5), 1, 'past half a step moves on');
  assert.equal(settledIndex(324 * 3 + 10, 324, 5), 3);
  assert.equal(settledIndex(99999, 324, 5), 4, 'never past the last card');
  assert.equal(settledIndex(-80, 324, 5), 0, 'never before the first');
  assert.equal(settledIndex(500, 324, 0), 0, 'an empty row is index 0');
  assert.equal(offsetOf(2, 324), 648);
  assert.equal(settledIndex(offsetOf(3, 324), 324, 5), 3, 'scrolling to a card settles on it');
});

const view = (): LandingView => ({
  pockets: [{ hull: [east(0), east(100), east(200)], name: 'Pocket', stale: false }],
  strips: [
    { lines: [[east(0), east(100)]], name: 'Wickenden Street', at: east(300), stale: false },
    { lines: [[east(5000), east(5100)]], name: 'Main Street', at: east(5000), stale: false },
  ],
  graded: [{ lines: [[east(0), east(100)]], grade: 2, stale: false }],
  labels: [{ name: 'A busy pocket', at: east(200) }, { name: 'Far pocket', at: east(6000) }],
});

test('EC7: the Busy names inside the selected area\'s ring stay, from zoom 13; its streets always draw', () => {
  const v = view();
  const near = busyNamesNear(v, O, 14, 800, 13)!;
  assert.deepEqual(near.strips.map((s) => s.name), ['Wickenden Street'], 'the street 5 km away is not named');
  assert.deepEqual(near.labels.map((l) => l.name), ['A busy pocket']);
  assert.deepEqual(near.graded, v.graded, 'the drawn busy streets are untouched');
  assert.deepEqual(near.pockets, v.pockets);
  const far = busyNamesNear(v, O, 12.9, 800, 13)!;
  assert.deepEqual([far.strips.length, far.labels.length], [0, 0], 'zoomed out: no names at all');
  assert.deepEqual(far.graded, v.graded, 'the lines stay at any zoom');
});

test('EC7: with no view or no selected area there are no names, and no view stays none', () => {
  assert.equal(busyNamesNear(null, O, 15, 800, 13), null);
  const none = busyNamesNear(view(), null, 15, 800, 13)!;
  assert.deepEqual([none.strips.length, none.labels.length], [0, 0]);
  assert.equal(none.graded.length, 1);
});

test('explore-carousel audit 2: a settle mid-way through the row\'s own scroll never selects a card, it aims again', () => {
  // The row is scrolling itself to card 3 (selected) and the page stalled: the last offset read is card 1.
  assert.deepEqual(settleStep({ index: 1, intended: 3, selected: 3 }), { report: null, scrollTo: 3 }, 'mid-way: scroll on to the target, report nothing');
  assert.deepEqual(settleStep({ index: 3, intended: 3, selected: 3 }), { report: null, scrollTo: null }, 'arrived: nothing to do');
  // The reader's own scroll (nothing intended): a different card is reported, the same one is not.
  assert.deepEqual(settleStep({ index: 2, intended: null, selected: 3 }), { report: 2, scrollTo: null });
  assert.deepEqual(settleStep({ index: 3, intended: null, selected: 3 }), { report: null, scrollTo: null });
});

test('explore-carousel audit 3: the names are on or off by one boolean, so the map is not sent a new Busy view on every camera move', () => {
  assert.equal(busyNamesOn(13, 13), true);
  assert.equal(busyNamesOn(15.7, 13), true);
  assert.equal(busyNamesOn(12.99, 13), false);
  assert.equal(busyNamesOn(0, 13), false, 'before the first view event there is no zoom: off');
  assert.equal(busyNamesOn(11, 13), busyNamesOn(12, 13), 'zoomed out, every zoom is the same state');
  const v = view();
  const empty: LandingView = { pockets: [], strips: [], graded: [], labels: [] };
  assert.equal(busyNamesNear(empty, O, 14, 800, 13), empty, 'a view with no names to drop is returned as it is');
  assert.equal(busyNamesNear(v, O, 14, 800, 13)!.strips.length, 1, 'and one with names inside the ring keeps them');
});

test('explore-carousel audit 4: a card\'s footer shows only on the selected card, a town\'s and a town page head\'s', () => {
  assert.equal(cardFooter({ drill: true, wide: false, selected: true }), 'See its neighborhoods');
  assert.equal(cardFooter({ drill: true, wide: false, selected: false }), null, 'an unselected town only selects: no promise of a way in');
  assert.equal(cardFooter({ drill: false, wide: true, selected: true }), 'What’s here');
  assert.equal(cardFooter({ drill: false, wide: true, selected: false }), null);
  assert.equal(cardFooter({ drill: false, wide: false, selected: true }), null, 'a neighborhood has none');
});

test('explore-carousel audit 12: the note over a town with no neighborhoods says what the map lacks, nothing of the town', () => {
  assert.equal(townNote('Allentown', true), 'Reading Allentown…');
  assert.equal(townNote('Allentown', false), 'The map names no neighborhoods in Allentown.');
  assert.ok(!/one area/i.test(townNote('Allentown', false)));
});

test('explore-carousel audit 16: the Busy names reach a neighborhood\'s ring and a town\'s own reach, never an unseen 800 m', () => {
  assert.equal(busyRadiusM('neighborhood', 800, 5000), 800);
  assert.equal(busyRadiusM('town', 800, 5000), 5000);
  assert.equal(busyRadiusM('town', 800, 300), 800, 'a small town is never less than the ring');
});

test('explore-carousel audit 7: a card\'s name is never cut to a number of lines (EC4: shown in full)', () => {
  const src = readFileSync(new URL('../../../components/atlas/AtlasTile.tsx', import.meta.url), 'utf8');
  const name = /<Text style=\{styles\.name\}[^>]*>/.exec(src)?.[0] ?? '';
  assert.ok(name.includes('styles.name'), 'the card has its name Text');
  assert.ok(!/numberOfLines/.test(name), `the name wraps in full (${name})`);
});
