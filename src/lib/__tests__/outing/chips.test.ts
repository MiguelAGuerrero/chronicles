import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shop } from './fixtures';
import { at } from '../walk-planner/grid';

// The outing's chips (OJ11-OJ15): kinds of attraction and kinds of shop in one list, each switched on widening what a stop may be.

const BANNED = /\b(best|top|most|popular|rated|cheap(er|est)?|hidden|gem|quiet|open|late|new|good|great|famous|fast(er|est)?|minutes?|hours?)\b/i;

test('OJ11: one list of chips, shops and attractions alike, none marked as either', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const ids = CHIPS.map((c) => c.id);
  for (const id of ['antiques', 'books', 'thrifting', 'art', 'history', 'culture', 'parks', 'viewpoints']) assert.ok(ids.includes(id), id);
  for (const c of CHIPS) assert.deepEqual(Object.keys(c).sort(), ['aliases', 'id', 'label', 'match', 'slotWord'], c.id);
});

test('OJ12: the chips on at first are the attractions whose kinds are on in "What I\'m into"; shop chips start off', async () => {
  const { defaultChips } = await import('../../outing/chips');
  const kinds = [{ id: 'public_art', category: 'art' }, { id: 'monuments', category: 'history' }, { id: 'churches', category: 'history' }, { id: 'gardens', category: 'parks' }];
  assert.deepEqual(defaultChips(kinds, new Set()), ['art', 'parks', 'history'], 'in the chips\' own order');
  assert.deepEqual(defaultChips(kinds, new Set(['public_art', 'monuments'])), ['parks', 'history'], 'a kind is off only when every kind of it is hidden');
  assert.deepEqual(defaultChips(kinds, new Set(['monuments', 'churches'])), ['art', 'parks']);
  for (const id of defaultChips(kinds, new Set())) assert.ok(!['antiques', 'books', 'thrifting'].includes(id));
});

test('OJ13: a chip says what a place is: no word of quality, price, popularity, time or opinion', async () => {
  const { CHIPS } = await import('../../outing/chips');
  for (const c of CHIPS) for (const text of [c.label, c.slotWord, ...c.aliases]) assert.doesNotMatch(text, BANNED, text);
});

test('OJ14: each chip switched on widens what a stop may be, across dimensions too', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const { matchesAny } = await import('../../outing/candidates');
  const by = (id: string) => CHIPS.find((c) => c.id === id)!;
  const thrift = shop('s', 0, 0, ['second_hand']);
  const mill = { id: 'p', at: at(0, 0), facets: { kind: ['history'] }, name: 'Old Mill' };
  assert.equal(matchesAny([by('thrifting')], thrift), true);
  assert.equal(matchesAny([by('thrifting')], mill), false);
  assert.equal(matchesAny([by('thrifting'), by('history')], mill), true, 'a second chip in another dimension adds, never narrows');
  assert.equal(matchesAny([by('thrifting'), by('history')], thrift), true);
  assert.equal(matchesAny([], thrift), false);
});

test('OJ15: the chips are in alphabetical order by label, and nothing orders them otherwise', async () => {
  const { CHIPS } = await import('../../outing/chips');
  const labels = CHIPS.map((c) => c.label);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
});
