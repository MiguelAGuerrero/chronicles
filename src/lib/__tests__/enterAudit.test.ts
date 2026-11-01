/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENTER, markEnter, sameSeen } from '../enter';

test('enter audit 6: a place that comes back from a faint route pin never turns in again', () => {
  assert.equal(markEnter({ revealed: false, faint: true }, { revealed: true }), null);
});

test('enter UX: the turn starts at 60 degrees, so the "?" itself is seen turning', () => {
  assert.equal(ENTER.flip.fromDeg, 60);
});

test('enter audit 2: what a map saw is only replaced when it changed', () => {
  assert.equal(sameSeen(new Map([['a', 'r']]), [['a', 'r']]), true);
  assert.equal(sameSeen(new Map([['a', 'r']]), [['a', 'rf']]), false);
  assert.equal(sameSeen(new Map([['a', 'r']]), []), false);
  assert.equal(sameSeen(new Map(), []), true);
});
