/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaWords, bandLengths } from '../walk/summary';

// Walkability (WK11, WK12), written from specs/walkability/spec.md before the code.

const L = (foot: number, mixed: number, car: number, unknown = 0) => ({ foot, mixed, car, unknown });

test('WK11: an area is said in words from its streets', () => {
  assert.equal(areaWords(L(800, 100, 100)), 'Mostly easy on foot');
  assert.equal(areaWords(L(100, 100, 800)), 'Mostly built around cars');
  assert.equal(areaWords(L(400, 100, 500)), 'A mix of easy and car-oriented streets');
  assert.equal(areaWords(L(100, 800, 100)), 'Mostly mixed');
  // Most of it unknown: nothing is said.
  assert.equal(areaWords(L(100, 50, 50, 900)), null);
  assert.equal(areaWords(L(0, 0, 0, 0)), null);
});

test('WK11: lengths add up per band, unknown for a segment with none', () => {
  const segs = [{ id: 'a', length_m: 100 }, { id: 'b', length_m: 50 }, { id: 'c', length_m: 25 }];
  const got = bandLengths(segs, new Map([['a', 'foot'], ['b', 'car']] as const));
  assert.deepEqual(got, { foot: 100, mixed: 0, car: 50, unknown: 25 });
});

test('WK12: nothing is a score: no digit, percent or comparison in any line', () => {
  const lines = [L(800, 100, 100), L(100, 100, 800), L(400, 100, 500), L(100, 800, 100), L(1, 1, 1, 0)].map(areaWords);
  for (const line of lines) {
    if (line == null) continue;
    assert.ok(!/\d|%|most walkable|more walkable|less walkable|best|worst|rank/i.test(line), line);
  }
});
