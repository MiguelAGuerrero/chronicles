/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTE_MAX, noteText } from '../../noteEdit';

// Quality of life round 3, QL25: a note's edited text, written from the
// criterion before the code.

test('QL25: the text is trimmed', () => {
  assert.equal(noteText('  the bakery on the corner \n'), 'the bakery on the corner');
});

test('QL25: blank or whitespace is no text (deleting is the menu\'s Delete)', () => {
  assert.equal(noteText(''), null);
  assert.equal(noteText('   '), null);
  assert.equal(noteText('\n\t  \n'), null);
});

// Amended by note pages NP8 (decision 0149): the limit is NOTE_MAX, 20,000 since the page.
test('QL25: the text is cut to the note\'s limit, as the composer', () => {
  const long = 'a'.repeat(NOTE_MAX + 120);
  assert.equal(noteText(long)?.length, NOTE_MAX);
  assert.equal(noteText(`  ${'b'.repeat(NOTE_MAX)}  `), 'b'.repeat(NOTE_MAX));
});

test('QL25: inner line breaks and spaces are kept', () => {
  assert.equal(noteText('one\n\ntwo  three'), 'one\n\ntwo  three');
});
