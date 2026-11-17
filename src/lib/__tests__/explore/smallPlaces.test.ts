/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archivePlace, placesFromArchive } from '../../discovery/archivePois';
import { mergePlaces } from '../../discovery/archiveMerge';
import { kindRows, kindSwitch, refineRead } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Kind, Place } from '../../discovery/types';
import { foundLine, KINDS, kindHint, parseHidden, passedLine, passedPlaces, visibleMarks, type ChecklistItem } from '../../explore/explore';
import { waitingMarks, type AtlasMark } from '../../atlas/atlas';
import { sightsFrom } from '../../nav/scenicSignals';
import { classesOfArchive, isStorefront, storefrontWeight } from '../../presence/presence';
import type { LngLat } from '../../types';
import * as smallPlaces from '../../discovery/subtypes';

// Small places (specs/small-places, SP1-SP22; decision 0183), written from the spec before the code. New modules are loaded
// by a path TypeScript doesn't resolve, so a todo runs before they exist.

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261116';
const small = async () => smallPlaces;
const read = (places: (Place | null)[]) => refineRead(places.filter((p): p is Place => !!p), { archive: [] });
const kindOfName = (places: Place[], name: string) => places.find((p) => p.name === name)?.kind;
const item = (p: Place): ChecklistItem => ({ key: p.key, area_key: 'a', name: p.name, category: p.category, kind: p.kind!, at: p.at, generic: p.generic });

// Superseded in part by Explore subtypes (decision 0187): markers are their own subtype (XS10), OSM's plaques `plaque`;
// statues, murals and community gardens are subtypes of their kinds (XS3, XS11); the default-off set is XS6's.
test('SP3: the archive\'s small classes map to one kind each, pinned (markers apart since XS10)', async () => {
  await small();
  const one = (cls: string, name = 'X') => read([archivePlace(name, cls, O, V)])[0];
  const pins: [string, string, Kind][] = [
    ['marker', 'history', 'markers' as Kind], ['plaque', 'history', 'plaques' as Kind], ['small_memorial', 'history', 'small_memorials' as Kind], ['old_stone', 'history', 'old_stones' as Kind],
    ['wayside_shrine', 'history', 'wayside_shrines' as Kind], ['time_capsule', 'viewpoints', 'time_capsules' as Kind],
    ['public_bookcase', 'culture', 'little_libraries' as Kind], ['mural', 'art', 'murals' as Kind], ['sculpture', 'art', 'public_art'],
    ['statue', 'art', 'statues' as Kind], ['community_garden', 'parks', 'community_gardens' as Kind],
  ];
  for (const [cls, category, kind] of pins) {
    const p = one(cls);
    assert.equal(p?.category, category, cls);
    assert.equal(p?.kind, kind, cls);
    assert.equal(p?.markable, true, `${cls} is a place to find`);
  }
});

test('SP4: an unknown class is left out, never guessed', async () => {
  await small();
  assert.equal(archivePlace('Thing', 'bus_stop', O, V), null);
  assert.deepEqual(classesOfArchive('bench'), []);
});

test('SP5: an unnamed small place enters named by its type, said once when found; other classes still need a name', async () => {
  await small();
  const labels: [string, string][] = [
    ['plaque', 'A plaque'], ['public_bookcase', 'A little library'], ['time_capsule', 'A time capsule'], ['small_memorial', 'A memorial'],
    ['old_stone', 'An old stone'], ['wayside_shrine', 'A wayside shrine'], ['statue', 'A statue'], ['mural', 'Public art'], ['community_garden', 'A community garden'],
  ];
  for (const [cls, name] of labels) {
    const p = archivePlace('', cls, O, V);
    assert.equal(p?.name, name, cls);
    assert.equal(p?.generic, true, cls);
  }
  const lib = read([archivePlace('', 'public_bookcase', O, V)])[0];
  assert.equal(foundLine({ name: lib.name, category: lib.category, generic: lib.generic, kind: lib.kind }), 'Found: A little library');
  assert.equal(archivePlace('', 'church', O, V), null);
});

test('SP6: two unnamed small places of one type in one ~10 m cell are one place', async () => {
  await small();
  const f = (cls: string, p: LngLat, name = '') => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { name, class: cls, src: 'osm', id: 'x' } });
  const got = placesFromArchive([f('public_bookcase', at(0)), f('public_bookcase', at(1)), f('public_bookcase', at(40)), f('plaque', at(1))] as never, V);
  assert.deepEqual(got.map((p) => p.name).sort(), ['A little library', 'A little library', 'A plaque']);
});

