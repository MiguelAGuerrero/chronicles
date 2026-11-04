import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapReadLock } from '../../mapReads';

// The map's camera serves one read at a time (specs/shells-saved-settings, SH7).

test('SH7 one read at a time; free again after a failure', async () => {
  const lock = mapReadLock();
  let release!: () => void;
  let ran = 0;
  const first = lock.run(() => new Promise<string>((r) => { release = () => r('first'); }));
  assert.equal(lock.busy(), true);
  assert.equal(await lock.run(async () => { ran++; return 'second'; }), null, 'a second read returns nothing at once');
  assert.equal(ran, 0, 'and runs nothing');
  release();
  assert.equal(await first, 'first');
  assert.equal(lock.busy(), false);
  await assert.rejects(lock.run(async () => { throw new Error('read failed'); }), /read failed/);
  assert.equal(lock.busy(), false, 'free again after a read that fails');
  assert.equal(await lock.run(async () => 'next'), 'next');
});
