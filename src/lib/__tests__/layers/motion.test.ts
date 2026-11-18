/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMotion } from '../../layers/motion';

// explore-dense-city audit 7, written before the fix.

test('explore-dense-city audit 7: a map taken down mid-ease does not leave the busy read waiting', async () => {
  const motion = createMotion();
  motion.set(true);
  let woke = 0;
  const waiting = motion.settled().then(() => { woke++; });
  motion.gone();
  await waiting;
  assert.equal(woke, 1);
  assert.equal(motion.moving, false, 'gone is still: the next read is not held');
  // An ordinary settle wakes every waiter once; a settle with nothing waiting is nothing.
  motion.set(true);
  const two = Promise.all([motion.settled(), motion.settled()]);
  motion.set(false);
  await two;
  motion.set(false);
  // Still: settled() resolves at once.
  await motion.settled();
});
