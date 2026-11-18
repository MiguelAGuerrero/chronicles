import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { matches, mergeFacets } from '../../outing/candidates';
import { matchWants, WANTS } from '../../outing/wants';
import { shop } from './fixtures';

const BANNED = /\b(best|top|most|popular|rated|cheap(er|est)?|hidden|gem|quiet|open|late|new|good|great|famous|fast(er|est)?|minutes?|hours?)\b/i;

test('QC4: v1 ships Antiques and Books, each a match over facets', () => {
  assert.deepEqual(WANTS.map((w) => w.id).sort(), ['antiques', 'books', 'thrifting']);
  assert.equal(matches(mergeFacets([WANTS.find((w) => w.id === 'antiques')!]), shop('x', 0, 0, ['antiques'])), true);
  assert.equal(matches(mergeFacets([WANTS.find((w) => w.id === 'books')!]), shop('x', 0, 0, ['antiques'])), false);
});

test('QC2: the entries are listed alphabetically by label, never by anything else', () => {
  const labels = WANTS.map((w) => w.label);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(matchWants(''), WANTS, 'an empty query shows every entry');
});

test('QC2: typing narrows by label and aliases only, and a query matching nothing shows nothing', () => {
  assert.deepEqual(matchWants('antiq').map((w) => w.id), ['antiques']);
  assert.deepEqual(matchWants('BOOK').map((w) => w.id), ['books']);
  assert.deepEqual(matchWants('teapots'), []);
  assert.deepEqual(matchWants('a1'), [], 'ids are not searched');
});

test('QC5: an entry says what a place is: no word of quality, price, popularity, time or opinion', () => {
  for (const w of WANTS) for (const text of [w.label, w.slotWord, ...w.aliases]) assert.doesNotMatch(text, BANNED, text);
});

test('QC4: no field orders, weights or prefers an entry', () => {
  for (const w of WANTS) assert.deepEqual(Object.keys(w).sort(), ['aliases', 'id', 'label', 'match', 'slotWord']);
  assert.match(readFileSync(new URL('../../outing/wants.ts', import.meta.url), 'utf8'), /never a measure/);
});

test('QC42: Thrifting matches second_hand, antiques and vintage; Antiques only antiques; Books widens it', () => {
  const by = (id: string) => WANTS.find((w) => w.id === id)!;
  const thrifting = mergeFacets([by('thrifting')]);
  for (const v of ['second_hand', 'antiques', 'vintage']) assert.equal(matches(thrifting, shop('x', 0, 0, [v])), true, v);
  assert.equal(matches(thrifting, shop('x', 0, 0, ['books'])), false);
  const antiques = mergeFacets([by('antiques')]);
  assert.equal(matches(antiques, shop('x', 0, 0, ['second_hand'])), false, 'second-hand is not antiques');
  const both = mergeFacets([by('thrifting'), by('books')]);
  assert.equal(matches(both, shop('x', 0, 0, ['books'])), true);
  assert.equal(matches(both, shop('x', 0, 0, ['second_hand'])), true);
});

test('QC2: the entries stay alphabetical with Thrifting, and Thrifting is found by its words', () => {
  assert.deepEqual(WANTS.map((w) => w.label), ['Antiques', 'Books', 'Thrifting']);
  assert.deepEqual(matchWants('thrift').map((w) => w.id), ['thrifting']);
  assert.deepEqual(matchWants('goodwill').map((w) => w.id), ['thrifting']);
  assert.deepEqual(matchWants('second').map((w) => w.id), ['thrifting']);
});
