/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LiveDot } from '../../liveDot';
import { coneHeading, headingOf } from '../../nav/navigator';
import { keptFixes, readTrace } from '../../rides';
import type { MotionState } from '../../steps';
import type { LngLat, TracePoint } from '../../types';

// The heading cone (Nov 3): the owner walked north and the cone pointed east.
// The Nov 1 fix (decision 0030) lived in headingOf, but the cone was turned by
// the live dot's own filter velocity, which never checked the trace or the
// course; told walking by the motion sensors, a few metres of sideways GPS
// wander was enough. And headingOf's 8 m window was too short for that wander
// too. These tests drive the cone as it is drawn: the dot's heading and the
// trace's, through coneHeading. Fixtures sit inside one z14 tile (lat 41.812).

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const off = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
}

/** North at 1.3 m/s, one fix a second, with wander of `sigma` m that carries from fix to fix, as a phone's does. */
function north(seconds: number, sigma: number, seed: number): TracePoint[] {
  const g = rng(seed);
  const rho = 0.9;
  const q = Math.sqrt(1 - rho * rho);
  let nx = 0;
  let ny = 0;
  const out: TracePoint[] = [];
  for (let s = 0; s <= seconds; s++) {
    nx = rho * nx + q * sigma * g();
    ny = rho * ny + q * sigma * g();
    out.push({ walk_id: 'w', t: s * 1000, lon: O[0] + nx * mLon, lat: O[1] + (1.3 * s + ny) * mLat, accuracy_m: 10, speed: null, course: null });
  }
  return out;
}

/** The cone as the walk screen draws it: the dot per fix, the trace as useLiveTrace reads it. */
function cones(fixes: TracePoint[], motion: MotionState) {
  const dot = new LiveDot();
  dot.setMotion(motion);
  const out: (number | null)[] = [];
  for (let i = 0; i < fixes.length; i++) {
    const d = dot.push(fixes[i]);
    const kept = keptFixes(readTrace(fixes.slice(Math.max(0, i - 60), i + 1), 0, []));
    out.push(coneHeading(d?.heading ?? null, headingOf(kept.slice(-30))));
  }
  return out;
}

/** The share of shown headings more than 45° from north, after the first 40 s. */
function wrong(hs: (number | null)[]) {
  const shown = hs.slice(40).filter((h): h is number => h != null);
  return { share: shown.filter((h) => off(h, 0) > 45).length / Math.max(1, shown.length), shown: shown.length };
}

test('heading 1: walking north through 5 m of GPS wander, the trace says north (owner, Nov 3)', () => {
  let bad = 0;
  let n = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const fixes = north(300, 5, seed * 7 + 1);
    for (let i = 40; i < fixes.length; i++) {
      const h = headingOf(fixes.slice(Math.max(0, i - 29), i + 1));
      if (h == null) continue;
      n++;
      if (off(h, 0) > 45) bad++;
    }
  }
  assert.ok(n > 2000, `a heading on ${n} fixes`);
  assert.ok(bad / n <= 0.03, `${((100 * bad) / n).toFixed(1)}% of headings more than 45° off`);
});

test('heading 2: the cone shows the dot only where it agrees with the trace within 20°; else the trace; hidden without either', () => {
  assert.equal(coneHeading(15, 0), 15, 'a dot within 20° turns sooner');
  assert.equal(coneHeading(350, 5), 350, 'agreement is measured the short way round');
  assert.equal(coneHeading(35, 0), 0, 'a dot 35° off loses: told walking, it swings with the wander');
  assert.equal(coneHeading(95, 5), 5, 'a dot pointing sideways loses to the trace');
  assert.equal(coneHeading(95, null), null, 'no trace to check it against: hidden');
  assert.equal(coneHeading(null, 5), null, 'the dot held still: hidden');
  assert.equal(coneHeading(null, null), null);
});

test('heading 3: told walking by the motion sensors, the cone points the way through GPS wander (owner, Nov 3: north, the cone said east)', () => {
  for (const motion of ['walking', 'unknown'] as const) {
    let bad = 0;
    let shown = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const r = wrong(cones(north(200, 5, seed * 7 + 1), motion));
      bad += r.share * r.shown;
      shown += r.shown;
    }
    assert.ok(shown > 800, `${motion}: the cone showed on ${shown} fixes`);
    assert.ok(bad / shown <= 0.03, `${motion}: ${((100 * bad) / shown).toFixed(1)}% of cones more than 45° off`);
  }
});

test('heading 4: on clean fixes the cone shows from about 20 m in, and points north', () => {
  const hs = cones(north(60, 0.01, 3), 'walking');
  const first = hs.findIndex((h) => h != null);
  assert.ok(first >= 15 && first <= 25, `first shown at fix ${first}`);
  assert.ok(hs.slice(first).every((h) => h != null && off(h, 0) < 5), 'north all the way');
});
