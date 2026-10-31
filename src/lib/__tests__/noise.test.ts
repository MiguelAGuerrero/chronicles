/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ambientCheck } from '../discovery/ambient';
import { CHAINS, isChain, normalizeBrand } from '../discovery/noise';
import { placeKey } from '../discovery/places';
import { pickMarks } from '../discovery/scan';
import { placesFromTilePois } from '../discovery/tilePois';
import type { CategoryId, Place } from '../discovery/types';
import type { LngLat } from '../types';

// The owner's call (Nov 2): a scan offered a Domino's. Chains and mundane spots aren't discoveries.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const place = (name: string, category: CategoryId, at: LngLat): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1' });

test('noise: chains are known by name in their usual spellings, within their own category', () => {
  for (const name of ["Domino's", "Domino's Pizza", 'Dominos', 'DOMINO’S PIZZA', 'Starbucks', 'Starbucks Coffee', "McDonald's", 'McDonalds', "Dunkin'", 'Dunkin Donuts', 'Chick-fil-A', 'Chick fil A', 'Panera Bread']) {
    assert.equal(isChain(name, 'food'), true, name);
  }
  for (const [name, cat] of [['CVS', 'shops'], ['7-Eleven', 'shops'], ['GameStop', 'shops'], ['AMC Theatres', 'culture'], ['Regal Cinemas', 'culture'], ['Buffalo Wild Wings', 'nightlife']] as [string, CategoryId][]) {
    assert.equal(isChain(name, cat), true, name);
  }
  // Independents, and a chain's name in another category, are kept.
  for (const [name, cat] of [['Coffee Exchange', 'food'], ['Subway Art Supply', 'shops'], ['Sonic Boom Records', 'shops'], ['Targetti Gelato', 'food'], ['Little Caesar Park', 'parks']] as [string, CategoryId][]) {
    assert.equal(isChain(name, cat), false, name);
  }
  assert.equal(normalizeBrand("  Café  Domino’s & Co. "), 'cafe dominos and co');
  assert.ok(CHAINS.food.length >= 40 && CHAINS.shops.length >= 30, 'a reasonable default list');
});

test('noise: food courts are left out of places altogether', () => {
  const got = placesFromTilePois([
    { geometry: { type: 'Point', coordinates: m(10, 10) }, properties: { class: 'fast_food', subclass: 'food_court', name: 'Mall Food Court' } },
    { geometry: { type: 'Point', coordinates: m(20, 10) }, properties: { class: 'fast_food', subclass: 'fast_food', name: 'Tacos El Gordo' } },
  ], 'b1');
  assert.deepEqual(got.map((p) => p.name), ['Tacos El Gordo']);
});

test('noise: a scan leaves chains out by default, and keeps them when asked', () => {
  const cands = [place("Domino's Pizza", 'food', m(200, 0)), place('Coffee Exchange', 'food', m(-200, 0)), place('CVS Pharmacy', 'shops', m(0, 250))];
  for (let seed = 1; seed < 10; seed++) {
    let s = seed;
    const random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const { picked } = pickMarks({ candidates: cands, center: O, offered: [], prefs: {}, random });
    assert.deepEqual(picked.map((p) => p.name), ['Coffee Exchange']);
    const all = pickMarks({ candidates: cands, center: O, offered: [], prefs: {}, random, includeChains: true });
    assert.equal(all.picked.length, 3);
  }
});

test('noise: ambient never hints at a chain', () => {
  const fixes = Array.from({ length: 12 }, (_, i) => {
    const [lon, lat] = m(0, -(11 - i) * 5);
    return { walk_id: 'w1', t: 1e12 + i * 4000, lat, lon, accuracy_m: 5, speed: 1.25, course: null };
  });
  const street = { id: 's', name: 'Hope Street', kind_detail: 'residential', length_m: 400, build: 'b1', geometry: [[m(-200, 100), m(200, 100)]] };
  const base = {
    enabled: true, quiet: false, walkId: 'w-live', startedAt: 1e12 - 1000, pauses: [], fixes, unwalked: [street], offered: [],
    fired: { count: 0, lastAt: null }, now: 1e12 + 60_000, pursuing: false, random: () => 0.1,
  };
  // Find a walk id the 25% draw lets through.
  let walkId = 'w0';
  for (let i = 0; ambientCheck({ ...base, walkId: `w${i}`, places: [place('Coffee Exchange', 'food', m(0, 100))] }) == null; i++) walkId = `w${i + 1}`;
  assert.equal(ambientCheck({ ...base, walkId, places: [place("Domino's", 'food', m(0, 100))] }), null);
  assert.ok(ambientCheck({ ...base, walkId, places: [place("Domino's", 'food', m(0, 100))], includeChains: true }));
});
