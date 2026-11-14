/// <reference types="node" />
// A memory preview of a group says the rest in words, as the reminders and pins do (tend memories T30, decision 0170).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moreHere, previewSpoken } from '../../memories';

test('tend memories T30: the preview says "and two more here", never a digit', () => {
  assert.equal(moreHere(0), null);
  assert.equal(moreHere(1), 'and one more here');
  assert.equal(moreHere(2), 'and two more here');
  // Twelve more is a spot of thirteen: "many" since tend explore 16, as its reminder says.
  assert.equal(moreHere(12), 'and many more here');
});

test('tend memories T30: a screen reader hears the same words as the preview shows', () => {
  assert.equal(previewSpoken({ date: 'Nov 2, 2026', line: 'Photo', stack: null, more: 0 }), 'Memory from Nov 2, 2026: Photo. Open');
  assert.equal(previewSpoken({ date: 'Nov 2, 2026', line: 'Bought two plums', stack: null, more: 2 }), 'Memory from Nov 2, 2026: Bought two plums, and two more here. Open');
  assert.equal(previewSpoken({ date: 'Nov 2, 2026', line: 'Photo', stack: 'and more in this moment', more: 1 }), 'Memory from Nov 2, 2026: Photo, and more in this moment, and one more here. Open');
});
