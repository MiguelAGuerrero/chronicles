/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLANK_MIN, blankHeight, peekStart } from '../../journal/rest';

test('JN31: at rest the empty page fills what the date and the last entry leave above the bar', () => {
  // A 700 px sheet, a 77 px bar pad, a 66 px date held on top, a 120 px entry.
  assert.equal(blankHeight({ view: 700, foot: 77, sticky: 66, peek: 120, writing: false }), 700 - 77 - 66 - 120);
  // Nothing kept: the date and the empty page.
  assert.equal(blankHeight({ view: 700, foot: 77, sticky: 66, peek: 0, writing: false }), 700 - 77 - 66);
});

test('JN31: a last entry too long for its share shows its end, and the empty page keeps a third of the screen', () => {
  const h = blankHeight({ view: 700, foot: 77, sticky: 66, peek: 2000, writing: false });
  assert.ok(h >= 700 / 3 - 77 - 1, `${h} px of empty page`);
  assert.ok(h < 700 - 77 - 66);
  // A very small screen still leaves somewhere to tap.
  assert.equal(blankHeight({ view: 200, foot: 77, sticky: 66, peek: 2000, writing: false }), BLANK_MIN);
});

test('JN32: writing, the empty page grows to the whole screen under the date; the entry being written keeps its place above the caret', () => {
  assert.equal(blankHeight({ view: 500, foot: 77, sticky: 66, peek: 0, writing: true }), 500 - 77 - 66);
  assert.equal(blankHeight({ view: 500, foot: 77, sticky: 66, peek: 44, writing: true }), 500 - 77 - 66 - 44);
  // A photo and a long dateline above the caret never push the line being written off the screen.
  assert.ok(blankHeight({ view: 500, foot: 77, sticky: 66, peek: 900, writing: true }) >= 140);
});

test('JN32: the peek is the last entry at rest and while it is being written, and nothing before the first character', () => {
  const rows = ['day', 'entry', 'day', 'slip', 'entry', 'entry'] as const;
  assert.equal(peekStart(rows, false, false), 5);
  assert.equal(peekStart(rows, true, true), 5);
  assert.equal(peekStart(rows, true, false), 6);
  // The last entry is from an earlier day: writing begins under today's date.
  assert.equal(peekStart(['day', 'entry', 'day'], true, false), 2);
  assert.equal(peekStart(['day', 'entry', 'day'], false, false), 1);
  assert.equal(peekStart(['day'], false, false), 1);
});
