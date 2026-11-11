/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromLine, openWalkViews, toMomentViews, wordsOf } from '../../resurface/views';
import type { Walk } from '../../types';

const cap = (o: Partial<Faced>): Faced => facedOf({ id: 'c', walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body: null, segment_id: null, ...o });
const walk = (o: Partial<Walk>): Walk => ({ id: 'w', started_at: new Date(2026, 9, 4, 10).getTime(), ended_at: 2, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null, ...o });

test('RM5: a moment\'s words are its own: a note\'s text, a caption, a transcript when there is one', () => {
  assert.equal(wordsOf(cap({ kind: 'text', body: '  Maples  ' })), 'Maples');
  assert.equal(wordsOf(cap({ kind: 'photo', caption: 'The fox', file_path: 'f' })), 'The fox');
  assert.equal(wordsOf(cap({ kind: 'photo', file_path: 'f' })), null);
  assert.equal(wordsOf(cap({ kind: 'voice', file_path: 'f', body: '4200' })), null, 'a memo\'s body is its length, not words');
  assert.equal(wordsOf(cap({ kind: 'voice', file_path: 'f' }), () => 'the bakery'), 'the bakery');
});

test('RM5: a moment takes its walk\'s place; a moment without a file has no media', () => {
  const v = toMomentViews([cap({ id: 'a', walk_id: 'w', kind: 'photo', file_path: null, caption: 'x' }), cap({ id: 'b', body: 'hi' })], [walk({})]);
  assert.deepEqual(v.map((m) => [m.id, m.place, m.hasMedia]), [['a', 'Fox Point', false], ['b', null, true]]);
});

test('RM17: a moment of a walk still open, or of a walk that is gone, is left out', () => {
  const v = toMomentViews([cap({ id: 'a', walk_id: 'w' }), cap({ id: 'b', walk_id: 'open' }), cap({ id: 'c', walk_id: 'ghost' })], [walk({}), walk({ id: 'open', open: true, ended_at: null })]);
  assert.deepEqual(v.map((m) => m.id), ['a']);
});

test('RM18: the From line names the walk, else the part of the day; none for a moment on its own', () => {
  assert.equal(fromLine(walk({ title: 'Sunday by the river' })), 'From Sunday by the river');
  assert.match(fromLine(walk({}))!, /^From \w+ \w+ walk$/, 'no town: the arrival line carries the place');
  assert.equal(fromLine(undefined), null);
});

test('fix thread-in-walk: the moments of a walk still open are kept apart, for a thread to show (not for Lately)', () => {
  const caps = [cap({ id: 'a', walk_id: 'w' }), cap({ id: 'b', walk_id: 'open', body: 'a reply' }), cap({ id: 'c', walk_id: 'ghost' })];
  const walks = [walk({}), walk({ id: 'open', open: true, ended_at: null })];
  assert.deepEqual(openWalkViews(caps, walks).map((m) => [m.id, m.walkId, m.words]), [['b', 'open', 'a reply']]);
  assert.deepEqual(toMomentViews(caps, walks).map((m) => m.id), ['a'], 'Lately and the feed still leave it out (RM17)');
});
