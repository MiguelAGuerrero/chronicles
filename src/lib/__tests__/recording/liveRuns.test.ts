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

test('refactor recording 2: the newest gap in the kept trace is the app closed or the page hidden, never a pause', async () => {
  const { newestGap } = await import('../../liveRuns');
  const fix = (t: number) => ({ walk_id: 'w', t, lat: 0, lon: 0, accuracy_m: 5, speed: null, course: null });
  const kept = [fix(0), fix(1_000), fix(200_000), fix(201_000), fix(500_000)];
  assert.deepEqual(newestGap(kept, []), { ms: 299_000, at: 500_000 }, 'the newest of two gaps');
  assert.deepEqual(newestGap(kept, [{ started_at: 210_000, ended_at: 490_000 }]), { ms: 199_000, at: 200_000 }, 'a gap across a pause is the pause');
  assert.equal(newestGap(kept.slice(0, 2), []), null, 'no gap');
  assert.equal(newestGap([], []), null);
});
