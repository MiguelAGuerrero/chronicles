/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt } from '../tileMath';
import type { LngLat } from '../types';
import { ringWords } from '../walk/layer';
import { walkTileKey } from '../walk/match';
import { areaWords, bandLengths } from '../walk/summary';
import type { WayFacts } from '../walk/types';

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

// The area card's line (WK11, owner's call 2026-11-04: the card, at town and neighbourhood level).

const C: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((C[1] * Math.PI) / 180);
const pt = (dx: number, dy: number): LngLat => [C[0] + dx / KX, C[1] + dy / 110_540];
let wn = 0;
const wy = (cls: string, a: [number, number], b: [number, number], more: Partial<WayFacts> = {}): WayFacts => ({ id: `r${wn++}`, cls, level: 0, line: [pt(...a), pt(...b)], ...more });
const home = tileAt(C);
const tl = (ws: WayFacts[]) => new Map([[walkTileKey(home.x, home.y), ws]]);

test('WK11: a ring is described by the streets inside it only; streets beyond it count for nothing', () => {
  const inside = [wy('motorway', [-300, 0], [300, 0]), wy('trunk', [-300, 100], [300, 100]), wy('primary', [-300, 200], [300, 200], { speedKmh: 90 })];
  const outside = [0, 1, 2, 3, 4].map((i) => wy('pedestrian', [-300, 1500 + i * 20], [300, 1500 + i * 20]));
  assert.equal(ringWords(tl([...inside, ...outside]), C, 800), 'Mostly built around cars');
  assert.equal(ringWords(tl(outside), C, 800), null, 'nothing of the ring was read');
  assert.equal(ringWords(new Map(), C, 800), null);
});

test('WK11, WK12: a ring of calm streets with sidewalks says easy on foot, in words with no number', () => {
  const calm = [0, 1, 2].flatMap((i) => [wy('residential', [-300, i * 60], [300, i * 60], { speedKmh: 30 }), wy('footway', [-300, i * 60 + 8], [300, i * 60 + 8], { sub: 'sidewalk' })]);
  const w = ringWords(tl(calm), C, 800);
  assert.equal(w, 'Mostly easy on foot');
  assert.ok(!/\d/.test(w!));
});
