/// <reference types="node" />
// Chronicle's sheet says its counts in words beside the stars and pins that do (decision 0172: O15 as tend tabs 10).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeSheetLine, starSpoken } from '../../quietLines';

test('tend tabs 10: the place sheet says its walks in words, as its star does', () => {
  assert.equal(placeSheetLine('Providence, Rhode Island', 1, '175 m'), 'Providence, Rhode Island · one walk · 175 m');
  assert.equal(placeSheetLine('', 3, '2.4 km'), 'three walks · 2.4 km');
  assert.equal(placeSheetLine(null, 12, '9.0 km'), 'twelve walks · 9.0 km');
  // One voice for one count on one screen.
  assert.match(starSpoken({ label: 'Fox Point', walkIds: ['w'], count: 1 }), /one walk/);
});
