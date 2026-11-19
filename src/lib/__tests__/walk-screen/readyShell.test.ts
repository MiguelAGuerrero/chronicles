import assert from 'node:assert/strict';
import test from 'node:test';
import { createReady } from '../../ready/shell';
import { fakePorts } from '../fakes';

test('NR7, NR13: the ready shell reads the saved choices (no mode, decision 0231) and saves each as it changes', async () => {
  const p = fakePorts({ background: false });
  const ready = createReady(p);
  const first = await ready.load();
  assert.equal(first.firstWalk, true);
  assert.equal(first.webNoteOff, false);
  await ready.dismissWebNote();
  const again = await ready.load();
  assert.equal(again.webNoteOff, true);
  assert.equal(ready.background(), false);
});
