/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOTSPOT_GRADES, stripsGeoJSON } from '../../components/map/types';
import { DERIVED_STORES, KEPT_STORES } from '../db/stores';
import type { AreaAnalysis } from '../landing/analyze';
import { LANDING_CODE, LANDING_VERSION, isStale, keyFor, landingKey, landingView, staleNote, type LandingRow } from '../landing/view';
import { distanceM } from '../geo';
import type { LngLat } from '../types';

// v1.5 slice 2 (on the home map), written from criteria L9-L12 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const analysis = (name: string, at: LngLat): AreaAnalysis => ({
  basis: 'density', reason: 'Busiest area',
  pockets: [{ name, weight: 12, spanM: 250, centre: at, hull: [at, at, at], strips: [name] }],
  strips: [{ name, lengthM: 250, weight: 11, lines: [[at, at]], peak: at }],
  graded: [{ name, grade: 3, lines: [[at, at]] }],
  landing: { at, street: name, via: 'strip' },
});
const row = (centre: LngLat, a: AreaAnalysis, build = 'b1', rules = LANDING_VERSION): LandingRow =>
  ({ key: landingKey(centre), centre, analysis: a, build, rules, analyzed_at: 1 });

test('landing: one row per area; the same area again replaces it (L11, L12)', () => {
  const rows = [row(m(0, 0), analysis('Thayer Street', m(0, 100)))];
  assert.equal(keyFor(rows, m(30, 20)), rows[0].key, 'a centre 40 m away is the same area');
  // Two reads that mostly overlap are one area: a press 400 m off, or the press vs. the town (audit 4).
  assert.equal(keyFor(rows, m(400, 0)), rows[0].key);
  assert.notEqual(keyFor(rows, m(2500, 0)), rows[0].key);
  assert.equal(keyFor([], m(0, 0)), landingKey(m(0, 0)));
});

test('landing: rows are kept across builds, marked stale, never silently redone (L11)', () => {
  assert.equal(isStale(row(O, analysis('Thayer Street', O)), 'b1'), false);
  assert.equal(isStale(row(O, analysis('Thayer Street', O)), 'b2'), true);
  assert.equal(isStale(row(O, analysis('Thayer Street', O), 'b1', 'old'), 'b1'), true);
  // A cache, but not one a build change wipes: they show offline until re-analyzed.
  assert.ok(!DERIVED_STORES.includes('landing') && !KEPT_STORES.includes('landing'));
});

test('landing: the view draws pockets and named strips, as information: no Start here pin, no scores (L9, explore)', () => {
  const v = landingView([row(m(0, 0), analysis('Thayer Street', m(0, 100))), row(m(5000, 0), analysis('Wickenden Street', m(5000, 100)))], 'b1');
  assert.equal(v.pockets.length, 2);
  assert.deepEqual(v.strips.map((s) => s.name).sort(), ['Thayer Street', 'Wickenden Street']);
  assert.ok(!('pins' in v), 'Start here pins are retired');
  const text = JSON.stringify(v);
  assert.ok(!/weight|score|rank/.test(text), 'nothing in the view carries a score');
});

test('landing: a street two overlapping areas both found is named once (fix street-label-double)', () => {
  const v = landingView([row(m(0, 0), analysis('North 17th Street', m(0, 100))), row(m(1500, 0), analysis('North 17th Street', m(20, 130)))], 'b1');
  assert.deepEqual(v.strips.map((s) => s.name), ['North 17th Street']);
  const far = landingView([row(m(0, 0), analysis('Main Street', m(0, 100))), row(m(5000, 0), analysis('Main Street', m(5000, 100)))], 'b1');
  assert.equal(far.strips.length, 2, 'the same name in another part of town is a different street');
  const hood = (at: LngLat) => ({ ...analysis('Fox Point', at), pockets: [{ name: 'Fox Point', weight: 5, spanM: 250, centre: at, hull: [at, at, at] as LngLat[], strips: [] }], strips: [] });
  assert.equal(landingView([row(m(0, 0), hood(m(0, 0))), row(m(1500, 0), hood(m(50, 40)))], 'b1').labels.length, 1);
});

