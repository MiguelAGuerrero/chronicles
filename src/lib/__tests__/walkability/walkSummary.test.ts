/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { cellsFor } from '../../walk/cells';
import { cellWords, countCells } from '../../walk/summary';
import type { Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';
import type { WayFacts } from '../../walk/types';

// Urban form, the area card's line (UF13, UF14, UF12), written from specs/walkability-urban-form/spec.md before the code.

const mk = (foot: number, car: number, neither = 0, empty = 0): Cell[] => {
  const out: Cell[] = [];
  let i = 0;
  const push = (n: number, band: CellBand) => { for (let k = 0; k < n; k++) out.push({ i: i++, j: 0, west: 0, south: 0, east: 0, north: 0, band }); };
  push(foot, 'foot'); push(car, 'car'); push(neither, 'neither'); push(empty, 'empty');
  return out;
};

test('UF13: the words say what the ground is, never how much or what it will be like: close together, far apart, both, or nothing', () => {
  assert.equal(cellWords(countCells(mk(60, 10, 30))), 'Streets close together, with crossings', 'foot is 60% of the cells that are not empty');
  assert.equal(cellWords(countCells(mk(10, 60, 30))), 'Streets far apart and busy');
  assert.equal(cellWords(countCells(mk(40, 30, 30))), 'Streets close together and far apart, side by side');
  assert.equal(cellWords(countCells(mk(20, 20, 60))), null, 'neither dominates: nothing');
  assert.equal(cellWords(countCells(mk(59, 25, 16))), 'Streets close together and far apart, side by side', 'just under 60% foot, car at 25%');
  assert.equal(cellWords(countCells(mk(59, 11, 30))), null, 'just under 60% foot and under 25% car: nothing');
  assert.equal(cellWords(countCells(mk(0, 0, 0, 40))), null, 'mostly empty: nothing');
  assert.equal(cellWords(countCells([])), null);
  // Empty cells are left out of the shares.
  assert.equal(cellWords(countCells(mk(6, 1, 3, 500))), 'Streets close together, with crossings');
});

test('WK12, UF12, UF13: no number, count, percentage or comparison in any line', () => {
  for (const c of [mk(60, 10, 30), mk(10, 60, 30), mk(40, 30, 30)]) assert.ok(!/\d|%|most walkable|more walkable|less walkable|best|worst|rank/i.test(cellWords(countCells(c))!));
});

const require = createRequire(import.meta.url);
type Fx = { places: Record<string, { at: LngLat; tiles: Record<string, { ways: WayFacts[]; junctions: LngLat[] }> }> };
const FX = require('./walkFixtures.json') as Fx;
const wordsAround = (key: string, ringM: number) => {
  const p = FX.places[key];
  const ways = new Map(Object.entries(p.tiles).map(([k, t]) => [k, t.ways]));
  const junctions = new Map(Object.entries(p.tiles).map(([k, t]) => [k, t.junctions]));
  return cellWords(countCells(cellsFor(ways, junctions), p.at, ringM));
};

test('WK11, UF14: the card for downtown Allentown says its streets are close together; the mall\'s and the suburb\'s do not', () => {
  assert.equal(wordsAround('allentownDowntown', 250), 'Streets close together, with crossings');
  assert.equal(wordsAround('allentownGrid', 250), 'Streets close together, with crossings');
  assert.notEqual(wordsAround('lvMall', 250), 'Streets close together, with crossings');
  assert.equal(wordsAround('suburb', 250), 'Streets far apart and busy');
});
