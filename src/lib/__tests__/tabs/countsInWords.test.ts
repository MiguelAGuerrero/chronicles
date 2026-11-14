/// <reference types="node" />
// Chronicle's sheet says its counts in words beside the stars and pins that do (decision 0172: O15 as tend tabs 10,
// O18 as tend tabs 11).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCaptures } from '../../format';
import { moreFor, placeSheetLine, starSpoken, timelineWalkLine, timelineWalkSpoken, walkRowMeta } from '../../quietLines';

test('tend tabs 10: the place sheet says its walks in words, as its star does', () => {
  assert.equal(placeSheetLine('Providence, Rhode Island', 1, '175 m'), 'Providence, Rhode Island · one walk · 175 m');
  assert.equal(placeSheetLine('', 3, '2.4 km'), 'three walks · 2.4 km');
  assert.equal(placeSheetLine(null, 12, '9.0 km'), 'twelve walks · 9.0 km');
  // One voice for one count on one screen.
  assert.match(starSpoken({ label: 'Fox Point', walkIds: ['w'], count: 1 }), /one walk/);
});

test("tend tabs 11: a day's timeline says a walk's moments in words", () => {
  assert.equal(timelineWalkLine('1.2 km', 3), 'Walk · 1.2 km · three\u00a0moments');
  assert.equal(timelineWalkLine(null, 1), 'Walk · one\u00a0moment');
  assert.equal(timelineWalkSpoken('4:12 PM', 'Plums by the bridge', timelineWalkLine('1.2 km', 3)), '4:12 PM, Plums by the bridge, Walk, 1.2 km, three\u00a0moments. Replay it');
});

test("tend tabs 11: a walk's More is named by its title wherever the title is known", () => {
  assert.equal(moreFor('Plums by the bridge'), 'More for Plums by the bridge');
});

test('tend tabs audit 22: a day\'s walk that kept nothing says no count, never "zero moments"', () => {
  assert.equal(timelineWalkLine('145 m', 0), 'Walk · 145 m');
  assert.equal(timelineWalkLine(null, 0), 'Walk');
  assert.equal(timelineWalkSpoken('4:12 PM', 'Plums', timelineWalkLine('145 m', 0)), '4:12 PM, Plums, Walk, 145 m. Replay it');
});

test('tend tabs audit 23: the walks row\'s clause starts lowercase after its dot, and "a" keeps to its noun', () => {
  // The owner, Nov 14, "Lowercase after a dot": a capital only where the clause starts a line, as on the card.
  const meta = walkRowMeta('Nov 2, 2026', { distance_m: 1234, duration_ms: 25 * 60_000, photos: 1, videos: 1, voices: 0, notes: 2 });
  assert.equal(meta, 'Nov 2, 2026 · 1.2 km · 25 min · a photo, a video and two notes');
  assert.equal(formatCaptures({ photos: 1, voices: 1, notes: 0 }), 'A photo and a voice memo');
  assert.equal(walkRowMeta('Nov 2, 2026', { distance_m: 1234, duration_ms: 25 * 60_000, photos: 0, voices: 0, notes: 0 }), 'Nov 2, 2026 · 1.2 km · 25 min');
});

test('tend tabs audit 24: a day\'s walk line keeps its count on its noun\'s line', () => {
  assert.equal(timelineWalkLine('145 m', 1), 'Walk · 145 m · one moment');
  assert.equal(timelineWalkLine('1.2 km', 23), 'Walk · 1.2 km · twenty-three moments');
});
