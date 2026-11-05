/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_EXTRACTORS } from '../../resurface/extractors';
import { deriveThreads } from '../../resurface/threads';
import type { SignalExtractor } from '../../resurface/types';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { at, moment, NOW } from './fixtures';

const derive = (ms: ReturnType<typeof moment>[], prefs = EMPTY_PREFS, ex: SignalExtractor[] = DEFAULT_EXTRACTORS) => deriveThreads(ms, ex, prefs, NOW);

test('RM11: a term in three moments on two days is a thread', () => {
  const ms = [moment(at(2026, 10, 1), 'Autumn on Bridge Street'), moment(at(2026, 10, 1), 'More autumn'), moment(at(2026, 10, 9), 'Autumn again')];
  const t = derive(ms);
  assert.equal(t.length, 1);
  assert.equal(t[0].name, 'Autumn');
  assert.equal(t[0].momentIds.length, 3);
});

test('RM11: a term used a lot on one day is not a thread', () => {
  const ms = [1, 2, 3, 4].map(() => moment(at(2026, 10, 1), 'statue statue'));
  assert.deepEqual(derive(ms), []);
});

test('RM11: two moments are not enough', () => {
  assert.deepEqual(derive([moment(at(2026, 10, 1), 'river'), moment(at(2026, 10, 2), 'river')]), []);
});

test('RM11: threads are ordered by how they recur over time, not by count', () => {
  const burst = [1, 1, 2].map((d) => moment(at(2026, 11, d), 'harbor'));
  const slow = [at(2026, 2, 3), at(2026, 5, 7), at(2026, 8, 9), at(2026, 10, 2)].map((t) => moment(t, 'statue'));
  assert.deepEqual(derive([...burst, ...slow]).map((t) => t.name), ['Statue', 'Harbor']);
});

test('RM12: a one-off never makes a thread', () => {
  assert.deepEqual(derive([moment(at(2026, 10, 1), 'A man at the bus stop told me about the clock tower')]), []);
});

test('RM12: a word in nearly every moment is too common to be a thread', () => {
  const ms = Array.from({ length: 12 }, (_, i) => moment(at(2026, 9, 1 + i), `lovely day number ${i}`));
  assert.deepEqual(derive(ms), []);
});

test('RM12: a thread keeps the way the user most often wrote it', () => {
  const ms = [at(2026, 9, 1), at(2026, 9, 2), at(2026, 9, 3)].map((t, i) => moment(t, i === 0 ? 'Statue' : 'statues'));
  assert.equal(derive(ms)[0].name, 'Statues');
});

test('RM13: a new extractor adds a thread with no change to deriveThreads', () => {
  const ms = [at(2026, 9, 1), at(2026, 9, 5), at(2026, 9, 9)].map((t) => moment(t, null, { kind: 'photo' }));
  assert.deepEqual(derive(ms), [], 'no words, no signal');
  const tagger: SignalExtractor = { id: 'tags', extract: () => [{ term: 'bridge', weight: 1, source: 'tag' }] };
  assert.equal(derive(ms, EMPTY_PREFS, [...DEFAULT_EXTRACTORS, tagger])[0].name, 'Bridge');
});

test('RM13: a memo gives a signal once it has words (a transcript)', () => {
  const ms = [at(2026, 9, 1), at(2026, 9, 5), at(2026, 9, 9)].map((t) => moment(t, 'the bakery before it opens', { kind: 'voice' }));
  assert.equal(derive(ms)[0].name, 'Bakery');
  const silent = ms.map((m) => ({ ...m, words: null }));
  assert.deepEqual(derive(silent), []);
});

test('RM13: a photo\'s caption and a note\'s text both count, a note\'s words are not read as a caption', () => {
  const ms = [moment(at(2026, 9, 1), 'harbor', { kind: 'photo' }), moment(at(2026, 9, 5), 'harbor', { kind: 'text' }), moment(at(2026, 9, 9), 'harbor', { kind: 'video' })];
  assert.equal(derive(ms)[0].momentIds.length, 3);
});

test('RM16: a rename shows, a removed term is not offered, a down-weighted one goes later', () => {
  const ms = [...[1, 2, 3].map((d) => moment(at(2026, 9, d), 'harbor')), ...[4, 5, 6].map((d) => moment(at(2026, 9, d), 'statue'))];
  const base = derive(ms).map((t) => t.term).sort();
  assert.deepEqual(base, ['harbor', 'statue']);
  assert.equal(derive(ms, { ...EMPTY_PREFS, renames: { statue: 'The foxes' } }).find((t) => t.term === 'statue')!.name, 'The foxes');
  assert.deepEqual(derive(ms, { ...EMPTY_PREFS, removed: ['statue'] }).map((t) => t.term), ['harbor']);
  assert.equal(derive(ms, { ...EMPTY_PREFS, less: ['harbor'] })[0].term, 'statue');
});

test('RM11: a thread knows the month it comes back in when two years agree', () => {
  const ms = [moment(at(2024, 10, 8), 'maple'), moment(at(2025, 10, 12), 'maple'), moment(at(2025, 10, 20), 'maple')];
  assert.equal(derive(ms)[0].seasonMonth, 9);
});
