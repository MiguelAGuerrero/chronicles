/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { measureRing, measureRings, type RingRead } from '../../walk/placeSignals';
import type { WayFacts } from '../../walk/types';
import { moved, ringTiles } from './placeFormFixtures';

// The measures (specs/place-form PF4, PF8, PF17), written from the spec before the code, each on a small made-up ground whose answer is known.

const AT: LngLat = [-76.3, 40.5];
const at = (dx: number, dy: number) => moved(AT, dx, dy);
const street = (id: string, cls: string, dx: number, dy: number, lenM: number, sub?: string): WayFacts => ({ id, cls, ...(sub ? { sub } : {}), level: 0, line: [at(dx, dy), at(dx + lenM, dy)] });
const READ: RingRead = {
  at: AT,
  radiusM: 800,
  tilesRead: ringTiles(AT),
  ways: [street('a', 'residential', -500, 0, 1000)],
  junctions: [],
  places: [],
  buildings: [],
};
const AREA_KM2 = Math.PI * 0.8 * 0.8;
const near = (got: number, want: number, tol = 0.01) => assert.ok(Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), `${got} vs ${want}`);

test('PF4: places per km² counts the places inside the ring and none outside it', () => {
  const inside = Array.from({ length: 20 }, (_, i) => ({ at: at(-300 + i * 20, 100), weight: 1 }));
  const outside = Array.from({ length: 5 }, (_, i) => ({ at: at(1500 + i * 20, 0), weight: 1 }));
  near(measureRing({ ...READ, places: [...inside, ...outside] })!.placesPerKm2, 20 / AREA_KM2);
});

test('PF4: street junctions per km² counts the junctions inside the ring', () => {
  const j = Array.from({ length: 12 }, (_, i) => at(-400 + i * 60, 0));
  near(measureRing({ ...READ, junctions: [...j, at(2000, 0)] })!.junctionsPerKm2, 12 / AREA_KM2);
});

test('PF4: buildings per km² counts the building centroids inside the ring', () => {
  const b = Array.from({ length: 30 }, (_, i) => at(-450 + i * 30, 60));
  near(measureRing({ ...READ, buildings: [...b, at(0, 3000)] })!.buildingsPerKm2, 30 / AREA_KM2);
});

test('PF4: the highway share is motorway and trunk over all street length, links with their road', () => {
  const m = measureRing({ ...READ, ways: [street('m', 'motorway', -500, 100, 1000), street('l', 'motorway', -500, 120, 200, 'link'), street('r', 'residential', -500, -100, 1200)] })!;
  near(m.highwayShare, 1200 / 2400);
  near(measureRing({ ...READ, ways: [street('t', 'trunk', -500, 0, 1000), street('p', 'primary', -500, 50, 1000)] })!.highwayShare, 0.5);
});

test('PF4: service ways, footways and paths are not streets and change no share', () => {
  const base = measureRing(READ)!;
  const more = measureRing({ ...READ, ways: [...READ.ways, street('s', 'service', -500, 30, 500, 'alley'), street('f', 'footway', -500, 40, 500, 'sidewalk'), street('p', 'path', -500, 60, 500)] })!;
  near(more.streetM, base.streetM);
  near(more.highwayShare, base.highwayShare, 0);
});

test('PF4: the largest chain of places, each within 80 m of the next, as a share and a span', () => {
  const chain = Array.from({ length: 5 }, (_, i) => ({ at: at(-300 + i * 70, 0), weight: 1 }));
  const loose = [{ at: at(-300, 500), weight: 1 }, { at: at(300, -500), weight: 1 }, { at: at(0, -600), weight: 1 }];
  const m = measureRing({ ...READ, places: [...chain, ...loose] })!;
  near(m.chainShare, 5 / 8);
  near(m.chainSpanM, 280, 0.02);
  assert.equal(measureRing({ ...READ, places: [] })!.chainShare, 0, 'no places, no chain');
});

