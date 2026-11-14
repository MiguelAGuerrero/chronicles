/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// After dark (DK5, DK6), written from specs/after-dark/spec.md before the code.

interface SunTimes {
  rise: number | null;
  set: number | null;
  polar: 'day' | 'night' | null;
}
interface Reading {
  /** The time the hours are judged at; null when there is no dark tonight. */
  at: number | null;
  words: string;
}
interface Api {
  sunTimes(at: LngLat, t: number): SunTimes;
  isDark(at: LngLat, t: number): boolean;
  readingAt(at: LngLat, t: number): Reading;
}
const api = async () => (await import('../../dark/sun' as string)) as Api;

const MIN = 60_000;
const near = (got: number | null, want: string, label: string) => {
  assert.ok(got !== null, `${label}: no time`);
  const d = Math.abs(got - Date.parse(want)) / MIN;
  assert.ok(d <= 5, `${label}: ${new Date(got).toISOString()} is ${d.toFixed(1)} min from ${want}`);
};

const PHILADELPHIA: LngLat = [-75.165, 39.953];
const EQUATOR: LngLat = [0, 0];
const OSLO: LngLat = [10.75, 59.91];
const TROMSO: LngLat = [18.96, 69.65];

test('DK6: sunrise and sunset within five minutes of the tables (the equator, Philadelphia in June and December, 60° N); polar day and night', { todo: 'test first' }, async () => {
  const { sunTimes } = await api();
  // Published tables (US Naval Observatory, timeanddate.com), in UTC.
  const eq = sunTimes(EQUATOR, Date.parse('2026-03-20T12:00:00Z'));
  near(eq.rise, '2026-03-20T06:04:00Z', 'equator rise');
  near(eq.set, '2026-03-20T18:11:00Z', 'equator set');
  const june = sunTimes(PHILADELPHIA, Date.parse('2026-06-21T16:00:00Z'));
  near(june.rise, '2026-06-21T09:32:00Z', 'Philadelphia June rise');
  near(june.set, '2026-06-22T00:33:00Z', 'Philadelphia June set');
  const dec = sunTimes(PHILADELPHIA, Date.parse('2026-12-21T17:00:00Z'));
  near(dec.rise, '2026-12-21T12:19:00Z', 'Philadelphia December rise');
  near(dec.set, '2026-12-21T21:38:00Z', 'Philadelphia December set');
  const oslo = sunTimes(OSLO, Date.parse('2026-06-21T12:00:00Z'));
  near(oslo.rise, '2026-06-21T01:54:00Z', '60° N rise');
  near(oslo.set, '2026-06-21T20:44:00Z', '60° N set');
  const polarDay = sunTimes(TROMSO, Date.parse('2026-06-21T12:00:00Z'));
  assert.equal(polarDay.polar, 'day');
  assert.equal(polarDay.set, null);
  const polarNight = sunTimes(TROMSO, Date.parse('2026-12-21T12:00:00Z'));
  assert.equal(polarNight.polar, 'night');
  assert.equal(polarNight.rise, null);
});

test('DK5: after dark the reading is now; in daylight an hour after tonight\'s sunset, with its words; no dark tonight in polar day', { todo: 'test first' }, async () => {
  const { readingAt, isDark } = await api();
  const night = Date.parse('2026-12-21T23:30:00Z'); // 6:30 pm in Philadelphia, after sunset
  assert.equal(isDark(PHILADELPHIA, night), true);
  assert.deepEqual(readingAt(PHILADELPHIA, night), { at: night, words: 'Open now' });
  const noon = Date.parse('2026-12-21T17:00:00Z');
  assert.equal(isDark(PHILADELPHIA, noon), false);
  const day = readingAt(PHILADELPHIA, noon);
  assert.equal(day.words, 'Open after sunset');
  near(day.at, '2026-12-21T22:38:00Z', 'an hour after sunset');
  // Before dawn is dark too.
  assert.equal(isDark(PHILADELPHIA, Date.parse('2026-12-21T10:00:00Z')), true);
  // Polar day: no dark tonight, nothing judged; polar night: every hour is dark.
  assert.deepEqual(readingAt(TROMSO, Date.parse('2026-06-21T12:00:00Z')), { at: null, words: 'No dark tonight' });
  assert.equal(isDark(TROMSO, Date.parse('2026-12-21T12:00:00Z')), true);
});
