/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AreaAnalysis } from '../../landing/analyze';
import { alongAngle, busyNames } from '../../landing/names';
import { LANDING_VERSION, landingKey, landingView, type LandingRow } from '../../landing/view';
import type { LngLat } from '../../types';

// Explore in a dense city (DC1, DC3), written from specs/explore-dense-city/spec.md before the code.

const O: LngLat = [-76.615, 39.29];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
// A street cut into 60 m blocks, as OSM ways and the tile pieces are.
const blocks = (y: number, from: number, to: number): LngLat[][] => {
  const out: LngLat[][] = [];
  for (let x = from; x < to; x += 60) out.push([m(x, y), m(x + 60, y)]);
  return out;
};
const strip = (name: string, y: number, weight: number) => ({ name, lengthM: 600, weight, lines: blocks(y, 0, 600), peak: m(300, y) });
const analysis = (strips: ReturnType<typeof strip>[], pockets: AreaAnalysis['pockets'] = []): AreaAnalysis => ({
  basis: 'density', reason: 'Busiest area', pockets, strips,
  graded: strips.map((s) => ({ name: s.name, grade: 3 as const, lines: s.lines })),
  landing: null,
});
const row = (centre: LngLat, a: AreaAnalysis): LandingRow => ({ key: landingKey(centre), centre, analysis: a, build: 'b1', rules: LANDING_VERSION, analyzed_at: 1 });

test('DC1: a name per strip and per pocket without a strip, heavier first', () => {
  // The lighter street listed first: the view puts the heavier first (DC4).
  const a = analysis([strip('Lexington Street', 120, 12), strip('Charles Street', 0, 30)], [
    { name: 'Mount Vernon', weight: 9, spanM: 300, centre: m(300, 400), hull: [m(200, 350), m(400, 350), m(300, 450)], strips: [] },
    { name: 'Charles Street', weight: 20, spanM: 300, centre: m(300, 0), hull: [m(200, -50), m(400, -50), m(300, 50)], strips: ['Charles Street'] },
  ]);
  const names = busyNames(landingView([row(O, a)], 'b1'));
  assert.deepEqual(names.map((n) => n.name).sort(), ['Charles Street', 'Lexington Street', 'Mount Vernon']);
  const order = (n: string) => names.find((x) => x.name === n)?.order ?? -1;
  assert.ok(order('Charles Street') < order('Lexington Street'), 'the heavier street is placed first (DC4)');
  assert.equal(names.find((n) => n.name === 'Charles Street')?.angle, 0, 'an east-west street\'s name runs level, along it');
  assert.deepEqual(names.find((n) => n.name === 'Mount Vernon')?.at, m(300, 400), 'a pocket is named at its centre');
  assert.deepEqual(busyNames(null), []);
});

test('DC3: one label per strip, never one per block, turned along its street', () => {
  const names = busyNames(landingView([row(O, analysis([strip('Charles Street', 0, 30)]))], 'b1'));
  assert.equal(names.length, 1, 'ten blocks, one name');
  // North-south runs a quarter turn; a piece given backwards reads the same way; never upside down.
  const ns = [[m(0, 0), m(0, 300)]];
  assert.equal(Math.abs(alongAngle(ns, m(0, 150))), 90);
  assert.equal(alongAngle([[m(300, 0), m(0, 0)]], m(150, 0)), 0);
  const diag = alongAngle([[m(0, 0), m(200, 200)]], m(100, 100));
  assert.ok(Math.abs(diag + 45) < 0.5, `a street rising to the north-east turns 45 degrees anticlockwise (${diag})`);
  assert.equal(alongAngle([[m(200, 200), m(0, 0)]], m(100, 100)), diag, 'given backwards, the same');
  // The nearest piece decides: a bend reads along the piece where the name sits.
  assert.equal(Math.abs(alongAngle([[m(0, 0), m(300, 0)], [m(300, 0), m(300, 300)]], m(300, 250))), 90);
});

test('DC3: two areas reading one street name it once (fix street-label-double holds)', () => {
  const a = row(O, analysis([strip('Charles Street', 0, 30)]));
  const b = row(m(900, 0), analysis([strip('Charles Street', 0, 25)]));
  const names = busyNames(landingView([a, b], 'b1'));
  assert.equal(names.filter((n) => n.name === 'Charles Street').length, 1);
});
