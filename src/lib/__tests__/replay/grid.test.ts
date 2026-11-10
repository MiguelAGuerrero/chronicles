/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Moment stacks MS17 (decision 0106): a stack's grid in the replay. Test first: reached by name.
type Mod = { gridLayout(n: number): { cols: number; rows: number; shown: number; scrolls: boolean } };
const mod = () => import('../../ceremony/grid' + '') as Promise<Mod>;

test('MS17: the grid is the closest square up to 3x3, and scrolls past nine', async () => {
  const { gridLayout } = await mod();
  const shape = (n: number) => { const g = gridLayout(n); return [g.cols, g.rows, g.shown, g.scrolls]; };
  assert.deepEqual(shape(2), [2, 1, 2, false]);
  assert.deepEqual(shape(3), [2, 2, 3, false]);
  assert.deepEqual(shape(4), [2, 2, 4, false]);
  assert.deepEqual(shape(5), [3, 2, 5, false]);
  assert.deepEqual(shape(6), [3, 2, 6, false]);
  assert.deepEqual(shape(7), [3, 3, 7, false]);
  assert.deepEqual(shape(9), [3, 3, 9, false]);
  assert.deepEqual(shape(14), [3, 3, 9, true]);
});
