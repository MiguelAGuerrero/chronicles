/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlaceCandidate } from '../areas/types';
import { placeKey } from '../discovery/places';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import type { CategoryId, Place } from '../discovery/types';
import { boundsOf, distanceM, distanceToLinesM } from '../geo';
import { tileAt, tilesIn } from '../tileMath';
import { analyzeArea, centreFor, LANDING_RULES, MAIN_STREET_NAMES } from '../landing/analyze';
import type { LngLat, StreetSegment } from '../types';

// v1.5 slice 1 (the analysis), written from criteria L1 and L3-L8 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** A point x metres east and y metres north of O. */
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const place = (name: string, category: CategoryId, at: LngLat): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1' });
let segN = 0;
/** A street as 100 m pieces from (x0, y0) to (x1, y1). */
function street(name: string | null, from: [number, number], to: [number, number], cls = 'minor'): StreetSegment[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / 100));
  return Array.from({ length: n }, (_, i) => {
    const a = m(from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n);
    const b = m(from[0] + ((to[0] - from[0]) * (i + 1)) / n, from[1] + ((to[1] - from[1]) * (i + 1)) / n);
    return { id: `s${segN++}`, name, kind_detail: cls, length_m: len / n, build: 'b1', geometry: [[a, b]] };
  });
}
/** A 100 m street grid over ±600 m: avenues north-south, streets east-west, residential names. */
function grid(): StreetSegment[] {
  const out: StreetSegment[] = [];
  for (let x = -600; x <= 600; x += 100) out.push(...street(x === 0 ? 'Thayer Street' : `Avenue ${x}`, [x, -600], [x, 600]));
  for (let y = -600; y <= 600; y += 100) out.push(...street(y === -400 ? 'Arnold Street' : `Street ${y}`, [-600, y], [600, y]));
  return out;
}
/** Places along Thayer Street (x = 0), 15 m off it, every `step` metres from y0 to y1. */
const alongThayer = (y0: number, y1: number, step = 25, cat: CategoryId = 'food') =>
  Array.from({ length: Math.floor((y1 - y0) / step) + 1 }, (_, i) => place(`Thayer ${y0 + i * step}`, cat, m(i % 2 ? 15 : -15, y0 + i * step)));
const run = (o: Partial<Parameters<typeof analyzeArea>[0]>) =>
  analyzeArea({ centre: O, places: [], segments: grid(), towns: [], transit: [], ...o });
const onNamedStreet = (at: LngLat, segs: StreetSegment[]) =>
  Math.min(...segs.filter((s) => s.name).map((s) => distanceToLinesM(at, s.geometry))) < 1;

test('landing: the rules live in LANDING_RULES; the main-street list is data (L3)', () => {
  assert.equal(LANDING_RULES.radiusM, 1500);
  assert.equal(LANDING_RULES.cellM, 50);
  assert.equal(LANDING_RULES.kernelM, 100);
  assert.equal(LANDING_RULES.frontageM, 30);
  assert.equal(LANDING_RULES.perPlaceM, 40);
  assert.equal(LANDING_RULES.minRunM, 200);
  assert.equal(LANDING_RULES.maxGapM, 80);
  assert.equal(LANDING_RULES.minStripPlaces, 5);
  assert.equal(LANDING_RULES.minPocketWeight, 8);
  assert.equal(LANDING_RULES.minSpanM, 200);
  assert.deepEqual(LANDING_RULES.weights, { food: 1, shops: 1, nightlife: 1, culture: 1, history: 0.5, art: 0.5, viewpoints: 0.5, parks: 0.25 });
  assert.ok(MAIN_STREET_NAMES.includes('Main') && MAIN_STREET_NAMES.includes('Broad') && MAIN_STREET_NAMES.includes('Market'));
});

test('landing: centres on the nearest town or city within the read, else the pressed spot (L1, audit)', () => {
  const towns: PlaceCandidate[] = [
    { level: 'town', name: 'Providence', at: m(1200, 0), reachM: 10_000 },
    { level: 'neighborhood', name: 'Fox Point', at: m(100, 0), reachM: 1000 },
  ];
  assert.deepEqual(centreFor(O, towns), m(1200, 0));
  // Further than the read's radius, the pressed spot would fall outside what is read: it stays the centre.
  assert.deepEqual(centreFor(O, [{ ...towns[0], at: m(2000, 0) }]), O);
  // The nearest of a town and a city, by distance (audit).
  const both: PlaceCandidate[] = [
    { level: 'town', name: 'Pawtucket', at: m(600, 0), reachM: 3000, kind: 'town' },
    { level: 'town', name: 'Providence', at: m(1300, 0), reachM: 10_000, kind: 'city' },
  ];
  assert.deepEqual(centreFor(O, both), m(600, 0));
});

