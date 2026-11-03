/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, WalkArea } from '../areas/types';
import {
  ATLAS_CODE, ATLAS_RULES, SKETCH, distanceWords, familiarity, familiarityWords, findsIn, nearList, needsNear, newRows, nextDoor,
  presenceSteps, readQueue, rowCurrent, sketchOf, sketchPaths, tileLabel, toSketch, waitingKinds, walkTarget,
  type AtlasArea, type AtlasPlace, type AtlasProfile,
} from '../atlas/atlas';
import type { CategoryId } from '../discovery/types';
import type { LngLat } from '../types';

const O: LngLat = [-71.4, 41.812];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];
const north = (m: number, from: LngLat = O): LngLat => [from[0], from[1] + m / 111320];
const fmt = (m: number) => `${(m / 1000).toFixed(1)} km`;

const row = (name: string, at: LngLat, o: Partial<AtlasArea> = {}): AtlasArea => ({
  key: name, level: 'neighborhood', name, at, reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null, ...o,
});
const places = (category: CategoryId, n: number, at: LngLat, tag = ''): AtlasPlace[] =>
  Array.from({ length: n }, (_, i) => ({ key: `${category}${tag}${i}`, category, at: east(i, at) }));

test('AT1: neighborhoods near you, nearest first; the nearest within its reach is where you are', () => {
  const rows = [row('Far', east(2000)), row('Near', east(300)), row('Mid', east(900)), row('Out', east(4000))];
  const l = nearList(rows, O, 'neighborhood', 'b1');
  assert.deepEqual(l.map((x) => x.area.name), ['Near', 'Mid', 'Far'], 'nearest first, nothing past the near reach');
  assert.equal(l[0].here, true);
  assert.equal(l.slice(1).some((x) => x.here), false);
  const away = nearList([row('Far', east(1800))], O, 'neighborhood', 'b1');
  assert.equal(away[0].here, false, 'outside its reach, you are not in it');
});

test('AT1: one area is listed once, however many reads saw it', () => {
  const rows = [row('Fox Point', east(300)), row('Fox Point', east(500), { key: 'other' })];
  assert.equal(nearList(rows, O, 'neighborhood', 'b1').length, 1);
  assert.equal(newRows(rows, [{ level: 'neighborhood', name: 'Fox Point', at: east(400), reachM: 1000 }], 'b1', 2).length, 0);
  assert.equal(newRows([], [{ level: 'state', name: 'Rhode Island', at: O, reachM: 1 }], 'b1', 2).length, 0, 'only neighborhoods and towns');
});

test('AT2: each level lists only its own areas', () => {
  const rows = [row('Fox Point', east(300)), row('Providence', east(500), { level: 'town', reachM: 10_000 })];
  assert.deepEqual(nearList(rows, O, 'neighborhood', 'b1').map((x) => x.area.name), ['Fox Point']);
  assert.deepEqual(nearList(rows, O, 'town', 'b1').map((x) => x.area.name), ['Providence']);
  assert.equal(nearList([rows[1]], O, 'neighborhood', 'b1').length, 0, 'no neighborhood near: an empty level, said in words by the screen');
});

test('AT3: how far is a walking time, then a distance over an hour', () => {
  assert.equal(distanceWords(400, false, fmt), '6 min walk');
  assert.equal(distanceWords(10, true, fmt), 'You’re here');
  assert.equal(distanceWords(6000, false, fmt), '6.0 km away');
});

test('AT3: familiarity is the walks through the area, and nothing else', () => {
  const areas: Area[] = [
    { key: 'a1', level: 'neighborhood', name: 'Fox Point', parent_key: null, lon: east(200)[0], lat: O[1], rules: '1' },
    { key: 'a2', level: 'neighborhood', name: 'Fox Point', parent_key: null, lon: east(5000)[0], lat: O[1], rules: '1' },
  ];
  const wa = (walk: string, key: string, last: number): WalkArea => ({ walk_id: walk, area_key: key, metres: 100, first_t: last - 1, last_t: last, lon: 0, lat: 0 } as WalkArea);
  const f = familiarity({ level: 'neighborhood', name: 'Fox Point', at: O }, areas, [wa('w1', 'a1', 10), wa('w2', 'a1', 30), wa('w2', 'a1', 20), wa('w3', 'a2', 99)]);
  assert.deepEqual(f, { walks: 2, last: 30 }, 'a walk counts once; another Fox Point 5 km off is another area');
  assert.equal(familiarityWords({ walks: 0, last: null }), 'New to you');
  assert.equal(familiarityWords({ walks: 1, last: 1 }), 'Walked once');
  assert.equal(familiarityWords({ walks: 3, last: 1 }), 'Walked 3 times');
});

