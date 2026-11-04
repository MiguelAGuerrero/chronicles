/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, WalkArea } from '../../areas/types';
import {
  ATLAS_CODE, ATLAS_RULES, SKETCH, distanceWords, familiarity, familiarityWords, findsIn, nearList, needsNear, newRows, nextDoor,
  presenceSteps, readQueue, rowCurrent, sketchOf, sketchPaths, tileLabel, toSketch, waitingKinds, walkTarget,
  type AtlasArea, type AtlasPlace, type AtlasProfile,
} from '../../atlas/atlas';
import type { CategoryId } from '../../discovery/types';
import type { LngLat } from '../../types';

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
    graded: [{ lines: [[east(-100), east(100)]], grade: 2 }],
    parks: [north(300), east(9000)],
  });
  assert.deepEqual(s.streets.map((l) => l.id), ['s1', 's2']);
  assert.equal(s.parks.length, 2, 'one park in the frame');
  const p = sketchPaths(s, new Set(['s2']));
  assert.ok(p.walked.startsWith('M') && p.streets.startsWith('M') && p.grades[1].startsWith('M'));
  assert.equal((p.walked.match(/M/g) ?? []).length, 1);
  assert.equal((p.streets.match(/M/g) ?? []).length, 1);
});

test('AD14: the sketch has one path per grade', () => {
  const s = sketchOf({
    centre: O,
    segments: [],
    graded: [
      { lines: [[east(-300), east(-200)]], grade: 1 },
      { lines: [[east(-100), east(0)], [north(0), north(100)]], grade: 2 },
      { lines: [[east(100), east(200)]], grade: 3 },
      { lines: [[east(5000), east(5100)]], grade: 3 },
    ],
    parks: [],
  });
  const p = sketchPaths(s, new Set());
  assert.deepEqual(p.grades.map((d) => (d.match(/M/g) ?? []).length), [1, 2, 1], 'one path per grade; the stretch outside the frame is left out');
});

test('AD7: a ring measured without Overture, or with an older release, is read again after its wait', () => {
  const profile: AtlasProfile = { steps: { art: 0, food: 0, shops: 0, history: 0, parks: 0, culture: 0, viewpoints: 0, nightlife: 0 }, strips: [], stripAt: null, marks: [], sketch: { streets: [], grades: [[], [], []] as [number[][], number[][], number[][]], parks: [] }, overture: null };
  const list = nearList([row('A', O, { profile, read_at: 1000 })], O, 'neighborhood', 'b1');
  assert.equal(readQueue(list, 1000, null), null, 'no release known: as read');
  assert.equal(readQueue(list, 1000 + 1, 'r2'), null, 'just read: waits');
  assert.equal(readQueue(list, 1000 + ATLAS_RULES.retryMs, 'r2'), null, 'measured without Overture: waits longer (activity-density audit 10)');
  assert.equal(readQueue(list, 1000 + ATLAS_RULES.overtureRetryMs, 'r2')?.name, 'A', 'read again with Overture');
  const older = nearList([row('A', O, { profile: { ...profile, overture: 'r1' }, read_at: 1000 })], O, 'neighborhood', 'b1');
  assert.equal(readQueue(older, 1000 + ATLAS_RULES.retryMs, 'r2')?.name, 'A', 'an older release: read again after the usual wait');
  const current = nearList([row('A', O, { profile: { ...profile, overture: 'r2' }, read_at: 1000 })], O, 'neighborhood', 'b1');
  assert.equal(readQueue(current, 1000 + ATLAS_RULES.retryMs, 'r2'), null);
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
  assert.deepEqual(walkTarget(a), { at: O, label: 'A', via: null });
  const p = { strips: ['Thayer Street'], stripAt: east(50) } as AtlasProfile;
  assert.deepEqual(walkTarget(row('A', O, { profile: p })), { at: east(50), label: 'A', via: 'Thayer Street' });
});

test('AT11, AT13: a tile says each kind present in words, and no number but how far and the walked count', () => {
  const steps = { history: 3, art: 1, culture: 0, parks: 2, viewpoints: 0, food: 2, shops: 0, nightlife: 0 } as const;
  const area = row('Fox Point', east(400), { profile: { steps, strips: ['Wickenden Street'], stripAt: O, marks: [], sketch: { streets: [], grades: [[], [], []], parks: [] }, overture: null } });
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
  const { DERIVED_STORES, KEPT_STORES } = await import('../../db/stores');
  assert.ok(DERIVED_STORES.includes('atlas_area'));
  assert.ok(!KEPT_STORES.includes('atlas_area'));
});