test('landing: only places a scan recognizes count; a bodega isn’t one (L4)', () => {
  const pois = [
    { geometry: { type: 'Point', coordinates: m(15, 0) }, properties: { class: 'shop', subclass: 'convenience', name: 'Corner Bodega' } },
    { geometry: { type: 'Point', coordinates: m(15, 20) }, properties: { class: 'grocery', subclass: 'supermarket', name: 'Stop & Shop' } },
  ];
  assert.deepEqual(placesFromTilePois(pois, 'b1'), []);
});

test('landing: two and a half blocks of shops is a strip, named by its street (L5)', () => {
  const r = run({ places: alongThayer(0, 250) });
  assert.equal(r.basis, 'density');
  assert.deepEqual(r.strips.map((s) => s.name), ['Thayer Street']);
  assert.ok(r.strips[0].lengthM >= 200);
});

test('landing: a lone café, a corner bodega and a three-shop corner are not strips (L5)', () => {
  const corner = [place('A', 'food', m(15, -385)), place('B', 'shops', m(-15, -390)), place('C', 'food', m(20, -410))];
  const r = run({ places: [place('Lone Cafe', 'food', m(315, 200)), ...corner] });
  assert.deepEqual(r.strips, []);
  assert.deepEqual(r.pockets, []);
});

test('landing: a gap longer than a block breaks a run (L5)', () => {
  // 150 m of shops, a 125 m gap, 150 m more: two short runs, no strip.
  const r = run({ places: [...alongThayer(0, 150), ...alongThayer(275, 425)] });
  assert.deepEqual(r.strips, []);
});

test('landing: many strips and pockets, no cap; a pocket with no strip takes its neighbourhood (L4, L5)', () => {
  // Thayer's strip, a second strip on Avenue 500, and a square of places off any street near Fox Point.
  const avenue = Array.from({ length: 11 }, (_, i) => place(`Ave ${i}`, 'shops', m(500 + (i % 2 ? 12 : -12), -300 + i * 25)));
  const square: Place[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) square.push(place(`Sq ${i},${j}`, 'culture', m(-450 + i * 65, 250 + j * 65)));
  const towns: PlaceCandidate[] = [{ level: 'neighborhood', name: 'Fox Point', at: m(-350, 350), reachM: 1000 }];
  const r = run({ places: [...alongThayer(0, 250), ...avenue, ...square], towns });
  assert.deepEqual(r.strips.map((s) => s.name).sort(), ['Avenue 500', 'Thayer Street']);
  assert.equal(r.pockets.length, 3);
  assert.deepEqual(r.pockets.map((p) => p.name).sort(), ['Avenue 500', 'Fox Point', 'Thayer Street']);
  for (const p of r.pockets) assert.ok(p.spanM >= 200 && p.weight >= 8);
  // A pocket names its strips; their lines are stored once, in the strips (audit 10).
  assert.ok(r.pockets.every((p) => p.strips.every((s) => typeof s === 'string')));
  // Heaviest first.
  for (let i = 1; i < r.pockets.length; i++) assert.ok(r.pockets[i - 1].weight >= r.pockets[i].weight);
});

test('landing: a pocket with neither strip nor neighbourhood is "A busy pocket" (L4)', () => {
  const square: Place[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) square.push(place(`Sq ${i},${j}`, 'culture', m(-450 + i * 65, 250 + j * 65)));
  assert.deepEqual(run({ places: square }).pockets.map((p) => p.name), ['A busy pocket']);
});