test('PF4: the measures survive dropping the service ways (the ring is judged on streets alone)', () => {
  const withService = measureRing({ ...READ, ways: [...READ.ways, street('s', 'service', -500, 30, 800, 'parking_aisle')] })!;
  assert.deepEqual(withService, measureRing(READ));
});

test('PF8: a tile of the ring that was not read is null, never a guess', () => {
  assert.equal(measureRing({ ...READ, tilesRead: READ.tilesRead.slice(1) }), null);
});

test('PF8: under 300 m of street inside the ring is null', () => {
  assert.equal(measureRing({ ...READ, ways: [street('a', 'residential', -100, 0, 250)] }), null);
  assert.ok(measureRing({ ...READ, ways: [street('a', 'residential', -200, 0, 350)] }));
});

test('PF17: places not read (null) or buildings not read (null) is null, whatever the streets', () => {
  assert.equal(measureRing({ ...READ, places: null }), null);
  assert.equal(measureRing({ ...READ, buildings: null }), null);
  assert.ok(measureRing({ ...READ, places: [], buildings: [] }), 'a read that found none is a read');
});

// A named street of 800 m with a run of places along it: what the Explore tab draws as a busy street (PF25, PF26).
const MAIN: WayFacts = { id: 'main', cls: 'residential', name: 'Main Street', level: 0, line: [at(-400, 0), at(400, 0)] };
const run = (n: number, dy: number, weight = 1) => Array.from({ length: n }, (_, i) => ({ at: at(-345 + i * 30, dy), weight }));

test('PF25: busy-street length is the length of the strips the landing analysis finds, and only on a named street with places along it', () => {
  const busy = measureRing({ ...READ, ways: [MAIN], places: run(24, 15) })!.busyStreetM;
  assert.ok(busy >= 300 && busy <= 800, `a run of places along Main Street: ${busy} m`);
  assert.equal(measureRing({ ...READ, ways: [{ ...MAIN, name: undefined }], places: run(24, 15) })!.busyStreetM, 0, 'an unnamed street carries no run');
  assert.equal(measureRing({ ...READ, ways: [MAIN], places: run(24, 300) })!.busyStreetM, 0, 'places 300 m off the street are not on it');
  assert.equal(measureRing({ ...READ, ways: [MAIN], places: [] })!.busyStreetM, 0, 'no places, no busy street');
});

test('PF26: frontage is the share, by weight, of the ring\'s places within 40 m of a named street', () => {
  const half = measureRing({ ...READ, ways: [MAIN], places: [...run(10, 15), ...run(10, 250)] })!.frontageShare;
  near(half, 0.5);
  near(measureRing({ ...READ, ways: [MAIN], places: run(10, 15) })!.frontageShare, 1);
  near(measureRing({ ...READ, ways: [MAIN], places: [...run(5, 15, 2), ...run(5, 250, 1)] })!.frontageShare, 10 / 15);
  assert.equal(measureRing({ ...READ, ways: [{ ...MAIN, name: undefined }], places: run(10, 15) })!.frontageShare, 0, 'an unnamed street is no frontage');
  assert.equal(measureRing({ ...READ, ways: [MAIN], places: [] })!.frontageShare, 0, 'no places, no frontage');
  assert.equal(measureRing({ ...READ, ways: [MAIN], places: [{ at: at(-300, 41), weight: 1 }] })!.frontageShare, 0, '41 m is not within 40');
});

test('PF27: a ring is read from its centre and from 150 m north, east, south and west, the centre first', () => {
  const rings = measureRings({ ...READ, junctions: [at(0, 780)] });
  assert.equal(rings.length, 5);
  assert.deepEqual(rings[0], measureRing({ ...READ, junctions: [at(0, 780)] }));
  assert.ok(rings[3]!.junctionsPerKm2 < rings[0]!.junctionsPerKm2, 'the south ring no longer reaches a junction 780 m north');
  assert.ok(rings[1]!.junctionsPerKm2 >= rings[0]!.junctionsPerKm2, 'the north ring is nearer it');
});