test('AT6, AT7: one "?" per waiting kind on the picture, at its place nearest the point', async () => {
  const { waitingMarks } = await import('../../atlas/atlas');
  const marks = [
    { key: 'a', category: 'history' as const, at: east(500) },
    { key: 'b', category: 'history' as const, at: east(100) },
    { key: 'c', category: 'art' as const, at: east(300) },
  ];
  const w = waitingMarks(marks, new Set(['c']), O);
  assert.deepEqual(w.map((m) => m.key), ['b'], 'one history mark, the nearest; the found art is gone');
  assert.equal(Object.keys(w[0]).includes('name'), false, 'marks carry no names');
});

// The audit (2026-11-03): one regression test per accepted finding that pure logic can carry.
test('explore-atlas audit 2: a build newer than the hook’s is adopted, never read near again and again', async () => {
  const { atlasStep } = await import('../../atlas/atlas');
  const step = atlasStep({ build: 'b1', latest: 'b2', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [{ at: O, build: 'b2', code: ATLAS_CODE }] }], list: [], now: 0 });
  assert.deepEqual(step, { kind: 'adopt', build: 'b2' });
  const again = atlasStep({ build: 'b2', latest: 'b2', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [{ at: O, build: 'b2', code: ATLAS_CODE }] }], list: [], now: 0 });
  assert.equal(again.kind, 'idle', 'after adopting, nothing more to read');
});

test('explore-atlas audit 4: with no known build, the step waits and checks again', async () => {
  const { atlasStep } = await import('../../atlas/atlas');
  assert.deepEqual(atlasStep({ build: null, latest: 'unknown', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [] }], list: [], now: 0 }), { kind: 'wait', ms: ATLAS_RULES.retryMs });
  assert.deepEqual(atlasStep({ build: null, latest: 'b1', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [] }], list: [], now: 0 }), { kind: 'adopt', build: 'b1' });
});

test('explore-atlas audit 3: a failed ring waits its retry, and the step says how long', async () => {
  const { atlasStep } = await import('../../atlas/atlas');
  const list = nearList([row('A', O, { failed_at: 1000 })], O, 'neighborhood', 'b1');
  assert.deepEqual(atlasStep({ build: 'b1', latest: 'b1', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [{ at: O, build: 'b1', code: ATLAS_CODE }] }], list, now: 1000 }), { kind: 'wait', ms: ATLAS_RULES.retryMs });
  const step = atlasStep({ build: 'b1', latest: 'b1', nears: [{ level: 'neighborhood', at: O, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: [{ at: O, build: 'b1', code: ATLAS_CODE }] }], list, now: 1000 + ATLAS_RULES.retryMs });
  assert.equal(step.kind, 'ring');
});

test('explore-atlas audit 5: past the cap, the streets nearest the point are kept', () => {
  const segments = Array.from({ length: 1200 }, (_, i) => ({ id: `s${i}`, geometry: [[east(-1100 + i * 0.9), east(-1090 + i * 0.9)]] }));
  const s = sketchOf({ centre: O, segments, graded: [], parks: [] });
  assert.ok(s.streets.length <= 900);
  const ids = new Set(s.streets.map((l) => l.id));
  assert.ok(ids.has('s1199'), 'the line at the point, last in the input, is kept');
  assert.ok(!ids.has('s0'), 'the farthest line goes first');
});

test('explore-atlas audit 11: Walk to is offered only within navigation’s reach', async () => {
  const { canWalkTo } = await import('../../atlas/atlas');
  const { NAV } = await import('../../nav/rules');
  assert.equal(canWalkTo(NAV.maxM - 1), true);
  assert.equal(canWalkTo(NAV.maxM + 1), false);
});

test('AT7: what a ring read keeps of its marks has no names, and only markable places', async () => {
  const { marksOf } = await import('../../atlas/atlas');
  const kept = marksOf(
    [{ key: 'a', name: 'Hessian Memorial', category: 'history' as const, at: O }, { key: 'b', name: 'Domino’s', category: 'food' as const, at: O }],
    (p) => p.category !== 'food',
  );
  assert.deepEqual(kept.map((m) => m.key), ['a']);
  assert.ok(!JSON.stringify(kept).includes('Hessian'), 'the name is not kept');
});