test('landing: the landing point is on a named street; a station by the pocket comes first (L7)', () => {
  const segs = grid();
  const r = run({ places: alongThayer(0, 250), segments: segs });
  assert.ok(onNamedStreet(r.landing!.at, segs));
  assert.equal(r.landing!.street, 'Thayer Street');
  assert.ok(distanceM(r.landing!.at, m(0, 125)) < 130, 'at the strip');
  const station = m(110, 130);
  const t = run({ places: alongThayer(0, 250), segments: segs, transit: [station] });
  assert.equal(t.landing!.via, 'transit');
  assert.ok(onNamedStreet(t.landing!.at, segs));
  // On the pocket's own street, level with the station (audit 5).
  assert.equal(t.landing!.street, 'Thayer Street');
  assert.ok(distanceM(t.landing!.at, m(0, 130)) < 15, 'level with the station');
  // A station far from every pocket doesn't pull the landing.
  assert.notEqual(run({ places: alongThayer(0, 250), segments: segs, transit: [m(600, -600)] }).landing!.via, 'transit');
});

test('landing: with nothing dense, the fallbacks run in order and say which (L6)', () => {
  // (a) the crossing of the two highest-class named streets nearest the centre.
  const roads = [
    ...street('Broad Street', [-600, 300], [600, 300], 'primary'),
    ...street('Market Street', [300, -600], [300, 600], 'secondary'),
    ...street('Elm Street', [-600, -100], [600, -100]),
  ];
  const a = run({ segments: roads });
  assert.equal(a.basis, 'main-roads');
  assert.equal(a.reason, 'Main roads: Broad Street & Market Street');
  assert.ok(distanceM(a.landing!.at, m(300, 300)) < 15);
  // (b) a street on the main-street list.
  const b = run({ segments: [...street('Main Street', [-600, 200], [600, 200]), ...street('Elm Street', [-600, -100], [600, -100])] });
  assert.equal(b.basis, 'main-street');
  assert.equal(b.reason, 'A main street: Main Street');
  assert.equal(b.landing!.street, 'Main Street');
  // (c) the town centre, on its nearest named street.
  const c = run({ segments: street('Elm Street', [-600, -100], [600, -100]) });
  assert.equal(c.basis, 'centre');
  assert.equal(c.reason, 'Town centre');
  assert.equal(c.landing!.street, 'Elm Street');
  assert.ok(distanceM(c.landing!.at, m(0, -100)) < 5);
  // Density wins over names: a strip on Avenue 300 beats a Main Street with nothing on it.
  const shops = Array.from({ length: 11 }, (_, i) => place(`S${i}`, 'shops', m(300 + (i % 2 ? 12 : -12), i * 25)));
  const d = run({ places: shops, segments: [...grid(), ...street('Main Street', [-600, 150], [600, 150])] });
  assert.equal(d.basis, 'density');
  assert.deepEqual(d.strips.map((s) => s.name), ['Avenue 300']);
});

test('landing: transit points come from the tiles adapter (L7)', () => {
  const got = transitFromTilePois([
    { geometry: { type: 'Point', coordinates: m(0, 0) }, properties: { class: 'railway', subclass: 'station', name: 'Providence' } },
    { geometry: { type: 'Point', coordinates: m(50, 0) }, properties: { class: 'bus', subclass: 'bus_station', name: 'Kennedy Plaza' } },
    { geometry: { type: 'Point', coordinates: m(80, 0) }, properties: { class: 'bus', subclass: 'bus_stop', name: 'Hope at Wickenden' } },
  ]);
  assert.equal(got.length, 2);
});

