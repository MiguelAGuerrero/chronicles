/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlaceCandidate } from '../areas/types';
import { placeKey } from '../discovery/places';
import { placesFromTilePois } from '../discovery/tilePois';
import type { CategoryId, Place } from '../discovery/types';
import {
  EXPLORE_RULES,
  KINDS,
  alertsDue,
  areaFor,
  buildChecklists,
  checklistKey,
  clampRange,
  countLine,
  findFor,
  findsLine,
  foundList,
  foundLine,
  homeCount,
  placeCount,
  passedLine,
  readCentre,
  retryAllowed,
  revealedKeys,
  routeProbes,
  routeMarks,
  visibleMarks,
  type ChecklistArea,
  type ChecklistItem,
  type Kind,
} from '../explore/explore';
import type { LngLat } from '../types';

// Slice 5 of v1 (explore), written from criteria E2-E23 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** A point x metres east and y metres north of O. */
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

const hood = (name: string, at: LngLat): PlaceCandidate => ({ level: 'neighborhood', name, at, reachM: 1000 });
const town = (name: string, at: LngLat, reachM = 3000): PlaceCandidate => ({ level: 'town', name, at, reachM });

const place = (name: string, at: LngLat, kind: Kind = 'museums', category: CategoryId = 'culture', markable = true): Place => ({
  key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1', markable, kind,
});

const item = (name: string, at: LngLat, kind: Kind = 'museums', area_key = 'A'): ChecklistItem => ({
  key: placeKey('culture', name, at), area_key, name, category: 'culture', kind, at, generic: false,
});

// ——— Kinds (E16) ———

test('E16: eight kinds, in the settings order', () => {
  assert.deepEqual(
    KINDS.map((k) => k.id),
    ['public_art', 'museums', 'theatres', 'monuments', 'churches', 'cemeteries', 'parks', 'viewpoints'],
  );
});

test('E16: the tiles adapter gives each attraction its kind', () => {
  const pt = (cls: string, subclass: string, name: string, x: number) => ({
    geometry: { type: 'Point', coordinates: m(x, 0) }, properties: { class: cls, subclass, name },
  });
  const got = placesFromTilePois([
    pt('art_gallery', 'artwork', 'Mural', 0),
    pt('museum', 'museum', 'RISD Museum', 10),
    pt('theatre', 'theatre', 'Trinity Rep', 20),
    pt('monument', 'memorial', 'War Memorial', 30),
    pt('place_of_worship', 'place_of_worship', 'Old North Church', 40),
    pt('cemetery', 'cemetery', 'North Burial Ground', 50),
    pt('park', 'park', 'Prospect Park', 60),
    pt('attraction', 'viewpoint', 'Overlook', 70),
    pt('restaurant', 'restaurant', 'Al Forno', 80),
  ], 'b1');
  const kind = (n: string) => got.find((p) => p.name === n)?.kind;
  assert.equal(kind('Mural'), 'public_art');
  assert.equal(kind('RISD Museum'), 'museums');
  assert.equal(kind('Trinity Rep'), 'theatres');
  assert.equal(kind('War Memorial'), 'monuments');
  assert.equal(kind('Old North Church'), 'churches');
  assert.equal(kind('North Burial Ground'), 'cemeteries');
  assert.equal(kind('Prospect Park'), 'parks');
  assert.equal(kind('Overlook'), 'viewpoints');
  assert.equal(kind('Al Forno'), undefined);
});

// ——— Membership (E3) ———

test('E3: a place goes to the nearest neighborhood within 1 km', () => {
  const a = hood('Fox Point', m(0, 0));
  const b = hood('College Hill', m(1500, 0));
  assert.equal(areaFor(m(600, 0), [a, b])?.name, 'Fox Point');
  assert.equal(areaFor(m(900, 0), [a, b])?.name, 'College Hill');
});

test('E3: with no neighborhood within 1 km, the town within its reach; with neither, none', () => {
  const t = town('Providence', m(0, 0));
  const far = hood('Far', m(5000, 0));
  assert.deepEqual(areaFor(m(2000, 0), [t, far]), { level: 'town', name: 'Providence', at: m(0, 0) });
  assert.equal(areaFor(m(20000, 0), [t, far]), null);
});

test('E3: between a town and a city, the closer for its size wins', () => {
  const small = town('Small', m(0, 0), 3000);
  const city = town('City', m(6000, 0), 10_000);
  // 2.5 km from the town (0.83 of its reach), 3.5 km from the city (0.35 of its reach).
  assert.equal(areaFor(m(2500, 0), [small, city])?.name, 'City');
});

