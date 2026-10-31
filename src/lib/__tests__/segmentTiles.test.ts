/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { intersects, segmentBbox, segmentTile, tileKeysFor } from '../db/segmentBounds';
import type { LngLat, StreetSegment } from '../types';

// The web fog read (perf, Nov 1): cached streets are read by tile, not by loading the whole store.

const O: LngLat = [-71.4, 41.82];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

test('segments: every piece touching the read is in the tiles the read asks for', () => {
  let seed = 5;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const segs: StreetSegment[] = Array.from({ length: 3000 }, (_, i) => {
    const a = m((rnd() - 0.5) * 6000, (rnd() - 0.5) * 6000);
    const ang = rnd() * Math.PI * 2;
    const len = 10 + rnd() * 190; // pieces are at most 200 m
    const b: LngLat = [a[0] + Math.cos(ang) * len * dLon, a[1] + Math.sin(ang) * len * dLat];
    return { id: `s${i}`, name: null, kind_detail: 'minor', length_m: len, build: 'b', geometry: [[a, b]] };
  });
  for (let q = 0; q < 20; q++) {
    const c = m((rnd() - 0.5) * 4000, (rnd() - 0.5) * 4000);
    const r = 1000;
    const box: [number, number, number, number] = [c[0] - r * dLon, c[1] - r * dLat, c[0] + r * dLon, c[1] + r * dLat];
    const keys = new Set(tileKeysFor(box));
    for (const s of segs) if (intersects(segmentBbox(s), box)) assert.ok(keys.has(segmentTile(s)), `${s.id} missed`);
    assert.ok(keys.size <= 16, `${keys.size} tiles`);
  }
});
