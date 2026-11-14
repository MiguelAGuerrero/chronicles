import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sameRuns } from '../../liveRuns';
import type { LngLat } from '../../types';

// The live trace's decisions, out of useLiveTrace (refactor recording 1, R1).

const run = (...pts: LngLat[]) => pts;

test('refactor recording 1: the same ride lines are the same, so the map is not sent them again (rides audit 4)', () => {
  const a = [run([0, 0], [1, 1], [2, 2])];
  assert.equal(sameRuns(a, [run([0, 0], [1, 5], [2, 2])]), true, 'ends and length decide: a moved middle is the same line');
  assert.equal(sameRuns(a, [run([0, 0], [1, 1], [2, 3])]), false, 'a new end is a new line');
  assert.equal(sameRuns(a, [run([0, 0], [2, 2])]), false, 'a different length');
  assert.equal(sameRuns(a, [...a, run([5, 5])]), false, 'another ride');
  assert.equal(sameRuns([], []), true);
  assert.equal(sameRuns([run()], [run()]), true, 'empty lines');
});
