/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stopUnderOf } from '../../stopEnd/core';

// What a Stop meets once its wait is over (T35, decision 0227), decided in core from the gate's state (tend tabs audit 43).

const a = { name: 'navigate' };
const b = { name: 'memories' };

test('tend tabs audit 43: stopUnder\'s decision is core: go, saving (once), or recording', () => {
  assert.deepEqual(stopUnderOf({ saving: [], on: [], warned: [] }), { go: true, under: [] });
  assert.deepEqual(stopUnderOf({ saving: [], on: [a], warned: [] }), { go: false, recording: true });
  assert.deepEqual(stopUnderOf({ saving: [{ n: 1, owner: a }], on: [a], warned: [] }), { go: false, saving: [1] }, 'a memo stopping to be saved is saving');
  assert.deepEqual(stopUnderOf({ saving: [{ n: 1, owner: a }], on: [], warned: [1] }), { go: true, under: [1] }, 'a second hold goes through what it said');
  assert.deepEqual(stopUnderOf({ saving: [{ n: 1, owner: a }, { n: 2, owner: b }], on: [], warned: [1] }), { go: false, saving: [1, 2] }, 'a save begun since is said first');
});
