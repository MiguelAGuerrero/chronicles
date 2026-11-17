import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at } from '../walk-planner/grid';

// Where an outing looks (OJ20, OJ37, OJ41, OJ42): the towns within a reach, or near the straight line to a place; the same list either way.

const TODO = { todo: 'test first' };
const HERE = at(0, 0);
const town = (name: string, e: number, n: number) => ({ name, at: at(e, n) });
const TOWNS = [town('Near', 4000, 0), town('Mid', 9000, 500), town('Twin', 9500, 600), town('Far', 20000, 0), town('Off', 9000, 9000), town('Behind', -6000, 0)];

test('OJ41: within a reach: where you stand, then the towns inside it; a town beside one already taken is the same place', TODO, async () => {
  const { areasAround } = await import('../../outing/areas');
  const a = areasAround(TOWNS, HERE, 12000, []);
  assert.deepEqual(a.map((x) => x.name), [null, 'Near', 'Behind', 'Mid'], 'nearest first; Twin is Mid again; Far and Off are outside');
  assert.deepEqual(areasAround(TOWNS, HERE, 1000, []).map((x) => x.name), [null], 'a reach with no town in it is where you stand');
});

test('OJ42: a town you have not been in is looked at before one you have', TODO, async () => {
  const { areasAround } = await import('../../outing/areas');
  const a = areasAround(TOWNS, HERE, 12000, [town('Near', 4000, 0)]);
  assert.deepEqual(a.map((x) => x.name), [null, 'Behind', 'Mid', 'Near']);
  assert.deepEqual(a.map((x) => !!x.isNew), [false, true, true, false]);
});

test('OJ20: toward a place: the towns near the straight line, in order along it, the place last; none behind you or far off it', TODO, async () => {
  const { areasToward } = await import('../../outing/areas');
  const a = areasToward(TOWNS, HERE, town('Far', 20000, 0), []);
  assert.deepEqual(a.map((x) => x.name), ['Near', 'Mid', 'Far']);
});

test('OJ37: reading is bounded: no more than the rule\'s number of areas, the destination always among them', TODO, async () => {
  const { areasToward, areasAround, AREA_RULES } = await import('../../outing/areas');
  const many = Array.from({ length: 30 }, (_, i) => town(`T${i}`, 3000 * (i + 1), 0));
  const toward = areasToward(many, HERE, town('End', 95000, 0), []);
  assert.equal(toward.length, AREA_RULES.readMax);
  assert.equal(toward[toward.length - 1].name, 'End');
  assert.equal(areasAround(many, HERE, 200000, []).length, AREA_RULES.readMax);
});
