import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classesOfOsm, densityWeight, markClassOf } from '../../presence/presence';

test('QC16: shop/antiques is the class antiques beside boutique; the other shops are unchanged', () => {
  assert.deepEqual([...classesOfOsm('shop', 'antiques')].sort(), ['antiques', 'boutique']);
  assert.deepEqual(classesOfOsm('shop', 'gift'), ['boutique']);
});

test('QC14, QC42: shop/books, a library\'s books and a books poi are the class books; shop/second_hand and shop/charity second_hand; each beside boutique', () => {
  for (const [c, s] of [['shop', 'books'], ['library', 'books'], ['books', 'books']]) assert.deepEqual([...classesOfOsm(c, s)].sort(), ['books', 'boutique'], `${c}/${s}`);
  for (const sub of ['second_hand', 'charity']) assert.deepEqual([...classesOfOsm('shop', sub)].sort(), ['boutique', 'second_hand'], sub);
  assert.deepEqual(classesOfOsm('library', 'library'), ['community'], 'a library itself is unchanged');
  assert.deepEqual(classesOfOsm('shop', 'gift'), ['boutique']);
});

test('QC14, QC42: the new classes move no weight, storefront or mark: they weigh as boutique does', () => {
  for (const c of ['books', 'second_hand', 'antiques'] as const) {
    assert.equal(densityWeight([c]), densityWeight(['boutique']), c);
    assert.equal(markClassOf([c]), null, `${c} alone is no mark`);
  }
});
