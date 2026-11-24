/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { END_MARK_R } from '../../pins';
import { endsTogether, traceEnds } from '../../traceEnds';
import type { LngLat } from '../../types';

// Quality of life: start and end markers (QL1-QL4), written from the criteria
// before the code.

const a: LngLat = [-71.4, 41.812];
const b: LngLat = [-71.401, 41.813];
const c: LngLat = [-71.402, 41.814];
const d: LngLat = [-71.403, 41.815];

test('QL4: no points, no markers', () => {
  assert.deepEqual(traceEnds([], false), { start: null, end: null });
  assert.deepEqual(traceEnds([], true), { start: null, end: null });
  assert.deepEqual(traceEnds([[], []], true), { start: null, end: null });
});

test('QL1/QL4: the start is the first point of the first non-empty run', () => {
  assert.deepEqual(traceEnds([[a, b], [c, d]], false).start, a);
  assert.deepEqual(traceEnds([[], [b, c], [d]], false).start, b);
});

test('QL2/QL4: a live walk has no end marker', () => {
  assert.equal(traceEnds([[a, b], [c, d]], false).end, null);
});

test('QL2/QL4: once ended, the end is the last point of the last non-empty run', () => {
  assert.deepEqual(traceEnds([[a, b], [c, d]], true).end, d);
  assert.deepEqual(traceEnds([[a, b], [c], []], true).end, c);
});

test('QL4: a single fix is both the start and, once ended, the end', () => {
  assert.deepEqual(traceEnds([[a]], true), { start: a, end: a });
  assert.deepEqual(traceEnds([[a]], false), { start: a, end: null });
});

// tend map T50 (the owner's yes, Nov 20, "One combined mark (Recommended)", decision 0244): a walk that ends 3 m from
// where it began drew the end's bullseye over the start, whose green showed only as a crescent beside it. When the two
// fall within one marker's diameter on screen (22 px, `END_MARK_R` twice), they are one mark; apart, two as before.
// Judged on screen, so the same two points are one mark zoomed out and two zoomed in.

/** A point `px` screen pixels east of `at` at zoom `z` (web mercator, 512 px tiles, as the maps). */
const eastBy = (at: LngLat, px: number, z: number): LngLat => [at[0] + (px * 360) / (512 * 2 ** z), at[1]];

test('tend map T50: a finished walk whose ends lie within one marker\'s diameter on screen is one mark', () => {
  const z = 16;
  assert.equal(endsTogether({ start: a, end: a }, z), true, 'ends on its start');
  assert.equal(endsTogether({ start: a, end: eastBy(a, 3, z) }, z), true, '3 px apart');
  assert.equal(endsTogether({ start: a, end: eastBy(a, 2 * END_MARK_R - 0.5, z) }, z), true, 'just under one diameter');
  assert.equal(endsTogether({ start: a, end: eastBy(a, 2 * END_MARK_R + 0.5, z) }, z), false, 'just past one diameter: two marks');
  assert.equal(endsTogether({ start: a, end: eastBy(a, 60, z) }, z), false, 'well apart');
  // North-south counts the same as east-west: the distance on screen, whichever way.
  const north: LngLat = [a[0], a[1] + 0.00005];
  const pxNorth = (() => {
    const y = (lat: number) => ((1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2) * 512 * 2 ** z;
    return Math.abs(y(north[1]) - y(a[1]));
  })();
  assert.equal(endsTogether({ start: a, end: north }, z), pxNorth <= 2 * END_MARK_R);
});

test('tend map T50: judged at this scale: the same two ends are one mark zoomed out and two zoomed in', () => {
  const end = eastBy(a, 15, 16); // 15 px apart at zoom 16
  assert.equal(endsTogether({ start: a, end }, 16), true);
  assert.equal(endsTogether({ start: a, end }, 15), true, '7.5 px at 15');
  assert.equal(endsTogether({ start: a, end }, 17), false, '30 px at 17');
  assert.equal(endsTogether({ start: a, end }, 16.5), true, '21.2 px at 16.5');
  assert.equal(endsTogether({ start: a, end }, 16.6), false, '22.7 px at 16.6');
});

test('tend map T50: a live walk, a walk with no points, or a map whose zoom is not yet known keeps the marks as they are', () => {
  assert.equal(endsTogether(traceEnds([[a, b, a]], false), 16), false, 'live: no end, the dot is its end');
  assert.equal(endsTogether(traceEnds([], true), 16), false);
  assert.equal(endsTogether(traceEnds([[a, b, a]], true), null), false, 'no zoom yet');
  assert.equal(endsTogether(traceEnds([[a, b, a]], true), undefined), false);
  assert.equal(endsTogether(traceEnds([[a, b, a]], true), 16), true, 'a loop, once ended and its zoom known');
});
