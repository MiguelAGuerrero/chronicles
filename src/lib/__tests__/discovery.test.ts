/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVED_STORES, KEPT_STORES } from '../db/stores';
import { CATEGORIES } from '../discovery/categories';
import { isOffered, placeKey } from '../discovery/places';
import { placesFromTilePois } from '../discovery/tilePois';
import type { LngLat } from '../types';

// Slice 1 of v1 (places data), written from criteria D1-D10 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const poi = (cls: string, subclass: string, name: string | null, p: LngLat) => ({
  geometry: { type: 'Point', coordinates: p },
  properties: { class: cls, subclass, ...(name ? { name } : {}) },
});

test('places: each category’s classes map; worship is history; bus stops, offices and supermarkets are left out (D3)', () => {
  const cases: [string, string, string | null][] = [
    ['art_gallery', 'artwork', 'art'],
    ['cafe', 'cafe', 'food'],
    ['bakery', 'bakery', 'food'],
    ['restaurant', 'restaurant', 'food'],
    ['shop', 'antiques', 'shops'],
    ['library', 'books', 'shops'],
    ['clothing_store', 'clothes', 'shops'],
    ['monument', 'monument', 'history'],
    ['castle', 'ruins', 'history'],
    ['place_of_worship', 'christian', 'history'],
    ['place_of_worship', 'muslim', 'history'],
    ['cemetery', 'grave_yard', 'history'],
    ['park', 'park', 'parks'],
    ['dog_park', 'dog_park', 'parks'],
    ['museum', 'museum', 'culture'],
    ['library', 'library', 'culture'],
    ['art_gallery', 'art_gallery', 'culture'],
    ['theatre', 'theatre', 'culture'],
    ['attraction', 'viewpoint', 'viewpoints'],
    ['zoo', 'zoo', 'viewpoints'],
    ['bar', 'bar', 'nightlife'],
    ['beer', 'pub', 'nightlife'],
    ['bus', 'bus_stop', null],
    ['office', 'company', null],
    ['grocery', 'supermarket', null],
    ['shop', 'convenience', null],
  ];
  for (const [cls, sub, cat] of cases) {
    const got = placesFromTilePois([poi(cls, sub, `A ${sub}`, at(0, 0))], 'b1');
    assert.equal(got[0]?.category ?? null, cat, `${cls} › ${sub}`);
  }
  assert.equal(CATEGORIES.length, 8);
});

test('places: unnamed places are left out, except artworks and viewpoints (D4)', () => {
  const got = placesFromTilePois([
    poi('cafe', 'cafe', null, at(0, 0)),
    poi('art_gallery', 'artwork', null, at(1, 0)),
    poi('attraction', 'viewpoint', null, at(2, 0)),
  ], 'b1');
  assert.deepEqual(got.map((p) => [p.category, p.name]).sort(), [['art', 'Public art'], ['viewpoints', 'A viewpoint']]);
});

test('places: one POI from two tiles is one row; the key ignores case and spaces (D5)', () => {
  const got = placesFromTilePois([
    poi('cafe', 'cafe', 'Coffee Exchange', at(0, 0)),
    poi('cafe', 'cafe', '  coffee exchange ', [at(0, 0)[0] + 0.000001, at(0, 0)[1]]),
  ], 'b1');
  assert.equal(got.length, 1);
  assert.equal(placeKey('food', 'Coffee Exchange', at(0, 0)), placeKey('food', ' coffee EXCHANGE', at(0, 0)));
  assert.equal(got[0].build, 'b1');
});

test('places: a same-named place moved 40 m counts as offered; 60 m away does not (D6)', () => {
  const [p] = placesFromTilePois([poi('cafe', 'cafe', 'Coffee Exchange', at(0, 0))], 'b1');
  const [near] = placesFromTilePois([poi('cafe', 'cafe', 'Coffee Exchange', at(0.4, 0))], 'b1');
  const [far] = placesFromTilePois([poi('cafe', 'cafe', 'Coffee Exchange', at(0.6, 0))], 'b1');
  const [other] = placesFromTilePois([poi('cafe', 'cafe', 'Small Point', at(0, 0))], 'b1');
  assert.equal(isOffered(near, [p]), true);
  assert.equal(isOffered(far, [p]), false);
  assert.equal(isOffered(other, [p]), false, 'another name at the same spot');
  assert.equal(isOffered(p, [p]), true);
});

test('places: a purge drops places with the streets and keeps Offered and marks (D7, D8)', () => {
  assert.ok(DERIVED_STORES.includes('place'));
  assert.ok(DERIVED_STORES.includes('street_segment'));
  for (const kept of ['offered', 'mark', 'recall']) {
    assert.ok(KEPT_STORES.includes(kept), `${kept} is kept`);
    assert.ok(!DERIVED_STORES.includes(kept));
  }
});

test('places: a read that is not complete caches nothing (D2)', () => {
  assert.deepEqual(placesFromTilePois([poi('cafe', 'cafe', 'Coffee Exchange', at(0, 0))], 'b1', { complete: false }), []);
});

test('places: 16k features derive in well under a second (D9)', () => {
  const classes = [['cafe', 'cafe'], ['shop', 'gift'], ['bus', 'bus_stop'], ['park', 'park'], ['bar', 'bar']];
  const many = Array.from({ length: 16_000 }, (_, i) => {
    const [c, s] = classes[i % classes.length];
    return poi(c, s, `Place ${i % 3000}`, at((i % 130) / 3, Math.floor(i / 130) / 3));
  });
  const t0 = performance.now();
  const got = placesFromTilePois(many, 'b1');
  const ms = performance.now() - t0;
  assert.ok(got.length > 1000);
  assert.ok(ms < 300, `${Math.round(ms)} ms`);
});
