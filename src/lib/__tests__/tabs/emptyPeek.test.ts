/// <reference types="node" />
// Chronicle's peek with nothing walked (decision 0148, from /tend inbox T10; amends 0050): one way to act, and a line
// that is true while you walk.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyPeek } from '../../quietLines';

test('tend tabs T10: with nothing open, the peek says how walks get here and offers Navigate alone', () => {
  assert.deepEqual(emptyPeek(false), { line: 'Walk somewhere and it is marked here', navigate: true });
});

test('tend tabs T10: with a walk open and none finished, the line speaks of this walk and the peek offers no button', () => {
  assert.deepEqual(emptyPeek(true), { line: 'This walk is marked here when it ends', navigate: false });
});

test('tend tabs T10: neither line asks for a walk while one is open, and neither holds a count', () => {
  assert.doesNotMatch(emptyPeek(true).line, /^Walk\b/);
  for (const open of [false, true]) assert.doesNotMatch(emptyPeek(open).line, /\d/);
});

// The owner, Nov 20, on the lenses' steward silent 2 ("starred" reads as a favourite or a rating, and VISION's Never
// names stars): "Rename the mark (Recommended)". The peek says a walk is marked here, a plain word.
test('tend tabs 20: the empty peek says a walk is marked here, never starred', () => {
  assert.equal(emptyPeek(false).line, 'Walk somewhere and it is marked here');
  assert.equal(emptyPeek(true).line, 'This walk is marked here when it ends');
  for (const open of [false, true]) assert.doesNotMatch(emptyPeek(open).line, /star/i);
});