test('AT4: bars come from the fixed steps, the same everywhere, and only from inside the ring', () => {
  const s = presenceSteps([...places('food', 15, O), ...places('history', 1, O), ...places('art', 30, east(1500))], O);
  assert.equal(s.food, 2, '15 food places is two bars');
  assert.equal(s.history, 1);
  assert.equal(s.art, 0, 'outside the ring counts for nothing');
  const elsewhere: LngLat = [12.5, 55.7];
  const t = presenceSteps([...places('food', 15, elsewhere), ...places('history', 1, elsewhere)], elsewhere);
  assert.equal(t.food, s.food, 'the same places give the same bars in any area');
  assert.equal(t.history, s.history);
  assert.equal(presenceSteps([...places('food', 50, O)], O).food, 3);
  assert.equal(presenceSteps([...places('food', 3, O)], O).food, 0, 'three cafés are not yet "some"');
  assert.equal(presenceSteps([...places('food', 4, O), ...places('food', 4, O)], O).food, 1, 'a place counts once');
});

test('AT5: rings are read nearest first, one waiting after a failure', () => {
  const profile = {} as AtlasProfile;
  const list = nearList([row('A', east(100), { profile }), row('B', east(400), { failed_at: 1000 }), row('C', east(700))], O, 'neighborhood', 'b1');
  assert.equal(readQueue(list, 1000 + 1000)?.name, 'C', 'B failed a moment ago: C goes first');
  assert.equal(readQueue(list, 1000 + ATLAS_RULES.retryMs)?.name, 'B', 'after the wait, B is tried again');
  assert.equal(readQueue(nearList([row('A', O, { profile })], O, 'neighborhood', 'b1'), 0), null);
});

test('AT6: every sketch is the same scale: the ring is the same size in every frame', () => {
  const a = toSketch(O);
  const b = toSketch([12.5, 55.7]);
  assert.deepEqual(a(O), [SKETCH.w / 2, SKETCH.h / 2]);
  assert.equal(a(east(ATLAS_RULES.ringM))[0] - SKETCH.w / 2, SKETCH.ringR);
  assert.equal(b(east(ATLAS_RULES.ringM, [12.5, 55.7]))[0] - SKETCH.w / 2, SKETCH.ringR);
  assert.equal(SKETCH.h / 2 - a(north(ATLAS_RULES.ringM))[1], SKETCH.ringR, 'north is up');
});

test('AT6: the sketch draws streets, the ones you walked apart, busy streets and parks; far lines are left out', () => {
  const s = sketchOf({
    centre: O,
    segments: [
      { id: 's1', geometry: [[east(-300), east(300)]] },
      { id: 's2', geometry: [[north(-200), north(200)]] },
      { id: 'far', geometry: [[east(5000), east(5500)]] },
    ],
    strips: [[[east(-100), east(100)]]],
    parks: [north(300), east(9000)],
  });
  assert.deepEqual(s.streets.map((l) => l.id), ['s1', 's2']);
  assert.equal(s.parks.length, 2, 'one park in the frame');
  const p = sketchPaths(s, new Set(['s2']));
  assert.ok(p.walked.startsWith('M') && p.streets.startsWith('M') && p.strips.startsWith('M'));
  assert.equal((p.walked.match(/M/g) ?? []).length, 1);
  assert.equal((p.streets.match(/M/g) ?? []).length, 1);
});

test('AT7, AT10: what waits is kinds only, without finds, without kinds switched off', () => {
  const marks = [
    { key: 'm1', category: 'history' as const, kind: 'monuments' as const, at: O },
    { key: 'm2', category: 'art' as const, kind: 'public_art' as const, at: O },
    { key: 'm3', category: 'parks' as const, kind: 'parks' as const, at: O },
    { key: 'm4', category: 'history' as const, kind: 'churches' as const, at: O },
  ];
  assert.deepEqual(waitingKinds(marks, new Set(['m3'])), ['history', 'art'], 'in the tiles’ order; the found park is gone');
  assert.deepEqual(waitingKinds(marks, new Set(), new Set(['public_art', 'monuments'])), ['history', 'parks'], 'a kind switched off shows no "?" (the church still waits)');
  const found = findsIn([{ key: 'f', name: 'Hessian Memorial', at: east(100), category: 'history' as const }, { key: 'g', name: 'Far', at: east(2000), category: 'art' as const }], O);
  assert.deepEqual(found.map((f) => f.name), ['Hessian Memorial'], 'finds inside the ring are named');
});

