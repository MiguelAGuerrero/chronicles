import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPLEX_CODE, type Complex, type ComplexKind } from '../../complexes/types';
import { complexSection, FIRST_SHOWN, kindWord, nearestFirst, SEE_MORE } from '../../complexes/lines';
import type { LngLat } from '../../types';

// The card's words (CX4-CX6): the nearest few and a "See more", the kind as a word, never a number.

const HERE: LngLat = [-76.8826, 40.2599];
function cx(id: string, name: string, dLon: number, kind: ComplexKind = 'shopping'): Complex {
  const at: LngLat = [HERE[0] + dLon, HERE[1]];
  return { id, name, kind, polygons: [[[at, [at[0] + 0.0001, at[1]], [at[0], at[1] + 0.0001], at]]], at, bbox: [at[0], at[1], at[0] + 0.0001, at[1] + 0.0001], release: '2026-10-21.0', code: COMPLEX_CODE };
}
const many = [cx('a', 'Zed Mall', 0.001), cx('b', 'Alpha Square', 0.004), cx('c', 'Mid Market', 0.002, 'markets'), cx('d', 'Station Square 2', 0.003, 'stations'), cx('e', 'Beta Plaza', 0.005), cx('f', 'Civic Centre', 0.006, 'civic')];
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|dozen|several|few|many|couple)\b/i;

test('CX4: the section lists the nearest few with name, kind word and Walk to, and See more lists the rest; none shows nothing', { todo: 'test first' }, () => {
  const first = complexSection(many, { from: HERE, partial: false, hidden: [], expanded: false })!;
  assert.equal(first.title, 'Complexes');
  assert.equal(first.rows.length, FIRST_SHOWN);
  assert.equal(first.more, true);
  assert.deepEqual(first.rows[0].word, kindWord('shopping'));
  const all = complexSection(many, { from: HERE, partial: false, hidden: [], expanded: true })!;
  assert.equal(all.rows.length, many.length, 'every complex is reachable');
  assert.equal(all.more, false);
  assert.equal(complexSection([], { from: HERE, partial: false, hidden: [], expanded: false }), null);
  assert.equal(complexSection(many.slice(0, 2), { from: HERE, partial: true, hidden: [], expanded: false })!.title, 'Complexes near here');
  for (const r of all.rows) assert.equal(Object.keys(r).includes('holds'), false, 'no line about what it holds');
});

test('CX5: no label holds a digit or a counting word; a complex\'s own name is exempt', { todo: 'test first' }, () => {
  const all = complexSection(many, { from: HERE, partial: true, hidden: [], expanded: true })!;
  for (const text of [all.title, SEE_MORE, ...all.rows.flatMap((r) => [r.word, r.label.replace(r.name, '')])]) {
    assert.equal(/\d/.test(text), false, text);
    assert.equal(NUMBER_WORDS.test(text), false, text);
  }
  assert.ok(all.rows.some((r) => r.name === 'Station Square 2'), 'a name with a digit is kept');
});

test('CX6: nearest first, ties by name then id, the same order after See more; the label has no number; nothing says biggest', { todo: 'test first' }, () => {
  const order = nearestFirst(many, HERE).map((c) => c.id);
  assert.deepEqual(order, ['a', 'c', 'd', 'b', 'e', 'f']);
  const tied = nearestFirst([cx('2', 'Beta', 0.001), cx('1', 'Alpha', 0.001), cx('0', 'alpha', 0.001)], HERE).map((c) => c.id);
  assert.deepEqual(tied, ['0', '1', '2'], 'name, locale-free, then id');
  const first = complexSection(many, { from: HERE, partial: false, hidden: [], expanded: false })!.rows.map((r) => r.id);
  const all = complexSection(many, { from: HERE, partial: false, hidden: [], expanded: true })!.rows.map((r) => r.id);
  assert.deepEqual(all.slice(0, first.length), first);
  assert.equal(SEE_MORE, 'See more');
  for (const t of [SEE_MORE, ...all]) assert.equal(/biggest|busiest|largest|best/i.test(t), false);
});
