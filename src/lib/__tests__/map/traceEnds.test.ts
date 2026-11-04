/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { traceEnds } from '../../traceEnds';
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
