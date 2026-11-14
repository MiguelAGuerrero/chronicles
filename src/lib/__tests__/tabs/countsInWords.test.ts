/// <reference types="node" />
// Chronicle's sheet says its counts in words beside the stars and pins that do (decision 0172: O15 as tend tabs 10,
// O18 as tend tabs 11).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moreFor, placeSheetLine, starSpoken, timelineWalkLine, timelineWalkSpoken } from '../../quietLines';

test('tend tabs 10: the place sheet says its walks in words, as its star does', () => {
  assert.equal(placeSheetLine('Providence, Rhode Island', 1, '175 m'), 'Providence, Rhode Island · one walk · 175 m');
  assert.equal(placeSheetLine('', 3, '2.4 km'), 'three walks · 2.4 km');
  assert.equal(placeSheetLine(null, 12, '9.0 km'), 'twelve walks · 9.0 km');
  // One voice for one count on one screen.
  assert.match(starSpoken({ label: 'Fox Point', walkIds: ['w'], count: 1 }), /one walk/);
});

test("tend tabs 11: a day's timeline says a walk's moments in words", () => {
  assert.equal(timelineWalkLine('1.2 km', 3), 'Walk · 1.2 km · three moments');
  assert.equal(timelineWalkLine(null, 1), 'Walk · one moment');
  assert.equal(timelineWalkSpoken('4:12 PM', 'Plums by the bridge', timelineWalkLine('1.2 km', 3)), '4:12 PM, Plums by the bridge, Walk, 1.2 km, three moments. Replay it');
});

test("tend tabs 11: a walk's More is named by its title wherever the title is known", () => {
  assert.equal(moreFor('Plums by the bridge'), 'More for Plums by the bridge');
});

test('tend tabs audit 22: a day\'s walk that kept nothing says no count, never "zero moments"', () => {
  assert.equal(timelineWalkLine('145 m', 0), 'Walk · 145 m');
  assert.equal(timelineWalkLine(null, 0), 'Walk');
  assert.equal(timelineWalkSpoken('4:12 PM', 'Plums', timelineWalkLine('145 m', 0)), '4:12 PM, Plums, Walk, 145 m. Replay it');
});
