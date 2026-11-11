/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { outlineSet, type OutlineSet } from '../../areas/outlines';
import { hamletsFromTiles, placesFromTiles, type TileFeature } from '../../areas/tilePlaces';
import type { TownOutline } from '../../areas/types';
import { ATLAS_CODE, ATLAS_RULES, atlasStep, nearList, needsNear, townNeighborhoods, waitingMarks, type AtlasArea, type AtlasMark, type NearRead } from '../../atlas/atlas';
import { isWard, listingBy, townBorder, townHoods } from '../../atlas/hoods';
import { areaMapMarks, waitingLabel } from '../../atlas/waitingPins';
import { distanceM } from '../../geo';
import type { LngLat } from '../../types';

// Whole towns (specs/whole-towns, decision 0127): a town's page holds every neighborhood inside its border;
// the selected area's map shows every place still to find. Real cases run on Allentown
// (allentownHoods.json, cut by scripts/fixture-town-hoods.mjs: Overture 2026-10-21.0, OpenFreeMap 20261101).

type Fixture = { release: string; tile: { x: number; y: number; division_area: TileFeature[]; division: TileFeature[] }; places: TileFeature[] };
const fx = JSON.parse(readFileSync(new URL('./allentownHoods.json', import.meta.url), 'utf8')) as Fixture;
const allentownSet = outlineSet([outlineTileFrom(fx.tile.x, fx.tile.y, fx.release, 1, fx.tile, 10)]);
const ALLENTOWN: LngLat = [-75.4716, 40.6023];

