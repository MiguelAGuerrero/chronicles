import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { densestCells, type Cell } from '../../kindWalk/density';
import { FAR_START_M, planKindWalk, TOLERANCE } from '../../kindWalk/plan';
import type { Route } from '../../nav/types';
import type { LngLat } from '../../types';

const A: LngLat = [8.54, 47.37];
const at = (eastM: number, northM: number): LngLat => [A[0] + eastM / (111320 * Math.cos((A[1] * Math.PI) / 180)), A[1] + northM / 111320];
const cell = (e: number, n: number, count = 1): Cell => ({ at: at(e, n), count });
// Streets as straight lines, so lengths are the distances and the test needs no map.
const leg = (a: LngLat, b: LngLat): Route | null => ({ path: [a, b], lengthM: distanceM(a, b), source: 't' });
const near = at(0, 0);

test('KW4: one way comes back, never a list', () => {
  const r = planKindWalk([cell(0, 0, 5), cell(800, 0, 4), cell(1600, 0, 3)], near, 1600, leg);
  assert.equal(r.kind, 'walk');
  assert.ok(!Array.isArray(r));
  if (r.kind === 'walk') assert.equal(Object.keys(r).sort().join(), 'kind,walk');
});

test('KW8: the way is within the tolerance of the budget, taking cells in density order', () => {
  const cells = [cell(0, 0, 9), cell(800, 0, 8), cell(1600, 0, 7), cell(2400, 0, 6)];
  const r = planKindWalk(cells, near, 1600, leg);
  assert.equal(r.kind, 'walk');
  if (r.kind !== 'walk') return;
  assert.ok(r.walk.lengthM >= 1600 * (1 - TOLERANCE) && r.walk.lengthM <= 1600 * (1 + TOLERANCE), String(r.walk.lengthM));
  assert.equal(r.walk.stops.length, 3);
});

test('KW8: a longer budget passes more cells, still one way', () => {
  const cells = [cell(0, 0, 9), cell(800, 0, 8), cell(1600, 0, 7), cell(2400, 0, 6)];
  const short = planKindWalk(cells, near, 800, leg);
  const long = planKindWalk(cells, near, 2400, leg);
  assert.ok(short.kind === 'walk' && long.kind === 'walk' && long.walk.lengthM > short.walk.lengthM);
});

test('KW8: the same inputs give the same way', () => {
  const cells = densestCells([{ at: at(0, 0) }, { at: at(900, 0) }, { at: at(1700, 0) }, { at: at(900, 800) }], A);
  assert.deepEqual(planKindWalk(cells, near, 1700, leg), planKindWalk(cells, near, 1700, leg));
});

test('KW5 KW6: the stops are cell centres in the chain, none a place\'s own spot', () => {
  const cells = [cell(0, 0, 3), cell(800, 0, 2)];
  const r = planKindWalk(cells, near, 800, leg);
  assert.ok(r.kind === 'walk' && r.walk.stops.every((s, i) => s === r.walk.stops[i]) && r.walk.stops.length === 2);
  if (r.kind === 'walk') assert.ok(!('name' in r.walk) && !('key' in r.walk));
});

test('KW2: fewer than two cells is no way', () => {
  assert.deepEqual(planKindWalk([cell(0, 0, 9)], near, 2000, leg), { kind: 'few' });
  assert.deepEqual(planKindWalk([], near, 2000, leg), { kind: 'few' });
});

test('KW9 KW17: the length is the whole route from the walker, and the start says how much of it is the way there', () => {
  const r = planKindWalk([cell(0, 0, 9), cell(800, 0, 8)], at(2000, 0), 2400, leg);
  assert.ok(r.kind === 'walk');
  if (r.kind === 'walk') {
    assert.equal(Math.round(r.walk.startM / 100), 12, 'about 1.2 km to the nearer cell');
    assert.ok(Math.abs(r.walk.lengthM - (r.walk.startM + 800)) < 5, 'the length is the way there and the way through');
    assert.deepEqual(r.walk.path[0], at(2000, 0), 'the path begins where the walker stands');
  }
});

test('KW9b: beyond the far-start limit there is no walk', () => {
  const r = planKindWalk([cell(0, 0, 9), cell(800, 0, 8)], at(FAR_START_M + 1500, 0), 800, leg);
  assert.deepEqual(r, { kind: 'far' });
});

test('KW11b: one chain only; a street that cannot be routed is not worked around with another set of cells', () => {
  const noWest: typeof leg = (a, b) => (a[0] < at(-100, 0)[0] || b[0] < at(-100, 0)[0] ? null : leg(a, b));
  const r = planKindWalk([cell(-800, 0, 9), cell(800, 0, 8)], near, 800, noWest);
  assert.deepEqual(r, { kind: 'noRoute' });
});

test('KW8: cells that would overshoot are skipped in the same fixed order, not searched for the best', () => {
  const cells = [cell(0, 0, 9), cell(800, 0, 8), cell(6000, 0, 7), cell(1600, 0, 6)];
  const r = planKindWalk(cells, near, 1600, leg);
  assert.ok(r.kind === 'walk' && r.walk.stops.length === 3);
});
