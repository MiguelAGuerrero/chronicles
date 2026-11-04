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

test('QL25: the text is cut to 500 characters, as the composer', () => {
  assert.equal(NOTE_MAX, 500);
  const long = 'a'.repeat(620);
  assert.equal(noteText(long)?.length, 500);
  assert.equal(noteText(`  ${'b'.repeat(500)}  `), 'b'.repeat(500));
});

test('QL25: inner line breaks and spaces are kept', () => {
  assert.equal(noteText('one\n\ntwo  three'), 'one\n\ntwo  three');
});
