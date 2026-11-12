/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { noteHead } from '../../notePage/head';

// Note pages NP2 (specs/note-pages, decision 0151): the page is headed by its context, as Journal heads an entry.

const T = new Date(2026, 10, 12, 16, 12).getTime(); // Thursday, November 12, 2026, 4:12 pm
const NOW = new Date(2026, 10, 12, 18, 0).getTime();
const base = { t: T, now: NOW, time: '4:12 pm', context: null, placing: false, draft: null };

test('NP2: the day in large type, then the time and the moment\'s own context line', () => {
  const h = noteHead({ ...base, context: 'Hope Street, Fox Point · This afternoon · Ten minutes in, just after a photo' });
  assert.equal(h.day, 'Thursday, November 12');
  assert.equal(h.line, '4:12 pm · Hope Street, Fox Point · This afternoon · Ten minutes in, just after a photo');
  assert.equal(h.short, 'Nov 12 · Hope Street, Fox Point');
});

test('NP2: another year says its year', () => {
  assert.equal(noteHead({ ...base, t: new Date(2025, 2, 3, 9, 0).getTime() }).day, 'Monday, March 3, 2025');
});

test('NP2: no claim of a place it does not know', () => {
  assert.equal(noteHead({ ...base, placing: true }).line, '4:12 pm · Place not kept yet');
  assert.equal(noteHead({ ...base }).line, '4:12 pm · No place kept');
  assert.equal(noteHead({ ...base }).short, 'Nov 12');
});

test('NP2: a page being written says when, and whether it goes to a walk', () => {
  assert.equal(noteHead({ ...base, draft: { onWalk: true } }).line, '4:12 pm · On your walk');
  assert.equal(noteHead({ ...base, draft: { onWalk: false } }).line, '4:12 pm · Not on a walk');
});

test('NP2: the head never carries a count; only the date and time are digits', () => {
  const h = noteHead({ ...base, context: 'Hope Street · This afternoon · At the start' });
  assert.equal(`${h.line} ${h.short}`.replace(/4:12|Nov 12/g, '').match(/\d/), null);
});
