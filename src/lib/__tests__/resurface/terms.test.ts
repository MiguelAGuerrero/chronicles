/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { termsOf, titleCase } from '../../resurface/terms';

test('RM12: terms ignore case and accents, fold plurals, and drop common words', () => {
  assert.deepEqual(termsOf('The Statues by the Café, and a statue!').map((t) => t.term).sort(), ['cafe', 'statue']);
  assert.deepEqual(termsOf('Bakeries and a bakery').map((t) => t.term), ['bakery']);
});

test('RM12: an alias folds into one term (fall is autumn)', () => {
  assert.deepEqual(termsOf('Fall light, autumn light').map((t) => t.term).sort(), ['autumn', 'light']);
});

test('RM12: the shown form is the way it was written, and short words never count', () => {
  const t = termsOf('Waterfronts at dusk, an ox');
  assert.deepEqual(t.map((x) => [x.term, x.shown]), [['waterfront', 'waterfronts'], ['dusk', 'dusk']]);
});

test('RM12: numbers and punctuation are not terms', () => {
  assert.deepEqual(termsOf('1987 -- 42!!'), []);
});

test('RM12: a name is capitalised', () => {
  assert.equal(titleCase('autumn'), 'Autumn');
  assert.equal(titleCase(''), '');
});
