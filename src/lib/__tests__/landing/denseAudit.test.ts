/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AreaAnalysis } from '../../landing/analyze';
import { alongAngle, busyNames } from '../../landing/names';
import { LANDING_VERSION, landingKey, landingView, type LandingRow } from '../../landing/view';
import type { LngLat } from '../../types';

// explore-dense-city's audit (decision 0074) and the owner's calls at it: regression tests written before each fix.

const O: LngLat = [-76.615, 39.29];
const m = (x: number, y: number): LngLat => [O[0] + x / 86000, O[1] + y / 111320];
const strip = (name: string, x0: number, y: number, weight: number) => ({ name, lengthM: 200, weight, lines: [[m(x0, y), m(x0 + 200, y)]], peak: m(x0 + 100, y) });
const analysis = (strips: ReturnType<typeof strip>[]): AreaAnalysis => ({
  basis: 'density', reason: 'Busiest area', pockets: [], strips,
  graded: strips.map((s) => ({ name: s.name, grade: 3 as const, lines: s.lines })), landing: null,
});
const row = (centre: LngLat, a: AreaAnalysis, build = 'b1'): LandingRow => ({ key: landingKey(centre), centre, analysis: a, build, rules: LANDING_VERSION, analyzed_at: 1 });

test('explore-dense-city audit 4: two busy stretches of one street within 300 m in one area carry one name; farther apart, one each', () => {
  // 23 Street busy at x 0-200 and again at x 470-670 (peaks 470 m apart, the nearer ends 270 m): one area read both.
  const near = landingView([row(O, analysis([strip('23 Street', 0, 0, 20), strip('23 Street', 270, 0, 12)]))], 'b1');
  assert.equal(busyNames(near).filter((n) => n.name === '23 Street').length, 1);
  const far = landingView([row(O, analysis([strip('23 Street', 0, 0, 20), strip('23 Street', 900, 0, 12)]))], 'b1');
  assert.equal(busyNames(far).filter((n) => n.name === '23 Street').length, 2, 'past 300 m, another stretch of the street');
  // The heavier stretch keeps the name.
  assert.deepEqual(busyNames(near)[0].at, strip('23 Street', 0, 0, 20).peak);
});

test('explore-dense-city audit 12: a zero-length piece never decides a name\'s turn', () => {
  const at = m(0, 150);
  // A north-south street whose first piece is its label point given twice: the zero-length piece comes first.
  assert.equal(alongAngle([[at, at, m(0, 300)]], at), -90);
  assert.equal(alongAngle([[at, at], [m(0, 0), m(0, 300)]], at), -90);
  assert.equal(alongAngle([[at, at]], at), 0, 'nothing but a point: level');
});

test('DC19: where names compete, a current area\'s names come before a stale area\'s, the heavier first within each', () => {
  const stale = row(m(3000, 0), analysis([strip('Old Heavy Street', 3000, 0, 50)]), 'b0');
  const current = row(O, analysis([strip('Light Street', 0, 0, 5), strip('Heavy Street', 0, 100, 30)]));
  const names = busyNames(landingView([stale, current], 'b1'));
  assert.deepEqual(names.map((n) => n.name), ['Heavy Street', 'Light Street', 'Old Heavy Street']);
});
