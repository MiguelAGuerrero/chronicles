/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aboutTimeLeft, DEFAULT_PACE_MPS, formatTimeLeft, PACE_CLAMP, PACE_MIN_M, PACE_MIN_MS, paceMps, spokenTimeLeft, timeAtPaceMs, timeLeftMs } from '../nav/eta';

// Quality of life, round 2 (QL17-QL18): time left while navigating, written before the code.

const near = (got: number, want: number, tol: number, what: string) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, wanted ${want}`);

test('QL17: before 100 m or 60 s walked, the time left assumes 1.3 m/s', () => {
  assert.equal(DEFAULT_PACE_MPS, 1.3);
  assert.equal(PACE_MIN_M, 100);
  assert.equal(PACE_MIN_MS, 60_000);
  near(timeLeftMs(450, 0, 0), 346_154, 1000, '450 m at the start');
  near(timeLeftMs(450, 99, 120_000), 346_154, 1000, 'under 100 m walked');
  near(timeLeftMs(450, 200, 59_000), 346_154, 1000, 'under 60 s walked');
  assert.equal(paceMps(99, 120_000), DEFAULT_PACE_MPS);
});

test('QL17: once 100 m and 60 s are walked, the pace is walked metres over moving time', () => {
  near(timeLeftMs(450, 600, 400_000), 300_000, 1, '450 m at 1.5 m/s');
  near(paceMps(600, 400_000), 1.5, 1e-9, 'pace');
  near(timeLeftMs(450, 100, 60_000), 270_000, 1, 'exactly at the thresholds');
});

test('QL17: the pace is clamped to 0.7–2.0 m/s', () => {
  assert.deepEqual(PACE_CLAMP, [0.7, 2.0]);
  near(paceMps(300, 1_000_000), 0.7, 1e-9, 'a slow stroll reads 0.7');
  near(timeLeftMs(300, 300, 1_000_000), 300_000 / 0.7, 1, '300 m at 0.7 m/s');
  near(paceMps(1000, 100_000), 2.0, 1e-9, 'a bus reads 2.0');
  near(timeLeftMs(1000, 1000, 100_000), 500_000, 1, '1000 m at 2.0 m/s');
});

test('QL17: nothing left takes no time', () => {
  assert.equal(timeLeftMs(0, 600, 400_000), 0);
  assert.equal(timeLeftMs(0, 0, 0), 0);
  assert.equal(timeLeftMs(-5, 600, 400_000), 0);
  assert.equal(timeAtPaceMs(0, 1.3), 0);
  near(timeAtPaceMs(450, 1.5), 300_000, 1, '450 m at a given pace');
});

test('QL17: the time left reads "< 1 min" under a minute, else as a duration', () => {
  assert.equal(formatTimeLeft(0), '< 1 min');
  assert.equal(formatTimeLeft(30_000), '< 1 min');
  assert.equal(formatTimeLeft(59_999), '< 1 min');
  assert.equal(formatTimeLeft(60_000), '1 min');
  assert.equal(formatTimeLeft(360_000), '6 min');
  assert.equal(formatTimeLeft(3_900_000), '1 h 05 min');
  // What the e2e reads from the bar.
  const re = /·\s*(<\s*1|\d+(\s*h\s*\d+)?)\s*min/;
  for (const ms of [30_000, 360_000, 3_900_000]) assert.ok(re.test(`450 m · ${formatTimeLeft(ms)} · Your spot`), `the e2e reads ${formatTimeLeft(ms)}`);
});

test('QL18: the spoken time left is in words a screen reader says well', () => {
  assert.equal(spokenTimeLeft(30_000), 'under a minute');
  assert.equal(spokenTimeLeft(60_000), '1 minute');
  assert.equal(spokenTimeLeft(360_000), '6 minutes');
  assert.equal(spokenTimeLeft(3_900_000), '1 hour 5 minutes');
  assert.equal(spokenTimeLeft(7_200_000), '2 hours');
  assert.equal(spokenTimeLeft(7_260_000), '2 hours 1 minute');
});

test('QL18: the announcements say "about N minutes", or "under a minute"', () => {
  assert.equal(aboutTimeLeft(30_000), 'under a minute');
  assert.equal(aboutTimeLeft(360_000), 'about 6 minutes');
  assert.equal(aboutTimeLeft(3_900_000), 'about 1 hour 5 minutes');
  assert.equal(`450 m, ${aboutTimeLeft(360_000)} left to Your spot`, '450 m, about 6 minutes left to Your spot');
});