test('landing: stale areas are drawn dimmed and say why (audit 5)', () => {
  const fresh = row(m(0, 0), analysis('Thayer Street', m(0, 100)));
  const old = row(m(5000, 0), analysis('Wickenden Street', m(5000, 100)), 'b0');
  const v = landingView([fresh, old], 'b1');
  assert.deepEqual(v.pockets.map((p) => p.stale), [false, true]);
  assert.deepEqual(v.strips.map((s) => s.stale), [false, true]);
  assert.equal(staleNote(old, 'b1'), 'Analyzed before an update: press and hold to look again.');
  assert.equal(staleNote(fresh, 'b1'), null);
});

test('landing: a strip’s name sits clear of the Start here pin; a pocket with no strip is named on the map (audit 7, 9)', () => {
  const a = analysis('Thayer Street', m(0, 100));
  a.strips[0].lines = [[m(0, 0), m(0, 250)]];
  a.landing = { at: m(0, 100), street: 'Thayer Street', via: 'strip' };
  const v = landingView([row(m(0, 0), a)], 'b1');
  assert.ok(distanceM(v.strips[0].at, m(0, 100)) >= 80, 'label away from the pin');
  const hood = analysis('Fox Point', m(0, 100));
  hood.pockets[0].strips = [];
  hood.strips = [];
  assert.deepEqual(landingView([row(m(0, 0), hood)], 'b1').labels.map((l) => l.name), ['Fox Point']);
});

test('landing: the rules version is bumped by hand when the analysis changes (audit 11)', () => {
  assert.ok(LANDING_VERSION.startsWith(`${LANDING_CODE}:`));
});

test('landing: areas analyzed before the street fix are left off the map (fog streaks, Nov 1)', () => {
  // Their strips were drawn from streets whose junctions had collapsed onto one spot.
  const broken = row(m(0, 0), analysis('Thayer Street', m(0, 100)), 'b1', 'l2:{}');
  const older = row(m(5000, 0), analysis('Hope Street', m(5000, 100)), 'b1', 'old');
  const fresh = row(m(9000, 0), analysis('Wickenden Street', m(9000, 100)));
  const v = landingView([broken, older, fresh], 'b1');
  assert.deepEqual(v.strips.map((s) => s.name), ['Wickenden Street']);
  assert.deepEqual(v.pockets.map((p) => p.name), ['Wickenden Street']);
  // A stale row from after the fix (another build) still shows, dimmed.
  assert.equal(landingView([row(O, analysis('Thayer Street', O), 'b0')], 'b1').strips[0].stale, true);
});

test('AD12: graded stretches draw wider and stronger as the grade rises; stale ones dimmed; old areas as medium', () => {
  const at = m(0, 0);
  const a = analysis('Main Street', at);
  a.graded = [
    { name: 'Main Street', grade: 3, lines: [[at, m(0, 50)]] },
    { name: 'Main Street', grade: 1, lines: [[m(0, 50), m(0, 90)]] },
    { name: 'Elm Street', grade: 2, lines: [[m(50, 0), m(90, 0)]] },
  ];
  const row: LandingRow = { key: 'k', centre: at, analysis: a, build: 'b1', rules: LANDING_VERSION, analyzed_at: 0, overture: null };
  const fc = stripsGeoJSON(landingView([row], 'b1'));
  assert.deepEqual(fc.features.map((f) => f.properties!.grade), [1, 2, 3], 'faint first, strong on top');
  const w = fc.features.map((f) => f.properties!.width as number);
  const o = fc.features.map((f) => f.properties!.opacity as number);
  assert.ok(w[0] < w[1] && w[1] < w[2] && o[0] < o[1] && o[1] < o[2]);
  const stale = stripsGeoJSON(landingView([{ ...row, build: 'old' }], 'b1'));
  assert.equal(stale.features[2].properties!.opacity, HOTSPOT_GRADES[3].opacity * HOTSPOT_GRADES.staleOpacity);
  // An area analyzed before grades: its busy streets draw as medium.
  const { graded: _g, ...before } = a;
  const old = landingView([{ ...row, analysis: before as typeof a }], 'b1');
  assert.deepEqual(old.graded.map((g) => g.grade), [2]);
});