test('landing: a dense downtown analyzes in well under a second (L8)', () => {
  const segs: StreetSegment[] = [];
  for (let x = -1500; x <= 1500; x += 80) segs.push(...street(`Ave ${x}`, [x, -1500], [x, 1500]));
  for (let y = -1500; y <= 1500; y += 80) segs.push(...street(`St ${y}`, [-1500, y], [1500, y]));
  const cats: CategoryId[] = ['food', 'shops', 'nightlife', 'culture', 'art', 'parks'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const places = Array.from({ length: 5000 }, (_, i) => place(`P${i}`, cats[i % cats.length], m((rnd() - 0.5) * 1200, (rnd() - 0.5) * 1200)));
  const t0 = performance.now();
  const r = analyzeArea({ centre: O, places, segments: segs, towns: [], transit: [] });
  const ms = performance.now() - t0;
  assert.ok(r.pockets.length >= 1);
  assert.ok(ms < 1000, `${Math.round(ms)} ms`);
});

test('landing: a 1.5 km read is at most 16 z14 tiles, all covering the circle (L2)', () => {
  const b = boundsOf([O], LANDING_RULES.radiusM)!;
  const tiles = tilesIn(b);
  assert.ok(tiles.length > 0 && tiles.length <= 16, `${tiles.length}`);
  for (const corner of [m(-1500, -1500), m(1500, 1500), O]) {
    const t = tileAt(corner);
    assert.ok(tiles.some(([x, y]) => x === t.x && y === t.y));
  }
});

// Audit regressions (v1.5 slice 1).

test('landing: a street that bends, loops or repeats its name keeps its strips (audit 1)', () => {
  // A U-shaped street: two arms 120 m apart, joined at the bottom, shops all along.
  const u = [...street('Loop Road', [-60, 300], [-60, 0]), ...street('Loop Road', [-60, 0], [60, 0]), ...street('Loop Road', [60, 0], [60, 300])];
  const uShops = [
    ...Array.from({ length: 12 }, (_, i) => place(`L${i}`, 'food', m(-75, 300 - i * 25))),
    ...Array.from({ length: 12 }, (_, i) => place(`R${i}`, 'shops', m(75, 25 + i * 25))),
  ];
  const ru = analyzeArea({ centre: O, places: uShops, segments: u, towns: [], transit: [] });
  assert.ok(ru.strips.some((s) => s.name === 'Loop Road' && s.lengthM >= 250), JSON.stringify(ru.strips.map((s) => [s.name, s.lengthM])));
  // A ring road 150 m across with a shop every 26 m.
  const ring: StreetSegment[] = [];
  const pts: [number, number][] = Array.from({ length: 19 }, (_, i) => [75 * Math.cos((2 * Math.PI * i) / 18), 75 * Math.sin((2 * Math.PI * i) / 18)]);
  for (let i = 1; i < pts.length; i++) ring.push(...street('Circle Drive', pts[i - 1], pts[i]));
  const ringShops = Array.from({ length: 18 }, (_, i) => place(`C${i}`, 'shops', m(88 * Math.cos((2 * Math.PI * i) / 18), 88 * Math.sin((2 * Math.PI * i) / 18))));
  assert.ok(analyzeArea({ centre: O, places: ringShops, segments: ring, towns: [], transit: [] }).strips.some((s) => s.name === 'Circle Drive'));
  // Two Broadways 300 m apart, both lined: two strips.
  const two = [...street('Broadway', [0, -200], [0, 200]), ...street('Broadway', [300, -200], [300, 200])];
  const twoShops = [0, 300].flatMap((x) => Array.from({ length: 17 }, (_, i) => place(`B${x},${i}`, 'shops', m(x + 15, -200 + i * 25))));
  assert.equal(analyzeArea({ centre: O, places: twoShops, segments: two, towns: [], transit: [] }).strips.filter((s) => s.name === 'Broadway').length, 2);
});

test('landing: a strip without a pocket is still the place to start (audit 2)', () => {
  // Seven shops over 250 m: a strip, too light for a pocket.
  const shops = Array.from({ length: 7 }, (_, i) => place(`S${i}`, 'shops', m(15, (i * 250) / 6)));
  const roads = [...grid(), ...street('Broad Street', [-600, 550], [600, 550], 'primary'), ...street('Market Street', [550, -600], [550, 600], 'secondary')];
  const r = run({ places: shops, segments: roads });
  assert.equal(r.basis, 'density');
  assert.deepEqual(r.strips.map((s) => s.name), ['Thayer Street']);
  assert.equal(r.landing!.street, 'Thayer Street');
});

test('landing: two clusters with a gap are not one pocket (audit 3)', () => {
  const cluster = (x: number, y: number, tag: string) =>
    Array.from({ length: 9 }, (_, i) => place(`${tag}${i}`, 'food', m(x + (i % 3) * 20, y + Math.floor(i / 3) * 20)));
  const r = run({ places: [...cluster(-320, 160, 'a'), ...cluster(-160, 300, 'b')], segments: [] });
  assert.ok(r.pockets.every((p) => p.spanM < 200 || p.weight < 8 || false), 'no pocket spans the gap');
  assert.equal(r.pockets.length, 0);
});

test('landing: a station lands on the pocket’s own street; the densest-cell landing stays close (audit 5, 6)', () => {
  const segs = [...grid(), ...street('Rail Yard Road', [160, -600], [160, 600])];
  const r = run({ places: alongThayer(0, 250), segments: segs, transit: [m(150, 125)] });
  assert.equal(r.landing!.via, 'transit');
  assert.equal(r.landing!.street, 'Thayer Street');
  // A pocket on unnamed paths, its nearest named street 700 m off: land in the pocket, unnamed.
  const square: Place[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) square.push(place(`Sq ${i},${j}`, 'culture', m(i * 60, j * 60)));
  const far = analyzeArea({ centre: O, places: square, segments: street('Far Street', [-600, 800], [600, 800]), towns: [], transit: [] });
  assert.equal(far.landing!.street, null);
  assert.ok(distanceM(far.landing!.at, m(90, 90)) < 150);
});

test('landing: main roads try every pair by rank, crossing mid-piece, near the centre (audit 7)', () => {
  const long = (name: string, a: [number, number], b: [number, number], cls: string): StreetSegment =>
    ({ id: name, name, kind_detail: cls, length_m: 1000, build: 'b1', geometry: [[m(...a), m(...b)]] });
  const roads = [
    long('North Primary', [-600, 50], [600, 50], 'primary'),
    long('South Primary', [-600, -50], [600, -50], 'primary'),
    long('Cross Avenue', [200, -600], [200, 600], 'secondary'),
  ];
  const r = analyzeArea({ centre: O, places: [], segments: roads, towns: [], transit: [] });
  assert.equal(r.basis, 'main-roads');
  assert.ok(distanceM(r.landing!.at, m(200, 50)) < 5 || distanceM(r.landing!.at, m(200, -50)) < 5, JSON.stringify(r.landing));
});

test('landing: main-street names in their usual forms (audit 8)', () => {
  for (const name of ['Main St.', 'North Main Street', 'High Street East', 'Market Square', 'Main St NW', 'Hauptstraße']) {
    const r = analyzeArea({ centre: O, places: [], segments: street(name, [-600, 100], [600, 100]), towns: [], transit: [] });
    assert.equal(r.basis, 'main-street', name);
  }
  assert.equal(analyzeArea({ centre: O, places: [], segments: street('Mainland Road', [-600, 100], [600, 100]), towns: [], transit: [] }).basis, 'centre');
});

test('landing: tiles wrap at the antimeridian, and a read with no tiles fails (audit 10)', () => {
  const tiles = tilesIn([179.99, 0, -179.99 + 360, 0.01]);
  assert.ok(tiles.every(([x]) => x >= 0 && x < 2 ** 14));
  assert.ok(tilesIn([0, 89.99, 0.01, 90]).length >= 1);
});

test('landing: a village is never the centre (audit 11)', () => {
  const towns: PlaceCandidate[] = [
    { level: 'town', name: 'Little Village', at: m(500, 0), reachM: 3000, kind: 'village' },
    { level: 'town', name: 'Providence', at: m(1300, 0), reachM: 10_000, kind: 'city' },
  ];
  assert.deepEqual(centreFor(O, towns), m(1300, 0));
  assert.deepEqual(centreFor(O, [towns[0]]), O);
});

test('landing: a heavy downtown with 15,000 street pieces stays well under budget (audit 9)', () => {
  const segs: StreetSegment[] = [];
  for (let x = -1500; x <= 1500; x += 40) segs.push(...street(`Ave ${x}`, [x, -1500], [x, 1500]));
  for (let y = -1500; y <= 1500; y += 40) segs.push(...street(`St ${y}`, [-1500, y], [1500, y]));
  let seed = 3;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const places = Array.from({ length: 5000 }, (_, i) => place(`P${i}`, 'food', m((rnd() - 0.5) * 800, (rnd() - 0.5) * 800)));
  const transit = Array.from({ length: 200 }, () => m((rnd() - 0.5) * 800, (rnd() - 0.5) * 800));
  // Warmed once, so the timing is the analysis, not the first compile; the suite runs files in parallel.
  analyzeArea({ centre: O, places: places.slice(0, 500), segments: segs, towns: [], transit });
  const t0 = performance.now();
  analyzeArea({ centre: O, places, segments: segs, towns: [], transit });
  const ms = performance.now() - t0;
  assert.ok(ms < 500, `${Math.round(ms)} ms (a phone is several times slower)`);
});