test('SP7: on a fresh install the four History subsets are off; time capsules and little libraries are on', async () => {
  const { DEFAULT_OFF } = await small();
  const hidden = parseHidden(null, null);
  for (const k of ['plaques', 'small_memorials', 'old_stones', 'wayside_shrines']) assert.ok(hidden.has(k as Kind), k);
  for (const k of ['time_capsules', 'little_libraries']) assert.ok(!hidden.has(k as Kind), k);
  // XS6 (decision 0187) adds fountains, ghost towns, old trees and survey marks to the four.
  for (const k of ['old_stones', 'plaques', 'small_memorials', 'wayside_shrines']) assert.ok(DEFAULT_OFF.includes(k as Kind), k);
});

test('SP8: switches saved before the update get the same defaults; a parent off still hides its new subsets', async () => {
  await small();
  const before = KINDS.filter((k) => !['plaques', 'small_memorials', 'old_stones', 'wayside_shrines', 'time_capsules', 'little_libraries'].includes(k.id)).map((k) => k.id);
  const hidden = parseHidden(JSON.stringify(['curiosities']), JSON.stringify(before));
  assert.ok(hidden.has('plaques' as Kind));
  assert.ok(!hidden.has('little_libraries' as Kind));
  assert.equal(kindSwitch(hidden, 'time_capsules' as Kind).on, false, 'Curiosities off hides time capsules');
});

test('SP9: a subset switched on stays on; one switched off stays off', async () => {
  await small();
  const all = KINDS.map((k) => k.id);
  // The reader turned plaques on and little libraries off, then reloaded: `known` has every kind.
  const hidden = parseHidden(JSON.stringify(['little_libraries', 'small_memorials', 'old_stones', 'wayside_shrines']), JSON.stringify(all));
  assert.ok(!hidden.has('plaques' as Kind));
  assert.ok(hidden.has('little_libraries' as Kind));
});

test('SP10: a subset\'s row shows under its parent only while the parent is on, locked under a parent off', async () => {
  await small();
  const rows = kindRows(KINDS, new Set());
  const i = rows.findIndex((r) => (r.kind.id as string) === 'plaques');
  assert.ok(i > 0 && rows[i].depth === 1);
  assert.equal(rows.slice(0, i).reverse().find((r) => r.depth === 0)?.kind.id, 'monuments', 'under Monuments and memorials');
  assert.equal(KINDS.find((k) => (k.id as string) === 'plaques')?.label, 'Plaques', 'XS10: markers are their own row');
  assert.ok(!kindRows(KINDS, new Set(['monuments' as Kind])).some((r) => (r.kind.id as string) === 'plaques'));
  assert.deepEqual(kindSwitch(new Set(['monuments' as Kind]), 'plaques' as Kind), { on: false, locked: true });
});

test('SP11: an off subset shows no "?" on a walk, on the map or in "Waiting"; switched on, it does', async () => {
  await small();
  const plaque = read([archivePlace('Founders Plaque', 'plaque', at(20), V)])[0];
  const it = item(plaque);
  const shown = (hidden: Set<Kind>) => visibleMarks({ items: [it], here: O, rangeM: 100, found: new Set(), hidden, revealed: new Set() }).length;
  const off = parseHidden(null, null);
  assert.equal(shown(off), 0);
  assert.equal(shown(new Set()), 1);
  const mark = { ...it, markable: true } as unknown as AtlasMark;
  assert.equal(waitingMarks([mark], new Set(), O, off, { all: true }).length, 0);
  assert.equal(waitingMarks([mark], new Set(), O, new Set(), { all: true }).length, 1);
});

test('SP14: no small class weighs toward storefronts', async () => {
  await small();
  for (const cls of ['marker', 'small_memorial', 'old_stone', 'wayside_shrine', 'time_capsule', 'public_bookcase', 'community_garden']) {
    assert.ok(classesOfArchive(cls).length > 0, cls);
    assert.equal(storefrontWeight(classesOfArchive(cls)), 0, cls);
    assert.ok(!classesOfArchive(cls).some(isStorefront), cls);
  }
});

test('SP15: five plaques passed read "a few places", never a number', async () => {
  await small();
  const line = passedLine(Array.from({ length: 5 }, () => ({ name: 'A plaque', generic: true })));
  assert.equal(line, 'Passed a few places without stopping');
  assert.ok(!/\d/.test(line!));
});

test('SP16: the planner and scenic routes leave every small subset out, on or off', async () => {
  const { isSmallPlace } = await small();
  const places = read([archivePlace('Founders Plaque', 'marker', at(10), V), archivePlace('', 'public_bookcase', at(20), V), archivePlace('Old Church', 'church', at(30), V)]);
  assert.deepEqual(sightsFrom(places, new Set(), new Set()).map((s) => s.name), ['Old Church']);
  assert.ok(places.filter((p) => isSmallPlace(p)).length === 2);
});

