/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../geo';
import { LiveDot, LIVE_DOT } from '../liveDot';
import type { LngLat, TracePoint } from '../types';

// The live dot (Nov 1): the walk map's dot lagged 2-4 s behind, slid back over
// ground already walked, and its cone swung at sharp angles, because it was the
// newest point of a trace re-read every 2 s. The dot now runs on its own: one
// update per fix, a position-and-speed filter, held still unless the walker is
// clearly going somewhere. Fixtures sit inside one z14 tile (lat 41.812).

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const xy = (p: LngLat): [number, number] => [(p[0] - O[0]) / mLon, (p[1] - O[1]) / mLat];

function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
}

type Truth = (s: number) => [number, number];
const still: Truth = () => [0, 0];
/** East at 1.4 m/s. */
const east: Truth = (s) => [1.4 * s, 0];
/** East for 60 s, then north. */
const turn: Truth = (s) => (s <= 60 ? [1.4 * s, 0] : [84, 1.4 * (s - 60)]);

/** One fix a second along the truth, with wander that carries from fix to fix, as a phone's does. */
function feed(truth: Truth, seconds: number, o: { sigma?: number; rho?: number; accuracy?: number; seed?: number; t0?: number } = {}) {
  const g = rng(o.seed ?? 5);
  const sigma = o.sigma ?? 3;
  const rho = o.rho ?? 0.9;
  const q = Math.sqrt(1 - rho * rho);
  let nx = 0;
  let ny = 0;
  const out: { p: TracePoint; truth: LngLat }[] = [];
  for (let s = 0; s <= seconds; s++) {
    nx = rho * nx + q * sigma * g();
    ny = rho * ny + q * sigma * g();
    const [x, y] = truth(s);
    const [lon, lat] = at(x + nx, y + ny);
    out.push({ p: { walk_id: 'w', t: (o.t0 ?? 0) + s * 1000, lon, lat, accuracy_m: o.accuracy ?? 10, speed: null, course: null }, truth: at(x, y) });
  }
  return out;
}

function run(dot: LiveDot, fixes: ReturnType<typeof feed>) {
  return fixes.map(({ p, truth }) => ({ shown: dot.push(p), truth, t: p.t }));
}

test('live dot 1: it moves on every fix, without waiting for the trace', () => {
  const dot = new LiveDot();
  const fixes = feed(east, 20, { sigma: 0.5 });
  const shown = run(dot, fixes).map((r) => r.shown?.at);
  assert.ok(shown.every(Boolean));
  // Walking, each new fix moves the dot on.
  for (let i = 10; i < shown.length; i++) assert.ok(xy(shown[i]!)[0] > xy(shown[i - 1]!)[0], `fix ${i} moved it on`);
});

test('live dot 2: walking, it stays close to where the walker really is', () => {
  const dot = new LiveDot();
  const rows = run(dot, feed(turn, 150)).filter((r) => r.t > 10_000);
  const errs = rows.map((r) => distanceM(r.shown!.at, r.truth));
  const avg = errs.reduce((a, b) => a + b, 0) / errs.length;
  assert.ok(avg < 5, `about ${avg.toFixed(1)} m off on average`);
  assert.ok(Math.max(...errs) < 15, `never more than ${Math.max(...errs).toFixed(1)} m off`);
});

test('live dot 3: walking, it never slides back over ground already covered', () => {
  const dot = new LiveDot();
  const rows = run(dot, feed(east, 120));
  let back = 0;
  for (let i = 11; i < rows.length; i++) if (xy(rows[i].shown!.at)[0] < xy(rows[i - 1].shown!.at)[0] - 0.5) back++;
  assert.ok(back <= 1, `slid back ${back} times`);
});

test('live dot 4: standing still, it stays put', () => {
  const dot = new LiveDot();
  const rows = run(dot, feed(still, 180, { sigma: 3, accuracy: 10 }));
  let moved = 0;
  for (let i = 1; i < rows.length; i++) moved += distanceM(rows[i - 1].shown!.at, rows[i].shown!.at);
  assert.ok(moved < 15, `moved ${moved.toFixed(0)} m in three minutes`);
  const pointed = rows.slice(5).filter((r) => r.shown!.heading != null).length;
  // Wander that carries a full accuracy's width in one direction looks like a first step; allow a blink.
  assert.ok(pointed <= 2, `pointed a direction on ${pointed} fixes while standing`);
});

