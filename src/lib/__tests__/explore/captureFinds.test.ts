import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeKey } from '../../discovery/places';
import { capturesToFind, type ChecklistItem } from '../../explore/explore';
import type { LngLat } from '../../types';

// tend explore 14: a capture made while the read of its own area was still running was marked handled against the items
// loaded then, so the place that read brought was never found until a reload (E8). A capture with nothing in reach waits
// while a read runs; it is handled once no read is running, or once it finds its place.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const item = (name: string, at: LngLat): ChecklistItem => ({ key: placeKey('culture', name, at), area_key: 'A', name, category: 'culture', kind: 'museums', at, generic: false });
const cap = (id: string, at: LngLat) => ({ id, at });

test('tend explore 14: while a read runs, a capture with no place in reach is not handled yet', () => {
  const got = capturesToFind({ captures: [cap('c1', O)], items: [], taken: new Set(), reading: true });
  assert.deepEqual(got, { handled: [], finds: [] });
});

test('tend explore 14: the read done, the place it brought is found by the capture that waited', () => {
  const museum = item('Museum', m(20, 0));
  const got = capturesToFind({ captures: [cap('c1', O)], items: [museum], taken: new Set(), reading: false });
  assert.deepEqual(got, { handled: ['c1'], finds: [{ captureId: 'c1', item: museum }] });
});

test('tend explore 14: with no read running, a capture with nothing in reach is handled, as before', () => {
  assert.deepEqual(capturesToFind({ captures: [cap('c1', O)], items: [item('Far', m(200, 0))], taken: new Set(), reading: false }), { handled: ['c1'], finds: [] });
});

test('tend explore 14: a capture that finds its place is handled even while a read runs, and two captures never take one place', () => {
  const museum = item('Museum', m(20, 0));
  const got = capturesToFind({ captures: [cap('c1', O), cap('c2', m(5, 0))], items: [museum], taken: new Set(), reading: true });
  assert.deepEqual(got.finds, [{ captureId: 'c1', item: museum }]);
  assert.deepEqual(got.handled, ['c1'], 'c2 found nothing while a read runs: it waits');
  const later = capturesToFind({ captures: [cap('c2', m(5, 0))], items: [museum], taken: new Set([museum.key]), reading: false });
  assert.deepEqual(later, { handled: ['c2'], finds: [] }, 'a place already found is not found twice');
});