test('checklist keys come from the area point, so the home can find them', () => {
  assert.equal(checklistKey({ level: 'neighborhood', name: 'Fox Point', at: [-71.40001, 41.81204] }), checklistKey({ level: 'neighborhood', name: 'Fox Point', at: [-71.40003, 41.81201] }));
  assert.notEqual(checklistKey({ level: 'neighborhood', name: 'Fox Point', at: O }), checklistKey({ level: 'town', name: 'Fox Point', at: O }));
});

// ——— Building (E2, E3, E4) ———

test('E2, E3: a read builds a checklist of the attractions of each area it fully covers', () => {
  const a = hood('Fox Point', O);
  const b = hood('Far Hood', m(1300, 0)); // its 1 km reach runs past the 1.5 km read
  const places = [
    place('Museum', m(100, 0)),
    place('Gallery', m(300, 200), 'museums'),
    place('Diner', m(50, 0), undefined, 'food', false), // not markable
    place('Far Museum', m(1300, 100)),
  ];
  const r = buildChecklists({ places, candidates: [a, b], centre: O, build: 'b1', now: 5 });
  assert.deepEqual(r.areas.map((x) => x.name), ['Fox Point']);
  assert.equal(r.areas[0].count, 2);
  assert.equal(r.areas[0].build, 'b1');
  assert.equal(r.areas[0].built_at, 5);
  assert.deepEqual(r.items.filter((i) => i.area_key === r.areas[0].key).map((i) => i.name).sort(), ['Gallery', 'Museum']);
});

test('E2: a covered area with no attractions is still built, with 0, so it is not read again', () => {
  const r = buildChecklists({ places: [], candidates: [hood('Quiet', O)], centre: O, build: 'b1', now: 1 });
  assert.equal(r.areas.length, 1);
  assert.equal(r.areas[0].count, 0);
});

test('E3: places with no area are kept as orphans, never counted', () => {
  const r = buildChecklists({ places: [place('Lonely Statue', O, 'monuments', 'history')], candidates: [], centre: O, build: 'b1', now: 1 });
  assert.equal(r.areas.length, 0);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].area_key, null);
});

test('E2: a place keyed twice (straddling a rounding line) is one item', () => {
  const p1 = place('Museum', m(10, 0));
  const p2 = { ...place('Museum', m(12, 0)), key: 'other-key' };
  const r = buildChecklists({ places: [p1, p2], candidates: [hood('H', O)], centre: O, build: 'b1', now: 1 });
  assert.equal(r.areas[0].count, 1);
});

test('E16: places without a kind (cached before kinds) are left out', () => {
  const p = { ...place('Museum', m(10, 0)), kind: undefined };
  const r = buildChecklists({ places: [p], candidates: [hood('H', O)], centre: O, build: 'b1', now: 1 });
  assert.equal(r.items.length, 0);
});

// ——— When to read (E2, E4, E5) ———

const area = (name: string, at: LngLat, build = 'b1'): ChecklistArea => ({
  key: checklistKey({ level: 'neighborhood', name, at }), level: 'neighborhood', name, at, build, built_at: 1, count: 3,
});

test('E2: no read when the fix is in an area with a current checklist and a read covers it', () => {
  const a = hood('H', O);
  assert.equal(readCentre({ fix: m(200, 0), candidates: [a], areas: [area('H', O)], reads: [{ centre: O, build: 'b1' }], build: 'b1' }), null);
});

test('E2: the first fix anywhere is read around itself', () => {
  assert.deepEqual(readCentre({ fix: m(200, 0), candidates: [], areas: [], reads: [], build: 'b1' }), m(200, 0));
});

test('E2: a known area with no checklist is read around its own point, so the read covers it', () => {
  const a = hood('H', m(700, 0));
  assert.deepEqual(readCentre({ fix: O, candidates: [a], areas: [], reads: [{ centre: O, build: 'b1' }], build: 'b1' }), m(700, 0));
});

test('E4: a checklist of an older build is read again', () => {
  const a = hood('H', O);
  assert.deepEqual(readCentre({ fix: O, candidates: [a], areas: [area('H', O, 'b0')], reads: [{ centre: O, build: 'b1' }], build: 'b1' }), O);
});

test('E5: outside every read of this build (1 km), a fix is read even with no area', () => {
  const r = readCentre({ fix: m(1200, 0), candidates: [], areas: [], reads: [{ centre: O, build: 'b1' }], build: 'b1' });
  assert.deepEqual(r, m(1200, 0));
  assert.equal(readCentre({ fix: m(800, 0), candidates: [], areas: [], reads: [{ centre: O, build: 'b1' }], build: 'b1' }), null);
});

