/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { bandAt, cellsFor, type PlacePoint } from '../../walk/cells';
import { FORM, judge, type CellBand, type Signals } from '../../walk/form';
import type { WayFacts } from '../../walk/types';

// Urban form, the rule (UF4-UF7), written from specs/walkability-urban-form/spec.md before the code. The real cases run on Overture's
// own tiles (release 2026-10-21.0), cut by scripts/fixture-walkability.mjs.

const require = createRequire(import.meta.url);
type Fx = { release: string; places: Record<string, { name: string; at: LngLat; tiles: Record<string, { ways: WayFacts[]; junctions: LngLat[] }> }> };
const FX = require('./walkFixtures.json') as Fx;
export const maps = (key: string) => {
  const p = FX.places[key];
  const ways = new Map<string, WayFacts[]>();
  const junctions = new Map<string, LngLat[]>();
  for (const [k, t] of Object.entries(p.tiles)) {
    ways.set(k, t.ways);
    junctions.set(k, t.junctions);
  }
  return { ways, junctions, at: p.at };
};

const base: Signals = { streetM: 5000, junctionsPerKm2: 60, arterialShare: 0.2, crosswalksPerKm2: 0, sidewalkRatio: 0, placesPerKm2: null };
const rank: Record<CellBand, number> = { empty: -1, car: 0, neither: 1, foot: 2 };

test('UF4: the rule: dense and not arterial is foot; middling with crossings or sidewalks is foot; sparse with no evidence is car', () => {
  const { junctionHigh: hi, junctionMid: mid } = FORM;
  assert.equal(judge({ ...base, junctionsPerKm2: hi }), 'foot', 'dense');
  assert.equal(judge({ ...base, junctionsPerKm2: mid, crosswalksPerKm2: 20 }), 'foot', 'middling with crosswalks');
  assert.equal(judge({ ...base, junctionsPerKm2: mid, sidewalkRatio: 0.4 }), 'foot', 'middling with sidewalks');
  assert.equal(judge({ ...base, junctionsPerKm2: mid }), 'neither', 'middling with nothing mapped');
  assert.equal(judge({ ...base, junctionsPerKm2: mid - 1 }), 'car', 'sparse, nothing mapped');
  assert.equal(judge({ ...base, junctionsPerKm2: mid - 1, sidewalkRatio: 0.5 }), 'neither', 'sparse but sidewalks mapped is not car');
  assert.equal(judge({ ...base, junctionsPerKm2: hi + 20, arterialShare: 0.7 }), 'car', 'mostly arterial road, nothing mapped for walking');
  assert.equal(judge({ ...base, junctionsPerKm2: hi + 20, arterialShare: 0.55 }), 'neither', 'between: not foot, not car');
  assert.equal(judge({ ...base, junctionsPerKm2: hi + 20, arterialShare: 0.7, crosswalksPerKm2: 40, sidewalkRatio: 0.9 }), 'foot', 'a downtown whose main streets are arterial, with crossings and sidewalks mapped');
  assert.equal(judge({ ...base, junctionsPerKm2: hi + 20, arterialShare: 0.9, crosswalksPerKm2: 40 }), 'car', 'but nearly all arterial is still car');
});

test('UF5: evidence only raises a reading; its absence never lowers one', () => {
  for (const d of [5, 15, 29, 30, 35, 44, 45, 60, 150])
    for (const share of [0, 0.3, 0.5, 0.55, 0.6, 0.65, 0.8, 0.9])
      for (const [cw, sw] of [[0, 0], [20, 0], [0, 0.4], [30, 1]] as [number, number][]) {
        const without = judge({ ...base, junctionsPerKm2: d, arterialShare: share });
        const withEv = judge({ ...base, junctionsPerKm2: d, arterialShare: share, crosswalksPerKm2: cw, sidewalkRatio: sw });
        assert.ok(rank[withEv] >= rank[without], `d${d} share${share} cw${cw} sw${sw}: ${without} -> ${withEv}`);
      }
});

test('UF6: places lift the middle to foot, never a car cell, never when none were read', () => {
  const middle = { ...base, junctionsPerKm2: FORM.junctionMid };
  assert.equal(judge(middle), 'neither');
  assert.equal(judge({ ...middle, placesPerKm2: FORM.placesPerKm2 }), 'foot');
  assert.equal(judge({ ...middle, placesPerKm2: FORM.placesPerKm2 - 1 }), 'neither');
  assert.equal(judge({ ...base, junctionsPerKm2: 10, placesPerKm2: 5000 }), 'car', 'a car cell is never lifted');
  assert.equal(judge({ ...base, junctionsPerKm2: 80, arterialShare: 0.7, placesPerKm2: 5000 }), 'car');
  assert.equal(judge({ ...middle, placesPerKm2: null }), 'neither', 'no places read: judged on form alone');
});

test('UF7: too little street to say is empty, whatever else is true', () => {
  assert.equal(judge({ ...base, streetM: FORM.minStreetM - 1, junctionsPerKm2: 200 }), 'empty');
  assert.equal(judge({ ...base, streetM: 0, junctionsPerKm2: 0 }), 'empty');
  assert.notEqual(judge({ ...base, streetM: FORM.minStreetM }), 'empty');
});

const place = (key: string) => {
  const m = maps(key);
  return bandAt(cellsFor(m.ways, m.junctions), m.at);
};

test('UF4: real places: downtown Allentown and the residential grid with its sidewalks unmapped read foot', () => {
  assert.equal(place('allentownDowntown'), 'foot', 'Hamilton Street at 7th');
  assert.equal(place('allentownGrid'), 'foot', '19th and Liberty: dense grid, sidewalks mostly unmapped');
});

test('UF4: real places: the mall and a cul-de-sac suburb read car', () => {
  assert.equal(place('lvMall'), 'car', 'Lehigh Valley Mall');
  assert.equal(place('suburb'), 'car', 'Upper Macungie');
});

test('UF4: real places: Zurich\'s old town reads foot', () => {
  assert.equal(place('zurich'), 'foot');
});

test('UF18: judging the cells of a dense downtown takes well under a second', () => {
  const m = maps('allentownDowntown');
  const t0 = performance.now();
  const cells = cellsFor(m.ways, m.junctions);
  const ms = performance.now() - t0;
  assert.ok(cells.length > 100, 'a real window of cells');
  assert.ok(ms < 1000, `${Math.round(ms)} ms`);
});

test('UF6 (real): places never make the mall or the suburb anything but car', () => {
  const dense: PlacePoint[] = Array.from({ length: 400 }, (_, i) => ({ at: [FX.places.lvMall.at[0] + (i % 20) * 0.0002, FX.places.lvMall.at[1] + Math.floor(i / 20) * 0.0002] as LngLat, weight: 1 }));
  const m = maps('lvMall');
  assert.equal(bandAt(cellsFor(m.ways, m.junctions, dense), m.at), 'car');
});

void FX;
