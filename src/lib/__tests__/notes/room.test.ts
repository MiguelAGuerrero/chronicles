/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTE_MAX } from '../../noteEdit';
import { fits, roomOf, shownLength } from '../../notePage/room';

// Note pages NP8 (specs/note-pages, decision 0151): room for a long entry, said in words.

test('NP8: a note holds 20,000 characters', () => {
  assert.equal(NOTE_MAX, 20000);
});

test('NP8: characters are counted as shown; a mention counts as its words', () => {
  assert.equal(shownLength('see @[m1|the fig tree] again'), 'see the fig tree again'.length);
  assert.equal(shownLength('plain'), 5);
});

test('NP8: room left is said in words, never a number', () => {
  assert.deepEqual(roomOf('a'.repeat(NOTE_MAX - 1000)), { full: false, line: null });
  assert.deepEqual(roomOf('a'.repeat(NOTE_MAX - 999)), { full: false, line: 'Room for a few more lines' });
  assert.deepEqual(roomOf('a'.repeat(NOTE_MAX)), { full: true, line: 'This note is full' });
});

test('NP8: a mention picked at the end never takes the note past the limit (DEFERRED 12)', () => {
  const body = 'a'.repeat(NOTE_MAX - 5);
  assert.equal(fits(body, 'abcde'), true);
  assert.equal(fits(body, 'the fig tree'), false);
});
