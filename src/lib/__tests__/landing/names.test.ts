/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AreaAnalysis } from '../../landing/analyze';
import { busyNames, chainLines } from '../../landing/names';
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

test('DC1: a name per strip and per pocket without a strip, with its weight', { todo: 'test first' }, () => {
  const a = analysis([strip('Charles Street', 0, 30), strip('Lexington Street', 120, 12)], [
    { name: 'Mount Vernon', weight: 9, spanM: 300, centre: m(300, 400), hull: [m(200, 350), m(400, 350), m(300, 450)], strips: [] },
    { name: 'Charles Street', weight: 20, spanM: 300, centre: m(300, 0), hull: [m(200, -50), m(400, -50), m(300, 50)], strips: ['Charles Street'] },
  ]);
  const names = busyNames(landingView([row(O, a)], 'b1'));
  assert.deepEqual(names.map((n) => n.name).sort(), ['Charles Street', 'Lexington Street', 'Mount Vernon']);
  assert.equal(names.find((n) => n.name === 'Charles Street')?.weight, 30);
  assert.ok(names.find((n) => n.name === 'Charles Street')?.line, 'a strip is named along its street');
  assert.ok(names.find((n) => n.name === 'Mount Vernon')?.at, 'a pocket is named at its centre');
  assert.deepEqual(busyNames(null), []);
});

test('DC3: one label per strip, its block pieces chained into one line', { todo: 'test first' }, () => {
  const chained = chainLines(blocks(0, 0, 600));
  assert.equal(chained.length, 1, 'ten blocks meeting end to end are one line');
  assert.equal(chained[0].length, 11);
  // A piece given backwards, and one 300 m away, stay apart from the run they don't touch.
  const apart = chainLines([[m(0, 0), m(60, 0)], [m(120, 0), m(60, 0)], [m(500, 0), m(560, 0)]]);
  assert.deepEqual(apart.map((l) => l.length).sort(), [2, 3]);
  const names = busyNames(landingView([row(O, analysis([strip('Charles Street', 0, 30)]))], 'b1'));
  assert.equal(names.length, 1, 'never one name per block');
  assert.equal(names[0].line?.length, 11);
});

test('DC3: two areas reading one street name it once (fix street-label-double holds)', { todo: 'test first' }, () => {
  const a = row(O, analysis([strip('Charles Street', 0, 30)]));
  const b = row(m(900, 0), analysis([strip('Charles Street', 0, 25)]));
  const names = busyNames(landingView([a, b], 'b1'));
  assert.equal(names.filter((n) => n.name === 'Charles Street').length, 1);
});
