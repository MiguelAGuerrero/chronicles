/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeForm, wordIn } from '../../walk/placeForm';
import { learnTerritories, WORD_IDS } from '../../walk/placeFormLearn';
import { TERRITORIES } from '../../walk/placeFormTerritories';
import { inTerritory } from '../../walk/placeFormTerritory';
import { measureRings, type Measures } from '../../walk/placeSignals';
import { acceptable, loadSet, readOf } from './placeFormFixtures';

// The territories and the stability gate (specs/place-form PF28, PF29), written from the spec.

const calibration = loadSet('Calibration')!;
const rows = calibration.places.map((p) => ({ p, m: measureRings(readOf(p))[0] })).filter((r): r is { p: typeof r.p; m: Measures } => r.m !== null);
const labelled = rows.map((r) => ({ id: r.p.id, word: r.p.word, accept: r.p.accept, m: r.m }));

test('PF28: the committed territories are exactly what the learning procedure makes of the calibration places, and it is deterministic', () => {
  const learned = learnTerritories(labelled);
  assert.deepEqual(learned, TERRITORIES);
  assert.deepEqual(learnTerritories(labelled), learned);
});

test('PF28: no place the owner confirmed as something else, or as no word, lies inside a territory', () => {
  for (const w of WORD_IDS) {
    const t = TERRITORIES[w];
    assert.ok(t, `${w} has a territory`);
    for (const r of rows) if (!acceptable(r.p).includes(w)) assert.ok(!inTerritory(t!, r.m), `${r.p.id} (${r.p.word}) is inside the ${w} territory`);
  }
});

test('PF28: a side is open where more, or less, does not change the word', () => {
  assert.equal(TERRITORIES.grid!.junctionsPerKm2.hi, null, 'a denser grid is still a grid');
  assert.equal(TERRITORIES.grid!.placesPerKm2.hi, null);
  assert.equal(TERRITORIES.exit!.highwayShare.hi, null, 'more highway is still an exit');
  assert.equal(TERRITORIES.village!.junctionsPerKm2.lo, null, 'fewer crossings is still a village');
  assert.ok(TERRITORIES.village!.buildingsPerKm2.lo !== null, 'but a village has some buildings');
});

const base: Measures = { streetM: 5000, junctionsPerKm2: 0, placesPerKm2: 0, buildingsPerKm2: 0, highwayShare: 0, chainShare: 0, chainSpanM: 0, busyStreetM: 0, frontageShare: 0 };
const grid: Measures = { ...base, junctionsPerKm2: 90, placesPerKm2: 300, buildingsPerKm2: 1000, busyStreetM: 2000, frontageShare: 0.95 };
const village: Measures = { ...base, junctionsPerKm2: 15, placesPerKm2: 15, buildingsPerKm2: 200, frontageShare: 0.8 };
const nothing: Measures = { ...base };

test('PF29: a word needs the same word from the centre and at least four of the five rings', () => {
  assert.equal(wordIn(grid), 'grid');
  assert.equal(wordIn(village), 'village');
  assert.equal(wordIn(nothing), null);
  assert.equal(placeForm([grid, grid, grid, grid, grid]), 'grid');
  assert.equal(placeForm([grid, grid, grid, grid, nothing]), 'grid', 'four of five');
  assert.equal(placeForm([grid, grid, grid, village, village]), null, 'three of five is silence');
  assert.equal(placeForm([grid, grid, grid, nothing, null]), null, 'a ring not measured does not agree');
  assert.equal(placeForm([nothing, grid, grid, grid, grid]), null, 'the centre must itself read the word');
  assert.equal(placeForm([null, grid, grid, grid, grid]), null);
});

test('PF29: a ring inside two territories has no word', () => {
  const pick = (a: Measures, b: Measures) => a;
  void pick;
  // The point of overlap, where the two boxes meet: each measure at the larger of the lower bounds, or the smaller of the upper ones when there is none.
  const g = TERRITORIES.grid!;
  const m = TERRITORIES.mainStreet!;
  const point = {} as Record<string, number>;
  let overlaps = true;
  for (const f of Object.keys(g) as (keyof typeof g)[]) {
    const lo = Math.max(g[f].lo ?? -Infinity, m[f].lo ?? -Infinity);
    const hi = Math.min(g[f].hi ?? Infinity, m[f].hi ?? Infinity);
    if (lo > hi) overlaps = false;
    point[f] = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : Number.isFinite(lo) ? lo : Number.isFinite(hi) ? hi : 0;
  }
  if (!overlaps) return; // the territories do not meet: nothing to claim a place twice
  const both = { ...base, ...point } as Measures;
  assert.ok(inTerritory(g, both) && inTerritory(m, both), 'a point in both');
  assert.equal(wordIn(both), null);
});
