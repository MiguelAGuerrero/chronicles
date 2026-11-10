import assert from 'node:assert/strict';
import { test } from 'node:test';

// UI conformance (specs/ui-conformance, decision 0113): the Undo window's criteria, written before the code.

test('UC1: a waiting delete never ends on a timer', { todo: 'test first' }, () => {
  assert.fail('not built yet');
});

test('UC2: Close or another delete stores it at once; the background does not; Undo brings it back', { todo: 'test first' }, () => {
  assert.fail('not built yet');
});

test('UC13: a delete still waiting when the app is killed is stored on the next launch', { todo: 'test first' }, () => {
  assert.fail('not built yet');
});