test('AT2: a town’s own neighborhoods: within its reach, and not those of the town beside it', async () => {
  const { townOf, townNeighborhoods } = await import('../../atlas/atlas');
  const big = row('Allentown', O, { level: 'town', reachM: 10_000 });
  const small = row('Catasauqua', east(4000), { level: 'town', reachM: 3000 });
  const towns = [big, small];
  assert.equal(townOf({ at: east(3800) }, towns)?.name, 'Catasauqua', 'closer for its size wins');
  assert.equal(townOf({ at: east(-2000) }, towns)?.name, 'Allentown');
  assert.equal(townOf({ at: east(20_000) }, towns), null);
  const rows = [row('Old Town', east(-1000)), row('Riverside', east(3900)), row('Far', east(-6000)), ...towns];
  const l = townNeighborhoods(rows, big, towns, O, 'b1');
  assert.deepEqual(l.map((x) => x.area.name), ['Old Town'], 'Riverside is Catasauqua’s; Far is past the cap');
  assert.equal(townNeighborhoods(rows, small, towns, O, 'b1')[0].area.name, 'Riverside');
});

test('AT2: near reads are kept per spot, so going into a town and back reads nothing twice', async () => {
  const { withNear, NEAR_KEPT } = await import('../../atlas/atlas');
  const home = { at: O, build: 'b1', code: ATLAS_CODE, radiusM: 2500 };
  const town = { at: east(8000), build: 'b1', code: ATLAS_CODE, radiusM: 5000 };
  const reads = withNear([home], town);
  assert.equal(needsNear(reads, O, 'b1', 2500), false, 'back home: already read');
  assert.equal(needsNear(reads, east(8000), 'b1', 5000), false);
  assert.equal(needsNear(reads, east(8000), 'b1', 6000), true, 'a wider ask reads again');
  let many = reads;
  for (let i = 0; i < 20; i++) many = withNear(many, { ...town, at: east(i * 5000) });
  assert.equal(many.length, NEAR_KEPT);
});

test('AT2: the step lists the view’s neighborhoods first, then the towns around you', async () => {
  const { atlasStep } = await import('../../atlas/atlas');
  const done = { at: O, build: 'b1', code: ATLAS_CODE, radiusM: 2500 };
  const step = atlasStep({
    build: 'b1', latest: 'b1', list: [], now: 0,
    nears: [
      { level: 'neighborhood', at: O, radiusM: 2500, reads: [done] },
      { level: 'town', at: O, radiusM: ATLAS_RULES.nearTownM, reads: [] },
    ],
  });
  assert.deepEqual(step, { kind: 'near', level: 'town', at: O, radiusM: ATLAS_RULES.nearTownM });
});

test('AT16: an area’s character in words, never a count', async () => {
  const { characterLine } = await import('../../atlas/atlas');
  const z = { history: 0, art: 0, culture: 0, parks: 0, viewpoints: 0, food: 0, shops: 0, nightlife: 0 } as const;
  assert.equal(characterLine({ ...z, history: 3, food: 3, art: 1 }), 'Lots of history and food');
  assert.equal(characterLine({ ...z, parks: 2, food: 1 }), 'Plenty of green space');
  assert.equal(characterLine({ ...z, history: 1, art: 1, culture: 1, parks: 1, food: 1 }), 'A little of everything');
  assert.equal(characterLine({ ...z, parks: 1 }), 'A little green space');
  assert.equal(characterLine(z), 'Not much on the map here', 'never "Quiet", which is the walk mode on Navigate');
});

test('atlas round 3: your own town is the title, never listed again among the other towns', async () => {
  const { otherTowns } = await import('../../atlas/atlas');
  const rows = [row('Providence', east(500), { level: 'town', reachM: 10_000 }), row('Cranston', east(6000), { level: 'town', reachM: 3000 })];
  const l = nearList(rows, O, 'town', 'b1');
  assert.deepEqual(otherTowns(l).map((x) => x.area.name), ['Cranston']);
  assert.deepEqual(otherTowns(nearList([rows[1]], O, 'town', 'b1')).map((x) => x.area.name), ['Cranston'], 'no home town: all listed');
});

test('atlas round 3: How the marks work says it in words, with no counts of places', async () => {
  const { MARKS_EXPLAINED } = await import('../../atlas/atlas');
  assert.ok(MARKS_EXPLAINED.length >= 3);
  assert.equal(MARKS_EXPLAINED.join(' ').match(/\d/), null, `no numbers (${MARKS_EXPLAINED.join(' ')})`);
});

