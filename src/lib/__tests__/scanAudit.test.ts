/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeFromRow, placeToRow } from '../db/placeRow';
import { isChain, isMarkable, notableName } from '../discovery/noise';
import { placeKey } from '../discovery/places';
import { scanInputs, scanMessage } from '../discovery/scan';
import type { CategoryId, Place } from '../discovery/types';
import { LANDING_VERSION, nearAreas, sweepCovered, type LandingRow } from '../landing/view';
import type { LngLat } from '../types';

// Regression tests for the audit of the attraction-only scan (Nov 2).

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const place = (name: string, category: CategoryId, at: LngLat, markable?: boolean): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1', markable });

test('audit 1: a place keeps its markable flag through the native row', () => {
  for (const flag of [true, false]) {
    const p = place('Grace Church', 'history', m(10, 10), flag);
    assert.equal(placeFromRow(placeToRow(p)).markable, flag);
  }
  assert.equal(placeFromRow({ ...placeToRow(place('X', 'art', O, true)), markable: null }).markable, undefined);
});

test('audit 3: a row cached before the flag existed is not a mark until read again', () => {
  assert.equal(isMarkable(place('St. Mary’s Church', 'history', O)), false);
  assert.equal(isMarkable(place('Hessian Memorial', 'history', O, true)), true);
});

test('audit 4: an incomplete read fails by what it read, not by how many attractions there are', () => {
  const read = [...Array.from({ length: 8 }, (_, i) => place(`Cafe ${i}`, 'food', m(-300 + i * 80, 100), false)), place('Gano Park', 'parks', m(0, -200), true)];
  const got = scanInputs({ read, cached: [], build: 'b1', center: O, offered: [], wasRead: true, complete: false });
  assert.equal(got.failed, false);
  assert.deepEqual(got.candidates.map((p) => p.name), ['Gano Park']);
  const thin = scanInputs({ read: read.slice(0, 2), cached: [], build: 'b1', center: O, offered: [], wasRead: true, complete: false });
  assert.equal(thin.failed, true);
});

const row = (centre: LngLat, o: Partial<LandingRow> = {}): LandingRow => ({
  key: `${centre}`, centre, build: 'b1', rules: LANDING_VERSION, analyzed_at: 0,
  analysis: { strips: [], pockets: [], landing: null, basis: 'centre', reason: '' } as unknown as LandingRow['analysis'], ...o,
});

test('audit 6, 7: a sweep is skipped where a current area already covers it, so it never replaces a look', () => {
  assert.ok(sweepCovered([row(m(800, 0))], O, 'b1'));
  assert.equal(sweepCovered([row(m(1200, 0))], O, 'b1'), null);
  assert.equal(sweepCovered([row(m(100, 0), { build: 'old' })], O, 'b1'), null, 'a stale build is read again');
  assert.equal(sweepCovered([row(m(100, 0), { rules: 'old' })], O, 'b1'), null, 'stale rules are read again');
});

test('audit 8: the walk map draws only areas near the walker', () => {
  const rows = [row(m(500, 0)), row(m(2900, 0)), row(m(3100, 0)), row(m(0, -20000))];
  assert.equal(nearAreas(rows, O).length, 2);
  assert.equal(nearAreas(rows, null).length, 0);
});

test('audit 9: notable words leave out places merely named after a neighbourhood', () => {
  for (const n of ['Mission Hills Baptist Church', 'Mission Bay Library', 'Capitol Hill Branch Library', 'Heritage Baptist Church', 'Landmark Church', 'Colonial Heights Cemetery'])
    assert.equal(notableName(n), false, n);
  for (const n of ['Catedral de Santa María', 'Cathédrale Notre-Dame', 'Basilique Saint-Denis', 'Duomo di Milano', 'Abbaye de Cluny', 'Kölner Kathedrale', 'Old North Church', 'State Capitol'])
    assert.equal(notableName(n), true, n);
});

test('audit 10: a theatre is never taken for a cinema chain', () => {
  assert.equal(isChain('Regal Theatre', 'culture'), false);
  assert.equal(isChain('Odeon of Herodes Atticus', 'culture'), false);
});

test('audit 12: the sweep speaks of busy areas, not pockets', () => {
  assert.equal(scanMessage('none', 0, { strips: 0, pockets: 2 }), 'No marks here · 2 busy areas');
});
