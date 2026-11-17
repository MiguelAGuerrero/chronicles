import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classesOfOsm } from '../../presence/presence';

test('QC16: shop/antiques is the class antiques beside boutique; the other shops are unchanged', () => {
  assert.deepEqual([...classesOfOsm('shop', 'antiques')].sort(), ['antiques', 'boutique']);
  assert.deepEqual(classesOfOsm('shop', 'gift'), ['boutique']);
});
