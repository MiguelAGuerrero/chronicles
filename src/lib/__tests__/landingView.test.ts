/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVED_STORES, KEPT_STORES } from '../db/stores';
import type { AreaAnalysis } from '../landing/analyze';
import { LANDING_VERSION, isStale, keyFor, landingKey, landingView, type LandingRow } from '../landing/view';
import type { LngLat } from '../types';

// v1.5 slice 2 (on the home map), written from criteria L9-L12 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const analysis = (name: string, at: LngLat): AreaAnalysis => ({
  basis: 'density', reason: 'Busiest area',
  pockets: [{ name, weight: 12, spanM: 250, centre: at, hull: [at, at, at], strips: [{ name, lengthM: 250, weight: 11, lines: [[at, at]], peak: at }] }],
  strips: [{ name, lengthM: 250, weight: 11, lines: [[at, at]], peak: at }],
  landing: { at, street: name, via: 'strip' },
});
const row = (centre: LngLat, a: AreaAnalysis, build = 'b1', rules = LANDING_VERSION): LandingRow =>
  ({ key: landingKey(centre), centre, analysis: a, build, rules, analyzed_at: 1 });

test('landing: one row per area; the same area again replaces it (L11, L12)', () => {
  const rows = [row(m(0, 0), analysis('Thayer Street', m(0, 100)))];
  assert.equal(keyFor(rows, m(30, 20)), rows[0].key, 'a centre 40 m away is the same area');
  assert.notEqual(keyFor(rows, m(400, 0)), rows[0].key);
  assert.equal(keyFor([], m(0, 0)), landingKey(m(0, 0)));
});

test('landing: rows are kept across builds, marked stale, never silently redone (L11)', () => {
  assert.equal(isStale(row(O, analysis('Thayer Street', O)), 'b1'), false);
  assert.equal(isStale(row(O, analysis('Thayer Street', O)), 'b2'), true);
  assert.equal(isStale(row(O, analysis('Thayer Street', O), 'b1', 'old'), 'b1'), true);
  // A cache, but not one a build change wipes: they show offline until re-analyzed.
  assert.ok(!DERIVED_STORES.includes('landing') && !KEPT_STORES.includes('landing'));
});

test('landing: the view draws pockets, named strips and one Start here per area; no scores (L9)', () => {
  const v = landingView([row(m(0, 0), analysis('Thayer Street', m(0, 100))), row(m(5000, 0), analysis('Wickenden Street', m(5000, 100)))]);
  assert.equal(v.pockets.length, 2);
  assert.deepEqual(v.strips.map((s) => s.name).sort(), ['Thayer Street', 'Wickenden Street']);
  assert.equal(v.pins.length, 2);
  assert.ok(v.pins.every((p) => p.label === 'Start here'));
  const text = JSON.stringify(v);
  assert.ok(!/weight|score|rank/.test(text), 'nothing in the view carries a score');
});
