/// <reference types="node" />
// The tabs audit's second batch (U13, U15): counts said as words, and a fit that stops short of street signs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newStreetsLine, walkRowMeta } from '../quietLines';
import { passedLine } from '../explore/explore';
import { capFitBounds, fitZoomFor } from '../zoomOut';

test('tabs audit U13: new streets are a quiet clause, naming one or two, never a big number', () => {
  assert.equal(newStreetsLine([]), null);
  assert.equal(newStreetsLine(['Elm Street']), 'your first time down Elm Street');
  assert.equal(newStreetsLine(['Elm Street', 'Hope Street']), 'your first time down Elm Street and Hope Street');
  assert.equal(newStreetsLine(['A Street', 'B Street', 'C Street']), '3 streets new to you');
});

test('tabs audit U13: what a walk passed is named, or "a few places", never counted', () => {
  const p = (name: string, generic = false) => ({ name, generic });
  assert.equal(passedLine([]), null);
  assert.equal(passedLine([p('Hessian Memorial')]), 'Passed Hessian Memorial without stopping');
  assert.equal(passedLine([p('Hessian Memorial'), p('A viewpoint', true)]), 'Passed Hessian Memorial and a viewpoint without stopping');
  assert.equal(passedLine([p('A'), p('B'), p('C')]), 'Passed a few places without stopping');
});

test('tabs audit U13: a walks list row keeps distance and time, and counts no new streets', () => {
  const s = { distance_m: 1234, duration_ms: 25 * 60_000, new_streets: 3, photos: 1, videos: 0, voices: 0, notes: 2 };
  const meta = walkRowMeta('Nov 2, 2026', s);
  assert.match(meta, /^Nov 2, 2026 · 1\.2 km · 25 min/);
  assert.doesNotMatch(meta, /new street/);
});

test('tabs audit U15: a fit to one short walk is widened so it never zooms past z15', () => {
  const size = { width: 390, height: 788 };
  const padding = { top: 60, right: 48, bottom: 172, left: 48 };
  // About 90 m of walk: fitted as it is, it would land near z18.
  const walk: [number, number, number, number] = [-71.4005, 41.8115, -71.4, 41.8122];
  assert.ok(fitZoomFor(walk, size, padding) > 17);
  const capped = capFitBounds(walk, 15, size, padding);
  assert.ok(Math.abs(fitZoomFor(capped, size, padding) - 15) < 0.01, `z${fitZoomFor(capped, size, padding)}`);
  // Its middle stays where it was.
  assert.ok(Math.abs((capped[0] + capped[2]) / 2 - (walk[0] + walk[2]) / 2) < 1e-9);
  // A wide walk is left alone.
  const wide: [number, number, number, number] = [-71.43, 41.80, -71.38, 41.83];
  assert.deepEqual(capFitBounds(wide, 15, size, padding), wide);
});
