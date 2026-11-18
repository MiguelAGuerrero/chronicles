/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Memories' copy (MC11, MC14, MC16): every sentence in copy.ts asserted verbatim. Loaded inside the todo until the module exists.
const copy = (): Promise<any> => import(`../../resurface/${'copy'}`);

test('MC14: every sentence the screen writes, verbatim', async () => {
  const c = await copy();
  assert.equal(c.HIDDEN_TOAST, 'Hidden. It stays in your journal and in its walk.');
  assert.equal(c.NOT_A_THREAD, 'That is not a thread.');
  assert.equal(c.EMPTY, 'Nothing kept yet.');
  assert.equal(c.BRING_BACK, 'Bring back');
  assert.equal(c.OFF_LINE, 'Bringing moments back is off');
  assert.equal(c.NEWEST_FIRST, 'Moments you kept, newest first');
  assert.equal(c.FORGET_CONFIRM, 'Hidden moments, removed threads and softened words will be offered again, and thread names go back to your own words.');
  assert.equal(c.FAILED_SAVE, "Couldn't keep this choice; it may come back.");
  assert.equal(c.withSaveNote('Hidden.', true), 'Hidden.');
  assert.equal(c.withSaveNote('Hidden.', false), "Hidden. Couldn't keep this choice; it may come back.");
});

test('MC11: the "fewer like this" toast names at most one word', async () => {
  const c = await copy();
  assert.equal(c.fewerLike('harbor'), 'Fewer like this: harbor');
  assert.equal(c.fewerLike(null), 'Fewer like this');
});

test('MC14: no chat and no instruction in any sentence', async () => {
  const c = await copy();
  const all = [c.HIDDEN_TOAST, c.NOT_A_THREAD, c.EMPTY, c.OFF_LINE, c.NEWEST_FIRST, c.FORGET_CONFIRM, c.FAILED_SAVE, c.fewerLike('harbor'), c.fewerLike(null)];
  for (const s of all) {
    assert.ok(!/^okay|walk somewhere|try again|you should|please/i.test(s), s);
    assert.ok(!/private|secret|safe/i.test(s), `${s}: hiding is not privacy`);
  }
});

test('MC16: no-place wording names the app\'s lack', async () => {
  const c = await copy();
  assert.equal(c.NO_PLACE, 'No place kept');
  assert.equal(c.ON_ITS_OWN, 'On its own');
});