const O: LngLat = [-75.47, 40.6];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];
const north = (m: number, from: LngLat = O): LngLat => [from[0], from[1] + m / 111320];
const square = (id: string, name: string, c: LngLat, halfM: number): TownOutline => {
  const [w, s, e, n] = [east(-halfM, c)[0], north(-halfM, c)[1], east(halfM, c)[0], north(halfM, c)[1]];
  return { id, name, at: c, polygons: [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]], bbox: [w, s, e, n], areaM2: (2 * halfM) ** 2 };
};
const setOf = (...towns: TownOutline[]): OutlineSet => ({ tiles: new Set(['10/297/385']), towns });
const row = (name: string, at: LngLat, o: Partial<AtlasArea> = {}): AtlasArea => ({
  key: `${name}@${at.join()}`, level: 'neighborhood', name, at, reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null, ...o,
});
const mark = (key: string, category: AtlasMark['category'], at: LngLat, kind?: AtlasMark['kind']): AtlasMark => ({ key, category, at, ...(kind ? { kind } : {}) });
// A town's marks: six art places, three parks, one history, across 4 km.
const MARKS: AtlasMark[] = [
  ...Array.from({ length: 6 }, (_, i) => mark(`art${i}`, 'art', east(i * 700 - 2000))),
  ...Array.from({ length: 3 }, (_, i) => mark(`park${i}`, 'parks', north(i * 900 - 900))),
  mark('hist0', 'history', east(1500, north(800))),
];
const BIG = row('Allentown', O, { level: 'town', reachM: 10_000 });
test('WT1: a town\'s page lists every neighborhood inside its border, nearest you first, past 5 km and past 24', () => {
  // A 16 km city, 30 neighborhoods across it; you stand near its west edge.
  const border = setOf(square('a', 'Allentown', O, 8000));
  const hoods = Array.from({ length: 30 }, (_, i) => row(`Hood ${i}`, east(-7000 + i * 480, north((i % 5) * 1000 - 2000))));
  const from = east(-7500);
  const l = townNeighborhoods([...hoods, BIG], BIG, [BIG], from, 'b1', null, border);
  assert.equal(l.length, 30, `every one inside the border, past ${ATLAS_RULES.townCap}`);
  assert.ok(l.some((x) => distanceM(x.area.at, O) > 6000), 'one more than 5 km from the town\'s point is listed');
  const d = l.map((x) => x.distanceM);
  assert.deepEqual(d, [...d].sort((a, b) => a - b), 'nearest you first');
  // Stand anywhere else: the same neighborhoods.
  const there = townNeighborhoods([...hoods, BIG], BIG, [BIG], east(7500), 'b1', null, border);
  assert.deepEqual(new Set(there.map((x) => x.area.key)), new Set(l.map((x) => x.area.key)), 'the same list wherever you stand');
  // Outside the border, nothing.
  assert.equal(townNeighborhoods([row('Beyond', east(9000)), BIG], BIG, [BIG], from, 'b1', null, border).length, 0);
});
test('WT2: a neighborhood in a smaller town inside the border is that town\'s', () => {
  const big = square('a', 'Allentown', O, 8000);
  const coplay = square('c', 'Coplay', east(3000), 500);
  const border = setOf(big, coplay);
  const COPLAY = row('Coplay', east(3000), { level: 'town', reachM: 3000 });
  const rows = [row('Old Town', east(-1000)), row('Riverside', east(3100)), BIG, COPLAY];
  assert.deepEqual(townNeighborhoods(rows, BIG, [BIG, COPLAY], O, 'b1', null, border).map((x) => x.area.name), ['Old Town'], 'Riverside is Coplay\'s');
  assert.deepEqual(townNeighborhoods(rows, COPLAY, [BIG, COPLAY], O, 'b1', null, border).map((x) => x.area.name), ['Riverside']);
});
test('WT3: a town with no border lists by its reach, at most 24', () => {
  const hoods = Array.from({ length: 30 }, (_, i) => row(`Hood ${i}`, east(-3000 + i * 200)));
  const far = row('Far', east(6000));
  for (const border of [null, setOf(square('x', 'Somewhere else', east(20_000), 1000))]) {
    const l = townNeighborhoods([...hoods, far, BIG], BIG, [BIG], O, 'b1', null, border);
    assert.equal(l.length, ATLAS_RULES.townCap, 'at most 24');
    assert.ok(!l.some((x) => x.area.name === 'Far'), 'within its reach capped at 5 km');
  }
});
test('WT3: a failed border read lists nothing and is tried again', () => {
  const outline = square('a', 'Allentown', O, 8000);
  assert.equal(listingBy({ complete: true }, outline), 'border');
  assert.equal(listingBy({ complete: false }, outline), 'border', 'the border was read, whatever else failed');
  assert.equal(listingBy({ complete: true }, null), 'reach', 'a read that answered with no border for the town');
  assert.equal(listingBy({ complete: false, tooMany: true }, null), 'reach');
  assert.equal(listingBy({ complete: false }, null), 'retry', 'a failed read is never a town with none');
  assert.equal(listingBy(null, null), 'retry');
});
test('WT4: Allentown\'s listing read finds every neighbourhood point inside its border', () => {
  const outline = townBorder({ name: 'Allentown', at: ALLENTOWN }, allentownSet);
  assert.ok(outline, 'Allentown\'s border is in the fixture');
  const kept = townHoods({ hoods: placesFromTiles(fx.places), hamlets: hamletsFromTiles(fx.places), outline: outline!, set: allentownSet });
  const names = kept.map((c) => c.name);
  // The map's neighbourhood points inside the border, every one but the wards.
  for (const n of ['Downtown', 'Center City', 'Old Allentown', 'Jordan Heights', 'West End', 'Park Ridge', 'Rose Garden', 'East Side', 'Dutch Hill', 'South Side', 'Mountainville', 'Wilbur', 'Alton Park', 'Midway Manor', 'Rittersville', 'Trexler Park']) {
    assert.ok(names.includes(n), `${n} is listed`);
  }
  assert.ok(distanceM(kept.find((c) => c.name === 'Trexler Park')!.at, ALLENTOWN) > 5000, 'Trexler Park, past 5 km, is found');
  assert.ok(kept.length > ATLAS_RULES.townCap, `more than the old cap (${kept.length})`);
  assert.ok(kept.every((c) => c.level === 'neighborhood'));
  for (const n of ['Mount Airy', 'West Bethlehem', 'Fullerton', 'Cetronia', 'Emmaus']) assert.ok(!names.includes(n), `${n} is outside Allentown`);
});
test('WT5: a hamlet inside a border is a neighborhood; outside, none; placesFromTiles still has no hamlet', () => {
  const outline = townBorder({ name: 'Allentown', at: ALLENTOWN }, allentownSet)!;
  const hamlets = hamletsFromTiles(fx.places);
  assert.ok(hamlets.some((h) => h.name === 'Hanover Acres') && hamlets.every((h) => h.level === 'neighborhood'));
  const names = townHoods({ hoods: [], hamlets, outline, set: allentownSet }).map((c) => c.name);
  assert.deepEqual(names, ['Hanover Acres'], 'the one hamlet inside the border; Dorneyville and Greenawalds are outside');
  assert.ok(!placesFromTiles(fx.places).some((c) => c.name === 'Hanover Acres' || c.kind === 'hamlet'), 'walk placement takes no hamlet');
});
test('WT6: wards are not neighborhoods, on a town\'s page or near you; Wardsville is', () => {
  for (const n of ['1st Ward', '6th Ward', 'Eighth Ward', '10th Ward', 'Ward 5', 'ward no. 3', 'Twenty-first Ward']) assert.equal(isWard(n), true, n);
  for (const n of ['Wardsville', 'Howard Park', 'West Ward Street', 'Ward', 'The Ward Building']) assert.equal(isWard(n), false, n);
  const outline = townBorder({ name: 'Allentown', at: ALLENTOWN }, allentownSet)!;
  const names = townHoods({ hoods: placesFromTiles(fx.places), hamlets: [], outline, set: allentownSet }).map((c) => c.name);
  for (const n of ['1st Ward', '6th Ward', 'Eighth Ward']) assert.ok(!names.includes(n), `${n} is not listed`);
  // Rows listed before the change are hidden too: near you and on a page by reach.
  const rows = [row('Eighth Ward', east(200)), row('Old Allentown', east(300)), BIG];
  assert.deepEqual(nearList(rows, O, 'neighborhood', 'b1').map((x) => x.area.name), ['Old Allentown']);
  assert.deepEqual(townNeighborhoods(rows, BIG, [BIG], O, 'b1').map((x) => x.area.name), ['Old Allentown']);
  assert.deepEqual(townNeighborhoods(rows, BIG, [BIG], O, 'b1', null, setOf(square('a', 'Allentown', O, 8000))).map((x) => x.area.name), ['Old Allentown']);
});
test('WT7: every place still to find in the selected area is on the map, a town\'s too', () => {
  for (const zoom of [11, 14, 17]) {
    const { pins, dots } = areaMapMarks('neighborhood', MARKS, new Set(), new Set(), O, zoom, O[1]);
    assert.deepEqual(new Set([...pins, ...dots].map((m) => m.key)), new Set(MARKS.map((m) => m.key)), `every place still to find is on the map at zoom ${zoom}`);
    const town = areaMapMarks('town', MARKS, new Set(), new Set(), O, zoom, O[1]);
    assert.deepEqual(new Set([...town.pins, ...town.dots].map((m) => m.key)), new Set(MARKS.map((m) => m.key)), `a town's too, at zoom ${zoom}`);
  }
  assert.equal(waitingMarks(MARKS, new Set(), O, new Set(), { all: true }).length, MARKS.length);
  // Of the kinds shown: a kind switched off in "What I'm into" is not drawn.
  const kinds = [mark('k1', 'art', O, 'public_art'), mark('k2', 'parks', east(400), 'parks')];
  const shown = areaMapMarks('neighborhood', kinds, new Set(), new Set(['public_art'] as const), O, 15, O[1]);
  assert.deepEqual([...shown.pins, ...shown.dots].map((m) => m.key), ['k2']);
});
test('WT8: the card\'s waiting is one per kind and no "?" carries a name', () => {
  const card = waitingMarks(MARKS, new Set(), O);
  assert.deepEqual(card.map((m) => m.category), ['history', 'art', 'parks'], 'the card: one per kind');
  const { pins, dots } = areaMapMarks('neighborhood', MARKS, new Set(), new Set(), O, 13, O[1]);
  for (const m of [...pins, ...dots]) assert.deepEqual(Object.keys(m).filter((k) => k !== 'crowded').sort(), ['at', 'category', 'key'], 'a mark carries no name');
  const said = waitingLabel('Downtown', [...pins, ...dots]);
  assert.ok(!/\d/.test(said) && !/\b(one|two|three|four|five|six|seven|eight|nine|ten|dozens?|many|several)\b/i.test(said), `no count in digits or words: "${said}"`);
});
test('WT9: a town\'s page is listed once per build; a read by reach alone is listed again', () => {
  const byReach: NearRead = { at: O, build: 'b1', code: ATLAS_CODE, radiusM: 5000 };
  assert.equal(needsNear([byReach], O, 'b1', 5000, BIG.key), true, 'a read made by reach alone is listed again');
  const whole: NearRead = { ...byReach, town: BIG.key };
  assert.equal(needsNear([whole], O, 'b1', 5000, BIG.key), false, 'once per build');
  assert.equal(needsNear([{ ...whole, build: 'b0' }], O, 'b1', 5000, BIG.key), true, 'a new build lists again');
  const step = atlasStep({ build: 'b1', latest: 'b1', list: [], now: 0, nears: [{ level: 'neighborhood', at: O, radiusM: 5000, reads: [byReach], town: BIG.key }] });
  assert.deepEqual(step, { kind: 'near', level: 'neighborhood', at: O, radiusM: 5000, town: BIG.key });
});
test('WT10: Explore\'s map draws no found place', () => {
  const found = new Set(['art0', 'park1']);
  const { pins, dots } = areaMapMarks('neighborhood', MARKS, found, new Set(), O, 14, O[1]);
  const drawn = [...pins, ...dots].map((m) => m.key);
  assert.ok(!drawn.includes('art0') && !drawn.includes('park1'), 'a find is not drawn');
  assert.equal(drawn.length, MARKS.length - 2);
  // Every place found: nothing drawn, as for an area with nothing mapped.
  const all = areaMapMarks('neighborhood', MARKS, new Set(MARKS.map((m) => m.key)), new Set(), O, 14, O[1]);
  const none = areaMapMarks('neighborhood', [], new Set(), new Set(), O, 14, O[1]);
  assert.deepEqual(all, none);
});
test('WT11: the "?" are one label naming the area and the kinds, the same for one or many', () => {
  const one = waitingLabel('Downtown', [MARKS[0]]);
  const many = waitingLabel('Downtown', MARKS.filter((m) => m.category === 'art'));
  assert.equal(one, 'Waiting in Downtown: art');
  assert.equal(many, one, 'the same for one or many');
  assert.equal(waitingLabel('Downtown', MARKS), 'Waiting in Downtown: history, art, green', 'the kinds in the card\'s order');
  assert.equal(waitingLabel('Downtown', []), '', 'nothing waiting, nothing said');
});
