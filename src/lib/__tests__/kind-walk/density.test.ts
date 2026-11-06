import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CELL_M, densestCells, onStreets } from '../../kindWalk/density';
import { distanceM } from '../../geo';
import type { LngLat } from '../../types';

const A: LngLat = [8.54, 47.37];
const at = (eastM: number, northM: number): LngLat => [A[0] + eastM / (111320 * Math.cos((A[1] * Math.PI) / 180)), A[1] + northM / 111320];

test('KW5: cells are densest first, a tie by a fixed order, the same whichever way the places arrive', () => {
  const places = [at(100, 100), at(120, 90), at(110, 80), at(900, 100), at(910, 120), at(2000, 2000)].map((p) => ({ at: p }));
  const cells = densestCells(places, A);
  assert.deepEqual(cells.map((c) => c.count), [3, 2, 1]);
  assert.deepEqual(densestCells([...places].reverse(), A), cells);
  const tie = densestCells([{ at: at(100, 100) }, { at: at(2000, 2000) }], A);
  assert.deepEqual(tie, densestCells([{ at: at(2000, 2000) }, { at: at(100, 100) }], A));
  assert.ok(tie[0].at[1] < tie[1].at[1], 'a tie goes to the more southern cell');
});

test('KW5: a cell is as wide as the pockets\' cells', () => {
  assert.equal(CELL_M, 400);
});

test('KW5b KW6: a cell is a centre, not a place\'s spot; found or not changes nothing', () => {
  const p = at(130, 70);
  const unfound = densestCells([{ at: p, found: false } as { at: LngLat }, { at: at(900, 900) }], A);
  const found = densestCells([{ at: p, found: true } as { at: LngLat }, { at: at(900, 900) }], A);
  assert.deepEqual(unfound, found, 'marking one found leaves the cells unchanged');
  assert.notDeepEqual(unfound[0].at, p, 'no waypoint is a place\'s spot');
  assert.ok(distanceM(unfound[0].at, p) <= CELL_M, 'a centre of the cell it counts');
});

test('KW5: nothing to count is no cell', () => {
  assert.deepEqual(densestCells([], A), []);
});


test('KW5: a cell\'s middle is moved onto the street nearest it; a cell with no street near is dropped; the order stays', () => {
  const street: LngLat[] = [at(-1000, 0), at(3000, 0)];
  const cells = [{ at: at(500, 200), count: 5 }, { at: at(1500, 250), count: 3 }, { at: at(500, 5000), count: 2 }];
  const on = onStreets(cells, [street]);
  assert.equal(on.length, 2);
  assert.deepEqual(on.map((c) => c.count), [5, 3]);
  for (const c of on) assert.ok(Math.abs(c.at[1] - A[1]) < 1e-6, 'on the street');
  assert.ok(Math.abs(distanceM(on[0].at, at(500, 0))) < 2);
});