test('AT8: next door is the nearest areas to this one, with the distance from it; Walk to goes to the busiest street', () => {
  const a = row('A', O);
  const rows = [a, row('B', east(600)), row('C', east(1500)), row('A', east(200), { key: 'dup' }), row('T', east(300), { level: 'town' })];
  assert.deepEqual(nextDoor(a, rows, 'b1').map((r) => [r.area.name, Math.round(r.distanceM / 10) * 10]), [['B', 600], ['C', 1500]]);
  assert.deepEqual(walkTarget(a), { at: O, label: 'A' });
  const p = { strips: ['Thayer Street'], stripAt: east(50) } as AtlasProfile;
  assert.deepEqual(walkTarget(row('A', O, { profile: p })), { at: east(50), label: 'Thayer Street' });
});

test('AT11, AT13: a tile says each kind present in words, and no number but how far and the walked count', () => {
  const steps = { history: 3, art: 1, culture: 0, parks: 2, viewpoints: 0, food: 2, shops: 0, nightlife: 0 } as const;
  const area = row('Fox Point', east(400), { profile: { steps, strips: ['Wickenden Street'], stripAt: O, marks: [], sketch: { streets: [], strips: [], parks: [] } } });
  const [l] = nearList([area], O, 'neighborhood', 'b1');
  l.here = false;
  const label = tileLabel(l, { walks: 0, last: null }, fmt);
  assert.equal(label, 'Fox Point. 6 min walk. New to you. History: lots, Art: some, Green: plenty, Food: plenty. Busy along Wickenden Street.');
  assert.ok(!/\d+\s*of\s*\d+/.test(label));
  assert.equal(label.replace('6 min', '').match(/\d/), null, 'how far is the only number here');
  assert.match(tileLabel({ ...l, area: { ...area, profile: null } }, { walks: 2, last: 1 }, fmt), /Walked 2 times\. Being read\.$/);
});

test('AT12: rows and near reads are current only under this build and these rules', () => {
  assert.equal(rowCurrent(row('A', O), 'b1'), true);
  assert.equal(rowCurrent(row('A', O), 'b2'), false);
  assert.equal(rowCurrent(row('A', O, { code: 'old' }), 'b1'), false);
  assert.equal(nearList([row('A', O)], O, 'neighborhood', 'b2').length, 0, 'a new build lists nothing until read again');
  assert.equal(needsNear(null, O, 'b1'), true);
  assert.equal(needsNear({ at: O, build: 'b1', code: ATLAS_CODE }, east(500), 'b1'), false);
  assert.equal(needsNear({ at: O, build: 'b1', code: ATLAS_CODE }, east(1500), 'b1'), true, 'moved away');
  assert.equal(needsNear({ at: O, build: 'b0', code: ATLAS_CODE }, O, 'b1'), true, 'new build');
  assert.equal(needsNear({ at: O, build: 'b1', code: 'old' }, O, 'b1'), true, 'new rules');
});

test('AT14: towns are listed within 12 km, and a city is where you are within its reach', () => {
  const rows = [row('Providence', east(4000), { level: 'town', reachM: 10_000 }), row('Cranston', east(9000), { level: 'town', reachM: 3000 }), row('Boston', east(60_000), { level: 'town' })];
  const l = nearList(rows, O, 'town', 'b1');
  assert.deepEqual(l.map((x) => x.area.name), ['Providence', 'Cranston']);
  assert.equal(l[0].here, true, '4 km from a city’s point is still in it');
});

test('AT12: the atlas is derived: clearing derived data clears it', async () => {
  const { DERIVED_STORES, KEPT_STORES } = await import('../db/stores');
  assert.ok(DERIVED_STORES.includes('atlas_area'));
  assert.ok(!KEPT_STORES.includes('atlas_area'));
});

test('AT6, AT7: one "?" per waiting kind on the picture, at its place nearest the point', async () => {
  const { waitingMarks } = await import('../atlas/atlas');
  const marks = [
    { key: 'a', category: 'history' as const, at: east(500) },
    { key: 'b', category: 'history' as const, at: east(100) },
    { key: 'c', category: 'art' as const, at: east(300) },
  ];
  const w = waitingMarks(marks, new Set(['c']), O);
  assert.deepEqual(w.map((m) => m.key), ['b'], 'one history mark, the nearest; the found art is gone');
  assert.equal(Object.keys(w[0]).includes('name'), false, 'marks carry no names');
});
