/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// After dark (DK3, DK4, DK8's query, DK15), written from specs/after-dark/spec.md before the code.

interface DarkWay { id: string; lit: string; name?: string; line: LngLat[] }
interface DarkPlace { id: string; at: LngLat; hours: string }
interface DarkDraw { lit: LngLat[][]; open: LngLat[]; key: string }
interface DrawApi {
  darkDraw(tiles: readonly { ways: DarkWay[]; places: DarkPlace[] }[], when: { weekday: number; minute: number } | null): DarkDraw;
  hoursReadHere(centre: LngLat, you: LngLat | null, deviceOffsetMin: number): boolean;
}
interface OverpassApi {
  litOf(v: string | undefined): 'lit' | 'unlit' | 'unknown';
  darkQuery(s: number, w: number, n: number, e: number): string;
  darkFromOverpass(json: unknown): { ways: DarkWay[]; places: DarkPlace[] };
}
const draw = async () => (await import('../../dark/draw' as string)) as DrawApi;
const overpass = async () => (await import('../../dark/overpass' as string)) as OverpassApi;

const O: LngLat = [-75.49, 40.6];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
const way = (id: string, lit: string, y: number): DarkWay => ({ id, lit, name: `Street ${id}`, line: [at(0, y), at(300, y)] });
const place = (id: string, hours: string, x: number): DarkPlace => ({ id, at: at(x, 50), hours });
const MO = 1;

test('DK3: only ways tagged lit draw; no tag and lit=no draw nothing; one line per lit way, never an area', async () => {
  const { litOf } = await overpass();
  for (const v of ['yes', '24/7', 'automatic', 'limited', 'interval', 'sunset-sunrise', 'dusk-dawn', '18:00-06:00']) assert.equal(litOf(v), 'lit', v);
  assert.equal(litOf('no'), 'unlit');
  // A light mapped as out of use says nothing about tonight (after-dark audit 11).
  for (const v of [undefined, '', 'maybe', 'disused']) assert.equal(litOf(v), 'unknown', String(v));
  const { darkDraw } = await draw();
  const got = darkDraw([{ ways: [way('a', 'yes', 0), way('b', 'no', 100), way('c', 'maybe', 200), way('d', 'automatic', 300)], places: [] }], null);
  assert.equal(got.lit.length, 2);
  assert.deepEqual(got.lit[0], way('a', 'yes', 0).line);
  assert.deepEqual(got.lit[1], way('d', 'automatic', 300).line);
  for (const l of got.lit) assert.notDeepEqual(l[0], l[l.length - 1], 'a line, never a closed ring');
});

test('DK4: only places open at the reading\'s time draw, as bare points; closed, missing and unreadable hours draw nothing; far from you, none', async () => {
  const { darkDraw, hoursReadHere } = await draw();
  const places = [
    place('open', 'Mo-Su 17:00-23:00', 10),
    place('closed', 'Mo-Fr 09:00-17:00', 20),
    place('unknown', 'Jan-Mar Mo-Fr 18:00-22:00', 30),
    place('none', '', 40),
  ];
  const got = darkDraw([{ ways: [], places }], { weekday: MO, minute: 20 * 60 });
  assert.deepEqual(got.open, [places[0].at]);
  assert.deepEqual(darkDraw([{ ways: [], places }], null).open, [], 'no reading time (no dark tonight, or hours far from you): no marks');
  // Near you, by your own position: within 45 minutes of solar time.
  assert.equal(hoursReadHere(O, [-75.0, 40.7], -300), true, 'Allentown from Philadelphia');
  assert.equal(hoursReadHere(O, [-87.6, 41.9], -300), false, 'Allentown from Chicago');
  // With no position, by the device's offset, with room for daylight saving and how far a zone runs from its solar time.
  assert.equal(hoursReadHere(O, null, -240), true, 'Allentown on an EDT phone');
  assert.equal(hoursReadHere([-3.7, 40.4], null, 120), true, 'Madrid on a CEST phone');
  assert.equal(hoursReadHere([139.7, 35.7], null, -240), false, 'Tokyo on an EDT phone');
});

test('DK15: the key changes only when the picture does, a closing crossed included', async () => {
  const { darkDraw } = await draw();
  const tiles = [{ ways: [way('a', 'yes', 0)], places: [place('bar', 'Mo-Su 17:00-23:00', 10)] }];
  const at2000 = darkDraw(tiles, { weekday: MO, minute: 20 * 60 });
  const at2100 = darkDraw(tiles, { weekday: MO, minute: 21 * 60 });
  const at2330 = darkDraw(tiles, { weekday: MO, minute: 23 * 60 + 30 });
  assert.equal(at2000.key, at2100.key, 'the same picture a minute (or an hour) later');
  assert.notEqual(at2000.key, at2330.key, 'the bar closed');
  const more = darkDraw([...tiles, { ways: [way('b', 'yes', 100)], places: [] }], { weekday: MO, minute: 20 * 60 });
  assert.notEqual(at2000.key, more.key, 'a new tile with a new lit way');
});

test('DK8: the query holds the tile\'s bounds and asks only for lit ways and places with opening hours; the parser keeps the raw tags', async () => {
  const { darkQuery, darkFromOverpass } = await overpass();
  const q = darkQuery(40.59, -75.5, 40.61, -75.48);
  assert.ok(q.includes('40.59,-75.5,40.61,-75.48'), q);
  assert.ok(/way\["highway"\]\["lit"\]/.test(q), q);
  assert.ok(/\["opening_hours"\]/.test(q), q);
  assert.ok(!/"name"|around:|\bpoly:/.test(q), 'nothing but the two tag sets, by the tile\'s box');
  const got = darkFromOverpass({ elements: [
    { type: 'way', id: 1, tags: { highway: 'residential', lit: 'yes', name: 'Elm Street' }, geometry: [{ lat: 40.6, lon: -75.49 }, { lat: 40.601, lon: -75.49 }] },
    { type: 'node', id: 2, lat: 40.6, lon: -75.491, tags: { amenity: 'bar', opening_hours: 'Mo-Su 17:00-02:00', name: 'The Bar' } },
    { type: 'way', id: 3, center: { lat: 40.602, lon: -75.492 }, tags: { shop: 'books', opening_hours: 'Mo-Sa 10:00-20:00' } },
    { type: 'way', id: 4, tags: { highway: 'footway', lit: 'no' } },
  ] });
  assert.deepEqual(got.ways, [{ id: 'w1', lit: 'yes', name: 'Elm Street', line: [[-75.49, 40.6], [-75.49, 40.601]] }]);
  assert.deepEqual(got.places, [{ id: 'n2', at: [-75.491, 40.6], hours: 'Mo-Su 17:00-02:00' }, { id: 'w3', at: [-75.492, 40.602], hours: 'Mo-Sa 10:00-20:00' }]);
});