// ——— Range (E20) ———

test('E20: the range is 60-300 m in 20 m steps, 100 m by default', () => {
  assert.equal(EXPLORE_RULES.rangeDefault, 100);
  assert.equal(clampRange(10), 60);
  assert.equal(clampRange(1000), 300);
  assert.equal(clampRange(115), 120);
  assert.equal(clampRange(NaN), 100);
});

// ——— What shows (E6-E9, E17) ———

test('E6: only places within range show, nearest first, at most 8', () => {
  const items = Array.from({ length: 12 }, (_, i) => item(`P${i}`, m(10 + i * 8, 0)));
  items.push(item('Far', m(150, 0)));
  const v = visibleMarks({ items, here: O, rangeM: 100, found: new Set(), hidden: new Set(), revealed: new Set() });
  assert.equal(v.length, 8);
  assert.deepEqual(v.map((x) => x.item.name), ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  assert.ok(v.every((x) => x.state === 'unknown' || x.state === 'named'));
});

test('E20: the range setting moves the edge', () => {
  const items = [item('A', m(150, 0))];
  assert.equal(visibleMarks({ items, here: O, rangeM: 100, found: new Set(), hidden: new Set(), revealed: new Set() }).length, 0);
  assert.equal(visibleMarks({ items, here: O, rangeM: 160, found: new Set(), hidden: new Set(), revealed: new Set() }).length, 1);
});

test('E7: within 60 m (or once revealed on this walk) a mark is named', () => {
  const near = item('Near', m(50, 0));
  const mid = item('Mid', m(90, 0));
  const seen = item('Seen', m(95, 0));
  const v = visibleMarks({ items: [near, mid, seen], here: O, rangeM: 100, found: new Set(), hidden: new Set(), revealed: new Set([seen.key]) });
  const st = (n: string) => v.find((x) => x.item.name === n)?.state;
  assert.equal(st('Near'), 'named');
  assert.equal(st('Mid'), 'unknown');
  assert.equal(st('Seen'), 'named');
});

test('E8: a found place stays drawn at any distance, outside the cap', () => {
  const found = item('Found', m(2000, 0));
  const near = Array.from({ length: 8 }, (_, i) => item(`N${i}`, m(10 + i, 0)));
  const v = visibleMarks({ items: [found, ...near], here: O, rangeM: 100, found: new Set([found.key]), hidden: new Set(), revealed: new Set() });
  assert.equal(v.length, 9);
  assert.equal(v.find((x) => x.item.name === 'Found')?.state, 'found');
});

test('E17: a hidden kind gets no ? marks, but its found places still show', () => {
  const church = item('Church', m(20, 0), 'churches');
  const foundChurch = item('Found Church', m(30, 0), 'churches');
  const museum = item('Museum', m(40, 0), 'museums');
  const v = visibleMarks({ items: [church, foundChurch, museum], here: O, rangeM: 100, found: new Set([foundChurch.key]), hidden: new Set<Kind>(['churches']), revealed: new Set() });
  assert.deepEqual(v.map((x) => x.item.name).sort(), ['Found Church', 'Museum']);
});

// ——— Finding (E8, E18) ———

test('E8: a capture finds the nearest unfound place within 60 m', () => {
  const a = item('A', m(50, 0));
  const b = item('B', m(30, 0));
  assert.equal(findFor(O, [a, b], new Set())?.name, 'B');
  assert.equal(findFor(O, [a, b], new Set([b.key]))?.name, 'A');
  assert.equal(findFor(O, [item('Far', m(70, 0))], new Set()), null);
});

test('E18: a hidden kind is still found by a capture', () => {
  const c = item('Church', m(20, 0), 'churches');
  assert.equal(findFor(O, [c], new Set())?.name, 'Church');
});

test('E7: walking past names a place (revealed) but never finds it', () => {
  const a = item('A', m(50, 0));
  const b = item('B', m(500, 0));
  assert.deepEqual([...revealedKeys([a, b], [O, m(10, 0)])], [a.key]);
});

// ——— On the way (E22, E23) ———

test('E22: places within range of the route ahead show faint, ordered along the route', () => {
  const route: LngLat[] = [O, m(1000, 0)];
  const a = item('Ahead far', m(800, 50));
  const b = item('Ahead near', m(300, -60));
  const c = item('Off route', m(500, 300));
  const r = routeMarks({ items: [a, b, c], route, rangeM: 100, exclude: new Set(), found: new Set(), hidden: new Set() });
  assert.deepEqual(r.map((x) => x.name), ['Ahead near', 'Ahead far']);
});

test('E23: route marks are capped at 20 and skip what already shows nearby, found or hidden', () => {
  const route: LngLat[] = [O, m(3000, 0)];
  const items = Array.from({ length: 30 }, (_, i) => item(`R${i}`, m(100 + i * 90, 20)));
  const nearby = new Set([items[0].key]);
  const found = new Set([items[1].key]);
  const church = item('Church', m(50, 10), 'churches');
  const r = routeMarks({ items: [...items, church], route, rangeM: 100, exclude: nearby, found, hidden: new Set<Kind>(['churches']) });
  assert.equal(r.length, 20);
  assert.ok(!r.some((x) => x.key === items[0].key || x.key === items[1].key || x.name === 'Church'));
});

// ——— Pocket alert (E19) ———

test('E19: a place alerts once, when it first comes into range as a ?', () => {
  const first = alertsDue(['a', 'b'], new Set());
  assert.deepEqual(first, ['a', 'b']);
  assert.deepEqual(alertsDue(['a', 'b', 'c'], new Set(['a', 'b'])), ['c']);
});

// ——— The home and the replay (E10, E11) ———

test('E10: the place view reads "12 of 87 · list from Nov 1"; an empty checklist reads nothing', () => {
  const a: ChecklistArea = { ...area('H', O), count: 87, built_at: Date.UTC(2026, 10, 1, 12) };
  assert.deepEqual(homeCount(a, 12), { found: 12, total: 87, builtAt: a.built_at });
  assert.equal(countLine(homeCount(a, 12)!, 'en-US', 'UTC'), '12 of 87 · list from Nov 1');
  assert.equal(homeCount({ ...a, count: 0 }, 0), null);
});

test('E11: the low counts places revealed on the walk but not captured', () => {
  assert.equal(passedLine(3), 'Passed 3 places you didn’t stop for');
  assert.equal(passedLine(1), 'Passed 1 place you didn’t stop for');
  assert.equal(passedLine(0), null);
});

// ——— Retry (E5) ———


test('E5: after a failed read, wait 2 min and 100 m walked', () => {
  const fail = { at: O, t: 0 };
  assert.equal(retryAllowed(null, O, 0), true);
  assert.equal(retryAllowed(fail, m(150, 0), 60_000), false);
  assert.equal(retryAllowed(fail, m(50, 0), 200_000), false);
  assert.equal(retryAllowed(fail, m(150, 0), 200_000), true);
});

test('E23: a route is probed every 500 m, so each area along it is read once', () => {
  const probes = routeProbes([O, m(2000, 0)]);
  assert.equal(probes.length, 5);
  assert.deepEqual(probes[0], O);
});

test('E11: a found place shows its name and category with its capture; the card lists finds by category', () => {
  assert.equal(foundLine({ name: 'RISD Museum', category: 'culture', generic: false }), 'Found: RISD Museum · Culture');
  assert.equal(foundLine({ name: 'Public art', category: 'art', generic: true }), 'Found: Public art');
  assert.equal(findsLine([{ category: 'art' }, { category: 'culture' }, { category: 'art' }]), 'Found 2 art · 1 culture');
  assert.equal(findsLine([]), null);
});

test('E11: the card lists the places found on this walk, by name', () => {
  assert.equal(foundList(['RISD Museum', 'Old North Church']), 'Found RISD Museum · Old North Church');
  assert.equal(foundList(['A', 'B', 'C', 'D', 'E']), 'Found A · B · C and 2 more');
  assert.equal(foundList([]), null);
});

test('E10: a home place finds its checklist by level, name and point; found counts only its own finds', () => {
  const a: ChecklistArea = { ...area('Fox Point', [-71.40001, 41.81204]), count: 4 };
  const f = (key: string, area_key: string | null) => ({ key, area_key }) as unknown as Parameters<typeof placeCount>[2][number];
  const got = placeCount({ level: 'neighborhood', name: 'Fox Point', lon: -71.40003, lat: 41.81201 }, [a], [f('x', a.key), f('y', a.key), f('z', 'other')]);
  assert.deepEqual(got && { found: got.count.found, total: got.count.total, names: got.found.length }, { found: 2, total: 4, names: 2 });
  assert.equal(placeCount({ level: 'state', name: 'Rhode Island', lon: 0, lat: 0 }, [a], []), null);
  assert.equal(placeCount({ level: 'neighborhood', name: 'Elsewhere', lon: 0, lat: 0 }, [a], []), null);
});
