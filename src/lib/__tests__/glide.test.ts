/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../geo';
import { walkerAt, type TimedRun } from '../replay';
import { GLIDE, glideAngle, glideAngleTo, glideDone, glidePos, glideTo } from '../glide';
import type { LngLat } from '../types';

// The walker's dot glides between fixes instead of jumping (G1-G8). Pure and
// on a caller-supplied clock; the display only, stored traces stay raw.

const A: LngLat = [-71.4, 41.812];
const east = (p: LngLat, m: number): LngLat => [p[0] + m / (111320 * Math.cos((p[1] * Math.PI) / 180)), p[1]];

test('G1 the first fix shows at once', () => {
  const g = glideTo(null, A, 1000);
  assert.deepEqual(glidePos(g, 1000), A);
  assert.ok(glideDone(g, 1000));
});

test('G2 a new fix glides linearly from where the dot is, and arrives', () => {
  let g = glideTo(null, A, 0);
  g = glideTo(g, east(A, 5), 1000);
  assert.ok(distanceM(glidePos(g, 1000), A) < 0.01, 'starts at the old spot');
  assert.ok(Math.abs(distanceM(glidePos(g, 1000 + g.dur / 2), A) - 2.5) < 0.05, 'halfway at half time');
  assert.ok(distanceM(glidePos(g, 1000 + g.dur), east(A, 5)) < 0.01);
  assert.ok(distanceM(glidePos(g, 9000), east(A, 5)) < 0.01, 'stays put after arriving');
  assert.ok(!glideDone(g, 1000 + g.dur / 2));
  assert.ok(glideDone(g, 1000 + g.dur));
});

test('G3 a fix mid-glide restarts from the displayed position, with no jump', () => {
  let g = glideTo(null, A, 0);
  g = glideTo(g, east(A, 10), 1000);
  const mid = glidePos(g, 1500);
  g = glideTo(g, east(A, 12), 1500);
  assert.ok(distanceM(glidePos(g, 1500), mid) < 0.01);
});

test('G4 the duration follows the fix interval, clamped', () => {
  let g = glideTo(null, A, 0);
  g = glideTo(g, east(A, 3), 2000);
  assert.ok(g.dur > GLIDE.defaultMs && g.dur <= 2000, `${g.dur}`);
  let fast = glideTo(null, A, 0);
  fast = glideTo(fast, east(A, 1), 50);
  assert.ok(fast.dur >= GLIDE.minMs);
  let slow = glideTo(null, A, 0);
  slow = glideTo(slow, east(A, 1), 60_000);
  assert.ok(slow.dur <= GLIDE.maxMs);
});

test('G5 a big jump (resume, GPS return) snaps instead of sliding across town', () => {
  let g = glideTo(null, A, 0);
  g = glideTo(g, east(A, GLIDE.snapM + 50), 1000);
  assert.deepEqual(glidePos(g, 1000), g.to);
  assert.ok(glideDone(g, 1000));
});

test('G6 a heading turns the short way round 0°', () => {
  let h = glideAngleTo(null, 350, 0, 1000);
  h = glideAngleTo(h, 10, 0, 1000);
  assert.equal(Math.round(glideAngle(h, 500)), 0);
  const end = glideAngle(h, 1000);
  assert.ok(Math.abs(end - 10) < 1e-9 || Math.abs(end - 370) < 1e-9);
});

test('G7 a first heading shows at once, and the result stays in 0-360', () => {
  const h = glideAngleTo(null, 90, 0, 1000);
  assert.equal(glideAngle(h, 0), 90);
  let t = glideAngleTo(null, 350, 0, 1000);
  t = glideAngleTo(t, 10, 0, 1000);
  for (const ms of [0, 250, 500, 750, 1000]) {
    const v = glideAngle(t, ms);
    assert.ok(v >= 0 && v < 360, `${v}`);
  }
});

test('G8 time never runs backwards into the past of a glide', () => {
  let g = glideTo(null, A, 1000);
  g = glideTo(g, east(A, 5), 2000);
  assert.ok(distanceM(glidePos(g, 500), A) < 0.01);
});

// The replay's dot is a slider on its own clock: no jump between 33 ms frames.
test('R1 the replay dot moves in even steps at frame rate, never in jumps', () => {
  const run: TimedRun = [];
  for (let s = 0; s <= 20; s++) run.push({ t: s * 1000, p: east(A, s * 5) });
  let prev = walkerAt([run], 0)!;
  let worst = 0;
  for (let t = 33; t <= 20_000; t += 33) {
    const p = walkerAt([run], t)!;
    worst = Math.max(worst, distanceM(prev, p));
    prev = p;
  }
  assert.ok(worst < 5 * 0.033 + 0.01, `largest step ${worst} m`);
});
