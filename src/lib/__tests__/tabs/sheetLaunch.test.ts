/// <reference types="node" />
// Chronicle's peek at launch (tend tabs T38, the proxy's yes under decision 0157, 2026-11-18): the sheet takes the
// peek its state asks for without a spring once the screen first knows that state, so nothing rises at launch; the
// spring stays for every later change of state, and for half and full. Only the mount's own move and the first read's
// are set (tend tabs audit 37), and the first read never cuts a running spring short (audit 38).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sheetMoveSnaps } from '../../motionTokens';

const move = (m: Partial<Parameters<typeof sheetMoveSnaps>[0]>) =>
  sheetMoveSnaps({ reduced: false, peek: true, mount: false, firstKnown: false, moving: false, ...m });

test('tend tabs T38: a peek takes its height with no spring on the mount and on the move the first read asks for', () => {
  assert.equal(move({ mount: true }), true, 'the mount: the plain peek, set, never sprung');
  assert.equal(move({ firstKnown: true }), true, 'the first read lands (nothing walked, nothing open: 76 to 124): set, never sprung');
});

test('tend tabs audit 37: before the first read, a peek reached from half springs; only the mount\'s move and the first read\'s are set', () => {
  // Inverted from the T38 build, which set every peek move before the first read (the review's auditor 1).
  assert.equal(move({}), false, 'before the first read, a peek that is not the mount\'s move (Escape from half): sprung');
  assert.equal(move({ mount: true }), true);
  assert.equal(move({ firstKnown: true }), true);
});

test('tend tabs audit 38: the first read landing on a lowering sheet never jumps', () => {
  assert.equal(move({ firstKnown: true, moving: true }), false, 'a spring is running: the first read springs to its height');
  assert.equal(move({ firstKnown: true, moving: false }), true, 'at rest: the first read sets its height');
});

test('tend tabs T38: every later change of state springs, as it did (criterion 3)', () => {
  assert.equal(move({}), false, 'a peek after the first read (the first walk finished, a walk started): sprung');
  assert.equal(move({ peek: false }), false, 'half or full, after the first read: sprung');
  assert.equal(move({ peek: false, mount: true }), false, 'a map that mounts on Walks opens to half with its spring, read or not');
  assert.equal(move({ peek: false, firstKnown: true }), false, 'half or full on the first read: sprung');
});

test('tend tabs T38: with reduce motion every move is set, as M2 has it', () => {
  for (const peek of [true, false]) for (const mount of [true, false]) for (const moving of [true, false])
    assert.equal(move({ reduced: true, peek, mount, moving }), true);
});