test('SP18: a small place and a map-tile place of one name within 50 m are one place, the archive\'s', async () => {
  await small();
  const tile = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'attraction', subclass: 'attraction', name: 'Class of 1976 Time Capsule' }, zoom: 14 }] as never, 'b');
  const arch = [archivePlace('Class of 1976 Time Capsule', 'time_capsule', at(20), V)!];
  const merged = refineRead(mergePlaces(tile, arch), { archive: arch });
  assert.equal(merged.length, 1);
  assert.equal(kindOfName(merged, 'Class of 1976 Time Capsule'), 'time_capsules');
});

test('SP19: a community park near only small places stays a community park, with those subsets on or off', async () => {
  await small();
  const park = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'park', subclass: 'park', name: 'Elm Street Playground' }, zoom: 14 }] as never, 'b');
  const near = [archivePlace('In memory of Ann', 'small_memorial', at(30), V)!, archivePlace('', 'old_stone', at(80), V)!];
  const out = refineRead(mergePlaces(park, near), { archive: near });
  assert.equal(kindOfName(out, 'Elm Street Playground'), 'community_parks');
  // A full place (a statue) near it still keeps it a park.
  const statue = [archivePlace('Soldier', 'statue', at(30), V)!];
  assert.equal(kindOfName(refineRead(mergePlaces(park, statue), { archive: statue }), 'Elm Street Playground'), 'parks');
});

test('SP20: a museum and three plaques passed say the museum; small places only when nothing else was passed', async () => {
  await small();
  const places = read([
    archivePlace('Museum of the Revolution', 'museum', at(0, 10), V), archivePlace('A', 'marker', at(5, 10), V),
    archivePlace('B', 'marker', at(10, 10), V), archivePlace('C', 'marker', at(15, 10), V),
  ]);
  const items = places.map(item);
  const fixes = [{ at: O, t: 1 }];
  const passed = passedPlaces({ items, fixes, since: 0, hidden: new Set(), foundHere: new Set() });
  assert.deepEqual(passed.map((p) => p.name), ['Museum of the Revolution']);
  assert.equal(passedLine(passed), 'Passed Museum of the Revolution without stopping');
  const onlySmall = passedPlaces({ items: items.slice(1, 2), fixes, since: 0, hidden: new Set(), foundHere: new Set() });
  assert.deepEqual(onlySmall.map((p) => p.name), ['A']);
});

test('SP21: an area\'s unnamed finds of one type are one row named in the plural, with no number', async () => {
  const m = await small();
  const f = (name: string, generic: boolean) => ({ name, generic, category: 'history', at: O });
  assert.deepEqual(m.foundRows([f('A plaque', true), f('A plaque', true), f('Old North Church', false), f('A plaque', true), f('A plaque', true)]).map((r) => r.name), ['Plaques', 'Old North Church']);
  assert.deepEqual(m.foundRows([f('A plaque', true)]).map((r) => r.name), ['A plaque'], 'one is said as it is');
});

test('SP22: an unnamed small place reads with its article; two of one type as the plural', async () => {
  await small();
  assert.equal(passedLine([{ name: 'A plaque', generic: true }]), 'Passed a plaque without stopping');
  assert.equal(passedLine([{ name: 'A plaque', generic: true }, { name: 'A plaque', generic: true }]), 'Passed plaques without stopping');
  assert.equal(passedLine([{ name: 'A plaque', generic: true }, { name: 'A little library', generic: true }]), 'Passed a plaque and a little library without stopping');
});

test('SP17: the app pins chronicles-data\'s contract v3 (v4 since XS3, 0187), its classes exactly the archive table', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const sources = JSON.parse(readFileSync(join(__dirname, 'contract', 'sources.json'), 'utf8'));
  assert.ok(sources.contractVersion >= 3);
  for (const c of ['small_memorial', 'old_stone', 'wayside_shrine', 'time_capsule', 'public_bookcase', 'community_garden']) assert.ok(sources.classes.includes(c), c);
});

// The UI review's accepted findings (specs/small-places, UI review), each before its fix.
const explore = async () => ({ KINDS, kindHint });

test('small-places ui 1: the plaques row never wears an easel, which reads as art', async () => {
  const { KINDS: kinds } = await explore();
  assert.equal(kinds.find((k) => k.id === 'plaques')?.icon, 'document-text-outline');
});

test('small-places ui 2: a subset row tells a screen reader which kind it belongs to; a kind of its own says nothing', async () => {
  const { kindHint } = await explore();
  assert.equal(kindHint?.('plaques' as Kind), 'Part of Monuments and memorials');
  assert.equal(kindHint?.('community_parks' as Kind), 'Part of Parks and gardens');
  assert.equal(kindHint?.('monuments' as Kind), undefined);
});

test('small-places ui 3: the old stones row carries the words a find of it says', async () => {
  const { KINDS: kinds } = await explore();
  assert.match(kinds.find((k) => k.id === 'old_stones')?.label ?? '', /old stones/i);
});
