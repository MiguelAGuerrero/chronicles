/// <reference types="node" />
// docs/DEFERRED.md, Quality of life 14: a figure broke from its unit at a line's end, "589 / m" in a place's
// header (picture 09-home-place). A no-break space inside each figure keeps it whole; the line still wraps between
// its parts, at their dots (ui-patterns, "content must not be lost").
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeSheetLine, timelineWalkLine, walkRowMeta } from '../../quietLines';

const NB = ' ';

test('tend chronicle 10: a walks row keeps each figure to its unit', () => {
  const meta = walkRowMeta('Nov 2, 2026', { distance_m: 1234, duration_ms: 25 * 60_000, photos: 0, voices: 0, notes: 0 });
  assert.equal(meta, `Nov 2, 2026 · 1.2${NB}km · 25${NB}min`);
  const long = walkRowMeta('Nov 2, 2026', { distance_m: 589, duration_ms: 65 * 60_000, photos: 0, voices: 0, notes: 0 });
  assert.equal(long, `Nov 2, 2026 · 589${NB}m · 1${NB}h${NB}05${NB}min`);
});

test('tend chronicle 10: a place\'s header and a day\'s walk line keep their distance to its unit', () => {
  assert.equal(placeSheetLine('Providence, Rhode Island', 1, '589 m'), `Providence, Rhode Island · one walk · 589${NB}m`);
  assert.equal(timelineWalkLine('1.2 km', 3), `Walk · 1.2${NB}km · three${NB}moments`);
  // The words between the figures still break where a line must: only the figures are bound.
  assert.match(placeSheetLine('Providence, Rhode Island', 1, '589 m'), /Providence, Rhode Island · one walk/);
});
