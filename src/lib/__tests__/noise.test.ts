/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAINS, isChain, isMarkable, normalizeBrand } from '../discovery/noise';
import { placeKey } from '../discovery/places';
import { buildChecklists } from '../explore/explore';
import { placesFromTilePois } from '../discovery/tilePois';
import type { CategoryId, Place } from '../discovery/types';
import type { LngLat } from '../types';

// The owner's call (Nov 2): a scan offered a Domino's. Chains and mundane spots aren't discoveries.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const place = (name: string, category: CategoryId, at: LngLat): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1', markable: true });

test('noise: chains are known by name in their usual spellings, within their own category', () => {
  for (const name of ["Domino's", "Domino's Pizza", 'Dominos', 'DOMINO’S PIZZA', 'Starbucks', 'Starbucks Coffee', "McDonald's", 'McDonalds', "Dunkin'", 'Dunkin Donuts', 'Chick-fil-A', 'Chick fil A', 'Panera Bread']) {
    assert.equal(isChain(name, 'food'), true, name);
  }
  for (const [name, cat] of [['CVS', 'shops'], ['7-Eleven', 'shops'], ['GameStop', 'shops'], ['Buffalo Wild Wings', 'nightlife']] as [string, CategoryId][]) {
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

const poi = (cls: string, subclass: string, name: string, x = 10) => ({ geometry: { type: 'Point' as const, coordinates: m(x, 10) }, properties: { class: cls, subclass, name } });
const markable = (f: ReturnType<typeof poi>) => placesFromTilePois([f], 'b1').filter(isMarkable).length === 1;

test('noise: only attractions become marks; food, shops and nightlife never do (S18)', () => {
  for (const f of [
    poi('art_gallery', 'artwork', 'Hope'), poi('art_gallery', 'gallery', 'RISD Gallery'), poi('museum', 'museum', 'Fox Point Museum'),
    poi('theatre', 'theatre', 'Trinity Rep'), poi('monument', 'memorial', 'Hessian Memorial'), poi('castle', 'ruins', 'Fort Ruins'),
    poi('attraction', 'viewpoint', 'Prospect Terrace'), poi('attraction', 'attraction', 'WaterFire'), poi('zoo', 'zoo', 'Roger Williams Zoo'),
    poi('park', 'park', 'Gano Park'), poi('garden', 'garden', 'Japanese Garden'),
  ]) assert.equal(markable(f), true, f.properties.name);
  for (const f of [
    poi('cafe', 'cafe', 'Coffee Exchange'), poi('restaurant', 'restaurant', 'Al Forno'), poi('bakery', 'bakery', 'Sunny Bakery'),
    poi('shop', 'gift', 'Thayer Gifts'), poi('bar', 'bar', 'The Wild Colonial'), poi('beer', 'pub', 'Trinity Brewhouse'),
  ]) {
    assert.equal(markable(f), false, f.properties.name);
    // Still places: they count toward busy streets.
    assert.equal(placesFromTilePois([f], 'b1').length, 1, f.properties.name);
  }
});

test('noise: cinemas, dog parks, picnic sites, art shops and chains are never marks (S19)', () => {
  for (const f of [
    poi('cinema', 'cinema', 'Avon Cinema'), poi('dog_park', 'dog_park', 'Gano Dog Park'), poi('picnic_site', 'picnic_site', 'Picnic Grove'),
    poi('art_gallery', 'art', 'Jerry’s Artarama'), poi('cinema', 'cinema', 'AMC Theatres'),
  ]) assert.equal(markable(f), false, f.properties.name);
});

test('noise: worship, civic sites, cemeteries and libraries only when the name says historic (S20)', () => {
  for (const f of [
    poi('place_of_worship', 'place_of_worship', 'Old North Church'), poi('place_of_worship', 'place_of_worship', 'Cathedral of St. John'),
    poi('place_of_worship', 'place_of_worship', 'First Unitarian Meeting House'), poi('cemetery', 'grave_yard', 'North Burial Ground'),
    poi('town_hall', 'townhall', 'Old State House'), poi('library', 'library', 'Providence Athenaeum'), poi('place_of_worship', 'place_of_worship', 'Mission San Juan Capistrano'),
  ]) assert.equal(markable(f), true, f.properties.name);
  for (const f of [
    poi('place_of_worship', 'place_of_worship', 'St. Mary’s Church'), poi('place_of_worship', 'place_of_worship', 'Grace Baptist Church'),
    poi('town_hall', 'courthouse', 'District Court'), poi('cemetery', 'cemetery', 'Swan Point Cemetery'), poi('library', 'library', 'Rochambeau Library'),
    // "Old" as a whole word only.
    poi('place_of_worship', 'place_of_worship', 'Oldham Chapel'),
  ]) assert.equal(markable(f), false, f.properties.name);
});

test('noise: a checklist holds attractions only, never food, shops or a chain (S18, E2)', () => {
  const k = (p: Place): Place => ({ ...p, kind: 'parks' });
  const cands = [place("Domino's Pizza", 'food', m(200, 0)), place('Coffee Exchange', 'food', m(-200, 0)), place('Thayer Gifts', 'shops', m(0, 250)), k(place('Gano Park', 'parks', m(0, -250)))];
  const r = buildChecklists({ places: cands, candidates: [{ level: 'neighborhood', name: 'H', at: O, reachM: 1000 }], centre: O, build: 'b1', now: 1 });
  assert.deepEqual(r.items.map((p) => p.name), ['Gano Park']);
});
