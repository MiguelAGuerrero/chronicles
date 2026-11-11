/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { measureRing, type RingRead } from '../../walk/placeSignals';
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

test('PF4: places per km² counts the places inside the ring and none outside it', { todo: 'test first' }, () => {
  const inside = Array.from({ length: 20 }, (_, i) => ({ at: at(-300 + i * 20, 100), weight: 1 }));
  const outside = Array.from({ length: 5 }, (_, i) => ({ at: at(1500 + i * 20, 0), weight: 1 }));
  near(measureRing({ ...READ, places: [...inside, ...outside] })!.placesPerKm2, 20 / AREA_KM2);
});

test('PF4: street junctions per km² counts the junctions inside the ring', { todo: 'test first' }, () => {
  const j = Array.from({ length: 12 }, (_, i) => at(-400 + i * 60, 0));
  near(measureRing({ ...READ, junctions: [...j, at(2000, 0)] })!.junctionsPerKm2, 12 / AREA_KM2);
});

test('PF4: buildings per km² counts the building centroids inside the ring', { todo: 'test first' }, () => {
  const b = Array.from({ length: 30 }, (_, i) => at(-450 + i * 30, 60));
  near(measureRing({ ...READ, buildings: [...b, at(0, 3000)] })!.buildingsPerKm2, 30 / AREA_KM2);
});

test('PF4: the highway share is motorway and trunk over all street length, links with their road', { todo: 'test first' }, () => {
  const m = measureRing({ ...READ, ways: [street('m', 'motorway', -500, 100, 1000), street('l', 'motorway', -500, 120, 200, 'link'), street('r', 'residential', -500, -100, 1200)] })!;
  near(m.highwayShare, 1200 / 2400);
  near(measureRing({ ...READ, ways: [street('t', 'trunk', -500, 0, 1000), street('p', 'primary', -500, 50, 1000)] })!.highwayShare, 0.5);
});

test('PF4: service ways, footways and paths are not streets and change no share', { todo: 'test first' }, () => {
  const base = measureRing(READ)!;
  const more = measureRing({ ...READ, ways: [...READ.ways, street('s', 'service', -500, 30, 500, 'alley'), street('f', 'footway', -500, 40, 500, 'sidewalk'), street('p', 'path', -500, 60, 500)] })!;
  near(more.streetM, base.streetM);
  near(more.highwayShare, base.highwayShare, 0);
});

test('PF4: the largest chain of places, each within 80 m of the next, as a share and a span', { todo: 'test first' }, () => {
  const chain = Array.from({ length: 5 }, (_, i) => ({ at: at(-300 + i * 70, 0), weight: 1 }));
  const loose = [{ at: at(-300, 500), weight: 1 }, { at: at(300, -500), weight: 1 }, { at: at(0, -600), weight: 1 }];
  const m = measureRing({ ...READ, places: [...chain, ...loose] })!;
  near(m.chainShare, 5 / 8);
  near(m.chainSpanM, 280, 0.02);
  assert.equal(measureRing({ ...READ, places: [] })!.chainShare, 0, 'no places, no chain');
});

test('PF4: the measures survive dropping the service ways (the ring is judged on streets alone)', { todo: 'test first' }, () => {
  const withService = measureRing({ ...READ, ways: [...READ.ways, street('s', 'service', -500, 30, 800, 'parking_aisle')] })!;
  assert.deepEqual(withService, measureRing(READ));
});

test('PF8: a tile of the ring that was not read is null, never a guess', { todo: 'test first' }, () => {
  assert.equal(measureRing({ ...READ, tilesRead: READ.tilesRead.slice(1) }), null);
});

test('PF8: under 300 m of street inside the ring is null', { todo: 'test first' }, () => {
  assert.equal(measureRing({ ...READ, ways: [street('a', 'residential', -100, 0, 250)] }), null);
  assert.ok(measureRing({ ...READ, ways: [street('a', 'residential', -200, 0, 350)] }));
});

test('PF17: places not read (null) or buildings not read (null) is null, whatever the streets', { todo: 'test first' }, () => {
  assert.equal(measureRing({ ...READ, places: null }), null);
  assert.equal(measureRing({ ...READ, buildings: null }), null);
  assert.ok(measureRing({ ...READ, places: [], buildings: [] }), 'a read that found none is a read');
});