test('live dot 5: the direction follows the walk and turns once at a corner, not back and forth', () => {
  const dot = new LiveDot();
  const heads = run(dot, feed(turn, 150))
    .map((r) => r.shown!.heading)
    .filter((h): h is number => h != null);
  let swings = 0;
  for (let i = 1; i < heads.length; i++) if (Math.abs(((heads[i] - heads[i - 1] + 540) % 360) - 180) > 45) swings++;
  assert.ok(swings <= 1, `${swings} sharp swings`);
  // East on the first leg, north on the second.
  assert.ok(Math.abs(((heads[20] - 90 + 540) % 360) - 180) < 20, `first leg heads ${heads[20]}`);
  assert.ok(Math.abs(((heads.at(-1)! + 540) % 360) - 180) < 20, `second leg heads ${heads.at(-1)}`);
});

test('live dot 6: a fix worse than the accuracy gate is ignored', () => {
  const dot = new LiveDot();
  const fixes = feed(still, 30, { sigma: 0.5 });
  run(dot, fixes);
  const before = dot.current()!.at;
  const [lon, lat] = at(200, 0);
  const shown = dot.push({ ...fixes[0].p, t: 31_000, lon, lat, accuracy_m: 80 });
  assert.ok(distanceM(before, shown!.at) < 1);
});

test('live dot 7: after a long gap or a big jump, it starts again where the walker is', () => {
  const dot = new LiveDot();
  run(dot, feed(east, 30, { sigma: 0.5 }));
  const far = at(42 + LIVE_DOT.resetM + 50, 0);
  const jumped = dot.push({ walk_id: 'w', t: 31_000, lon: far[0], lat: far[1], accuracy_m: 10, speed: null, course: null });
  assert.ok(distanceM(jumped!.at, far) < 1, 'snapped to the new place');
  const later = at(0, 300);
  const resumed = dot.push({ walk_id: 'w', t: 31_000 + LIVE_DOT.gapMs + 1000, lon: later[0], lat: later[1], accuracy_m: 10, speed: null, course: null });
  assert.ok(distanceM(resumed!.at, later) < 1, 'starts again after a gap');
  assert.equal(resumed!.heading, null);
});

test('live dot 8: a fix from before the walk began, or out of order, is ignored', () => {
  const dot = new LiveDot(10_000);
  const stale = at(500, 500);
  assert.equal(dot.push({ walk_id: 'w', t: 1000, lon: stale[0], lat: stale[1], accuracy_m: 10, speed: null, course: null }), null);
  run(dot, feed(still, 10, { t0: 10_000, sigma: 0.5 }));
  const before = dot.current()!.at;
  dot.push({ walk_id: 'w', t: 12_000, lon: stale[0], lat: stale[1], accuracy_m: 10, speed: null, course: null });
  assert.deepEqual(dot.current()!.at, before);
});

test('live dot 9: it leads to where the walker is now, so the glide ends on time, never past a stop', () => {
  const dot = new LiveDot();
  // Walk east 60 s, then stop dead for 30 s.
  const stop: Truth = (s) => [Math.min(s, 60) * 1.4, 0];
  const rows = run(dot, feed(stop, 90, { sigma: 0.5 }));
  const walking = rows.find((r) => r.t === 40_000)!;
  // The lead is about one fix ahead of the filtered spot while walking.
  assert.ok(xy(walking.shown!.lead)[0] > xy(walking.shown!.at)[0] + 0.5);
  // After the stop, it settles where the walker stopped, not beyond.
  const end = rows.at(-1)!;
  assert.ok(Math.abs(xy(end.shown!.lead)[0] - 84) < 4, `settled at ${xy(end.shown!.lead)[0].toFixed(1)} m`);
});
