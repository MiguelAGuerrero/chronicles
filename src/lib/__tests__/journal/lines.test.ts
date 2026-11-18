/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KEPT_AS_YOU_WRITE, LINE_LABELS, NOT_KEPT, clockTime, dateline, dayHeading, entrySpoken } from '../../journal/lines';

const NOW = new Date(2026, 10, 12, 15).getTime();
const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

test('JN2: the day in full, with its year only when it is another year', () => {
  assert.equal(dayHeading(at(2026, 11, 12, 9), NOW), 'Thursday, November 12');
  assert.equal(dayHeading(at(2026, 10, 20, 9), NOW), 'Tuesday, October 20');
  assert.equal(dayHeading(at(2025, 11, 12, 9), NOW), 'Wednesday, November 12, 2025');
});

test('JN5: the time alone until the context is read', () => {
  assert.equal(clockTime(at(2026, 11, 12, 8, 15)), '8:15 am');
  assert.equal(clockTime(at(2026, 11, 12, 0, 5)), '12:05 am');
  assert.equal(clockTime(at(2026, 11, 12, 17, 20)), '5:20 pm');
  assert.equal(dateline({ t: at(2026, 11, 12, 8, 15), now: NOW, placed: true, context: null }), '8:15 this morning');
  assert.equal(dateline({ t: at(2026, 10, 20, 14, 10), now: NOW, placed: true, context: null }), '2:10 pm');
});

test('JN5: then the place, and how far into its walk', () => {
  assert.equal(dateline({ t: at(2026, 11, 12, 8, 15), now: NOW, placed: true, context: { place: 'Elm Street, Fox Point', into: null } }), '8:15 this morning · Elm Street, Fox Point');
  assert.equal(
    dateline({ t: at(2026, 10, 20, 14, 50), now: NOW, placed: true, context: { place: 'Hope Street', into: 'Forty minutes in, just after a photo' } }),
    '2:50 pm · Hope Street · Forty minutes in, just after a photo',
  );
});

test('JN5: No location when the fix never came, and never before it could', () => {
  const t = NOW - 5 * 60_000;
  assert.match(dateline({ t, now: NOW, placed: false, context: null }), / · No location$/);
  assert.match(dateline({ t, now: NOW, placed: false, context: null, reason: 'denied' }), / · No location \(location is off\)$/);
  // Just begun: the fix may still be on its way, so no claim either way.
  assert.doesNotMatch(dateline({ t: NOW - 2000, now: NOW, placed: false, context: null }), /No location/);
  assert.match(dateline({ t: NOW - 2000, now: NOW, placed: false, context: null, reason: 'timeout' }), / · No location$/);
  // A fix with nothing known around it claims no place.
  assert.equal(dateline({ t: at(2026, 10, 20, 14, 10), now: NOW, placed: true, context: { place: null, into: null } }), '2:10 pm');
});

test('JN4: no generated sentence reaches the owner\'s voice: every line is the app\'s, with digits only in times and dates', () => {
  for (const s of [LINE_LABELS.write, LINE_LABELS.photo, LINE_LABELS.voice, KEPT_AS_YOU_WRITE, NOT_KEPT]) {
    assert.ok(s.length > 0, 'a line is written');
    assert.doesNotMatch(s, /[0-9?]/);
  }
  assert.equal(KEPT_AS_YOU_WRITE, 'Kept as you write');
  assert.deepEqual(LINE_LABELS, { write: 'Write an entry', photo: 'Add a photo or video', voice: 'Record a voice note' });
});

test('JN23: an entry spoken as its kind, its words, its dateline', () => {
  assert.equal(entrySpoken('text', 'A heron on the pier.', '8:15 this morning · Elm Street', false), 'Note, A heron on the pier., 8:15 this morning · Elm Street');
  assert.equal(entrySpoken('photo', null, '2:10 pm', true), 'Photo, with more in this moment, 2:10 pm');
});

test('chronicle-journal audit 7: an entry on a walk still open makes no place claim: the trace places it at Stop', () => {
  const t = NOW - 5 * 60_000;
  const line = dateline({ t, now: NOW, placed: false, context: { place: null, into: 'Forty minutes in' }, onOpenWalk: true });
  assert.doesNotMatch(line, /No location/);
  assert.match(line, / · Forty minutes in$/);
  // Off a walk, the same entry does say so.
  assert.match(dateline({ t, now: NOW, placed: false, context: null }), /No location/);
});
