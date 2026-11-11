/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVED_STORES, KEPT_STORES } from '../../db/stores';
import { CATEGORIES } from '../../discovery/categories';
import { isOffered, placeKey } from '../../discovery/places';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { LngLat } from '../../types';

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

// Audit regressions (slice 1).

test('places: parent tiles below z14 are not cached (audit 1, D2)', () => {
  const f = { ...poi('cafe', 'cafe', 'Coffee Exchange', at(0, 0)), zoom: 13 };
  assert.deepEqual(placesFromTilePois([f], 'b1'), []);
  assert.equal(placesFromTilePois([{ ...f, zoom: 14 }], 'b1').length, 1);
});

test('places: only unnamed artworks and viewpoints are kept, not unnamed zoos or attractions (audit 2, D4)', () => {
  const got = placesFromTilePois([
    poi('attraction', 'attraction', null, at(0, 0)),
    poi('zoo', 'zoo', null, at(1, 0)),
    poi('attraction', 'viewpoint', null, at(2, 0)),
  ], 'b1');
  assert.deepEqual(got.map((p) => p.name), ['A viewpoint']);
});

test('places: names fold the same whatever their Unicode form (audit 5, D5)', () => {
  const composed = 'Café Zoë';
  const decomposed = 'Café Zoë';
  assert.equal(placeKey('food', composed, at(0, 0)), placeKey('food', decomposed, at(0, 0)));
});

test('places: a MultiPoint POI is kept at its first point (audit 6)', () => {
  const f = { geometry: { type: 'MultiPoint', coordinates: [at(0, 0), at(0.1, 0)] }, properties: { class: 'cafe', subclass: 'cafe', name: 'Twin' } };
  const [p] = placesFromTilePois([f], 'b1');
  assert.deepEqual(p.at, at(0, 0));
});

test('AG5: every markable class is in a findable kind and off the never list', async () => {
  const { MARKABLE_CLASSES } = await import('../../discovery/tilePois');
  const { MARK_CATEGORIES } = await import('../../discovery/noise');
  const never = new Set(['cinema', 'dog_park', 'picnic_site']);
  for (const m of MARKABLE_CLASSES) {
    assert.ok(MARK_CATEGORIES.includes(m.category), `${m.cls}/${m.sub}: ${m.category} is not findable`);
    assert.ok(!never.has(m.cls), `${m.cls} is never a mark`);
  }
  const byName = MARKABLE_CLASSES.filter((m) => m.byName).map((m) => m.cls);
  for (const c of ['place_of_worship', 'town_hall', 'cemetery']) assert.ok(byName.includes(c), `${c} is a mark only by a notable name`);
  // A new markable class is a deliberate change to the definition (specs/atlas-grading, "What a mark is").
  assert.deepEqual(
    [...new Set(MARKABLE_CLASSES.map((m) => `${m.cls}:${m.category}${m.byName ? ' (by name)' : ''}`))].sort(),
    [
      // specs/presence PR5 (decision 0140): arts and community centres, memorials, nature reserves and viewpoints by their own class.
      'aquarium:viewpoints', 'art_gallery:art', 'art_gallery:culture', 'arts_centre:culture', 'attraction:viewpoints', 'castle:history',
      'cemetery:history (by name)', 'community_centre:culture (by name)', 'garden:parks', 'library:culture (by name)',
      'memorial:history (by name)', 'monument:history', 'museum:culture', 'nature_reserve:parks (by name)',
      'park:parks', 'park:parks (by name)', 'place_of_worship:history (by name)', 'theatre:culture', 'theme_park:viewpoints', 'town_hall:culture (by name)',
      'town_hall:history (by name)', 'viewpoint:viewpoints', 'zoo:viewpoints',
    ],
  ); // re-pinned by PK14: the community centre, a place of Culture by a notable name only
  // The list says what the adapter does: a plain church is no mark, a named old one is.
  const church = (name: string) => placesFromTilePois([poi('place_of_worship', 'christian', name, O) as never], 'b')[0];
  assert.equal(church('St. Mary Church').markable, false);
  assert.equal(church('Old Stone Church').markable, true);
});

// Town presence (TP11), written from specs/town-presence/spec.md before the code.
test('TP11: a shopping mall and a department store are Shops, one place each, and never marks; supermarkets stay out', async () => {
  const { categoryOfPoi, MARKABLE_CLASSES } = await import('../../discovery/tilePois');
  assert.equal(categoryOfPoi('shop', 'mall'), 'shops');
  assert.equal(categoryOfPoi('shop', 'department_store'), 'shops');
  assert.equal(categoryOfPoi('department_store', 'department_store'), 'shops');
  assert.equal(categoryOfPoi('grocery', 'supermarket'), null, 'supermarkets are left out by the v1 choice');
  assert.equal(categoryOfPoi('grocery', 'deli'), 'food', 'a deli is still food');
  assert.equal(categoryOfPoi('shop', 'gift'), 'shops', 'the boutique shops still count');
  for (const m of MARKABLE_CLASSES) assert.notEqual(m.category, 'shops', 'a shop is never a mark');
  const feat = (cls: string, subclass: string, name: string, at: LngLat) => ({ geometry: { type: 'Point' as const, coordinates: at }, properties: { class: cls, subclass, name } });
  const places = placesFromTilePois([feat('shop', 'mall', 'Lehigh Valley Mall', [-75.48, 40.6308]), feat('department_store', 'department_store', 'Macy’s', [-75.49, 40.64])], 'b1');
  assert.deepEqual(places.map((p) => [p.category, p.markable]).sort(), [['shops', false], ['shops', false]]);
});