test('atlas round 3: Walk to names the area, and says which street it starts at', async () => {
  const { walkTarget } = await import('../../atlas/atlas');
  const p = { strips: ['Thayer Street'], stripAt: east(50) } as AtlasProfile;
  assert.deepEqual(walkTarget(row('College Hill', O, { profile: p })), { at: east(50), label: 'College Hill', via: 'Thayer Street' });
  assert.deepEqual(walkTarget(row('Smith Hill', O)), { at: O, label: 'Smith Hill', via: null });
});

// Atlas grading (AG1-AG6), written from specs/atlas-grading/spec.md before the code.

const marked = (category: CategoryId, n: number, at: LngLat, markable: boolean, tag = ''): AtlasPlace[] =>
  places(category, n, at, tag).map((p) => ({ ...p, markable }));

test('AG1: the findable kinds count only markable places; food, shops, nightlife count all', () => {
  const ring = [
    ...marked('history', 12, O, false, 'plain'), // twelve parish churches
    ...marked('parks', 6, O, false, 'dog'), // six dog parks
    ...marked('art', 1, O, true),
    ...marked('food', 15, O, false), // ordinary cafés are never marks, and count
    ...marked('nightlife', 2, O, false),
  ];
  const s = presenceSteps(ring, O);
  assert.equal(s.history, 0, 'plain churches count toward nothing');
  assert.equal(s.parks, 0, 'dog parks count toward nothing');
  assert.equal(s.art, 1);
  assert.equal(s.food, 2, 'food counts every place');
  assert.equal(s.nightlife, 1);
  assert.equal(presenceSteps([...marked('history', 4, O, true), ...marked('history', 8, O, false, 'p')], O).history, 2, 'only the four notable ones count');
});

test('AG2: a findable kind with a place waiting has a dot; one with no dot has nothing waiting', async () => {
  const { marksOf, waitingMarks } = await import('../../atlas/atlas');
  const ring = [
    ...marked('history', 1, east(780), true), // one notable place at the ring's edge
    ...marked('history', 9, O, false, 'plain'),
    ...marked('culture', 5, O, false), // ordinary libraries, cinemas
    ...marked('viewpoints', 1, north(600), true),
  ];
  const steps = presenceSteps(ring, O);
  const waiting = waitingMarks(marksOf(ring, (p) => p.markable === true), new Set(), O);
  for (const c of ['history', 'art', 'culture', 'parks', 'viewpoints'] as CategoryId[]) {
    const w = waiting.some((m) => m.category === c);
    assert.equal(steps[c] > 0, w, `${c}: dots ${steps[c]}, waiting ${w}`);
  }
});

test('AG3: fewer than 3 places in the ring is thin, and the tile’s words say nothing about kinds', async () => {
  const { thinRing, characterLine } = await import('../../atlas/atlas');
  assert.equal(thinRing([], O), true);
  assert.equal(thinRing([...marked('food', 1, O, false), ...marked('history', 1, O, false)], O), true, 'two places, ordinary ones included');
  assert.equal(thinRing([...marked('food', 2, O, false), ...marked('history', 1, O, false)], O), false, 'three places');
  assert.equal(thinRing([...marked('food', 2, O, false), ...marked('food', 5, east(1500), false, 'far')], O), true, 'places outside the ring are not counted');
  assert.equal(thinRing([...marked('food', 2, O, false), ...marked('food', 2, O, false)], O), true, 'a place counts once');
  const steps = presenceSteps(marked('food', 2, O, false), O);
  assert.equal(characterLine(steps, true), '', 'a thin ring has no character line');
  const label = tileLabel({ area: row('Fields', O, { profile: { steps, strips: [], thin: true } as unknown as AtlasProfile }), distanceM: 900, here: false }, { walks: 0, last: null }, fmt);
  assert.doesNotMatch(label, /Quiet|Not much|none|little/i, label);
  assert.match(label, /^Fields\./);
});

test('AG4: how the marks work names what counts, with no digits', async () => {
  const { MARKS_EXPLAINED } = await import('../../atlas/atlas');
  const all = MARKS_EXPLAINED.join(' ');
  assert.equal(all.match(/\d/), null, all);
  assert.match(all, /worth finding/i, 'the findable kinds count places worth finding');
  assert.match(all, /food, shops and nightlife/i, 'the others are named');
  assert.match(all, /every/i, 'and count everything');
});

test('AG6: a profile from older rules is not current', () => {
  assert.notEqual(ATLAS_CODE, 'a3', 'the grading rules moved on');
  assert.equal(rowCurrent(row('A', O, { code: 'a3' }), 'b1'), false);
  assert.equal(rowCurrent(row('A', O), 'b1'), true);
});
