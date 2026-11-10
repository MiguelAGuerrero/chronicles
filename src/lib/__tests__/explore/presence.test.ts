/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_CODE, ringOf, rowCurrent } from '../../atlas/atlas';
import { archivePlace, placesFromArchive } from '../../discovery/archivePois';
import { MARKABLE_CLASSES, placesFromTilePois } from '../../discovery/tilePois';
import type { Place } from '../../discovery/types';
import { KINDS, parseHidden, type Kind } from '../../explore/explore';
import type { LngLat } from '../../types';

// Presence and kinds (PK1-PK7, PK11-PK14, PK16, PK18, PK19), written from specs/presence-and-kinds/spec.md before the code.

type Area = { name: string; at: LngLat; pois: [string, string, string, number, number][]; archive: [string, string, number, number, string][]; before?: { history: number; culture: number }; big?: boolean };
const load = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')) as { tiles: string; areas: Area[] };
const towns = load('./presenceTowns.json');
const town = (name: string) => towns.areas.find((a) => a.name === name)!;
const mapOf = (a: Area) => placesFromTilePois(a.pois.map(([name, cls, sub, lon, lat]) => ({ geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, class: cls, subclass: sub }, zoom: 14 })), towns.tiles);
const archiveOf = (a: Area) => placesFromArchive(a.archive.map(([name, cls, lon, lat]) => ({ geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, class: cls } })), 'fixture');
const stepsOf = (a: Area) => ringOf(mapOf(a), archiveOf(a), a.at).steps;

const O: LngLat = [-75.38, 40.62];
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const poi = (cls: string, sub: string, name: string, at: LngLat) => ({ geometry: { type: 'Point', coordinates: at }, properties: { class: cls, subclass: sub, name }, zoom: 14 });
const map = (...f: ReturnType<typeof poi>[]) => placesFromTilePois(f, 'b');
const one = (f: ReturnType<typeof poi>): Place => map(f)[0];

test('PK1: an archive museum lights History and Culture (Coplay, the Kilns)', () => {
  const coplay = town('Coplay');
  assert.ok(coplay.archive.some(([n, c]) => /Kilns/.test(n) && c === 'museum'), 'the fixture holds the Kilns as the archive holds them');
  const s = stepsOf(coplay);
  assert.ok(s.history >= 1, `Coplay's History is ${s.history}`);
  assert.ok(s.culture >= 1, `Coplay's Culture is ${s.culture}`);
});

test('PK2: a map museum whose name holds a notable word lights History too', () => {
  const s = ringOf(map(poi('museum', 'museum', 'Old Mill Museum', east(100))), null, O).steps;
  assert.equal(s.history, 1);
  assert.equal(s.culture, 1);
});

test('PK3: a plain museum lights Culture only', () => {
  const s = ringOf(map(poi('museum', 'museum', "Discovery Children's Museum", east(100)), poi('art_gallery', 'gallery', 'Riverside Gallery', east(200))), null, O).steps;
  assert.equal(s.history, 0, 'no word and no archive: not History');
  assert.equal(s.culture, 1);
});

test('PK4: a museum in the map and the archive is one place in each bar', () => {
  // Two museums, each held by both sources: counted once, History has two (one step) and Culture two (one step).
  // Counted twice, each bar would hold four: History two steps (4), Culture two steps (3).
  const tile = map(poi('museum', 'museum', 'Old Mill Museum', east(100)), poi('museum', 'museum', 'Historic Depot Museum', east(400)));
  const arch = [archivePlace('Old Mill Museum', 'museum', east(110), 'v'), archivePlace('Historic Depot Museum', 'museum', east(410), 'v')].filter((p): p is Place => !!p);
  const s = ringOf(tile, arch, O).steps;
  assert.equal(s.history, 1);
  assert.equal(s.culture, 1);
});

test('PK5: on the recorded sample, History and Culture are each lit without the other in one area in ten', () => {
  const sample = load('./presenceSample.json');
  assert.ok(sample.areas.length >= 150, `the sample holds ${sample.areas.length} areas`);
  const lit = sample.areas.map((a) => stepsOf(a));
  const h = lit.filter((s) => s.history > 0), c = lit.filter((s) => s.culture > 0);
  const hAlone = h.filter((s) => s.culture === 0).length, cAlone = c.filter((s) => s.history === 0).length;
  assert.ok(cAlone * 10 >= c.length, `Culture alone in ${cAlone} of ${c.length}`);
  assert.ok(hAlone * 10 >= h.length, `History alone in ${hAlone} of ${h.length}`);
});

test('PK6: Coplay, Galena and Andalusia show History with their museum lighting it; Philadelphia\'s Old City unchanged', () => {
  for (const [name, museum] of [['Coplay', /Kilns/], ['Galena', /Old Market House/], ['Andalusia', /Three Notch Museum/]] as const) {
    const a = town(name);
    assert.ok(stepsOf(a).history >= 1, `${name} shows History`);
    const own = archiveOf(a).filter((p) => museum.test(p.name));
    assert.equal(own.length, 1, `${name}'s museum is in the fixture`);
    assert.ok(ringOf([], own, a.at).steps.history >= 1, `${name}'s museum alone lights History`);
  }
  const city = town('Old City');
  const s = stepsOf(city);
  assert.deepEqual({ history: s.history, culture: s.culture }, city.before, 'the city reads as it did before the slice');
});

test('PK7: a row under an earlier code, any level, is read again', () => {
  assert.equal(rowCurrent({ build: 'b', code: ATLAS_CODE, level: 'neighborhood' }, 'b'), true);
  for (const level of ['neighborhood', 'town'] as const)
    for (const code of ['a4', 'a5', 'a6', 'a7']) assert.equal(rowCurrent({ build: 'b', code, level }, 'b'), false, `${level} row under ${code}`);
});

test('PK11: Community spaces is a kind in Culture, on by default, and on after an older saved choice', () => {
  const k = KINDS.find((x) => x.id === ('community' as Kind));
  assert.equal(k?.label, 'Community spaces');
  const arts = one(poi('art_gallery', 'arts_centre', 'Banana Factory', east(50)));
  assert.equal(arts.category, 'culture');
  assert.equal(arts.kind, 'community');
  assert.equal(parseHidden(null).has('community' as Kind), false, 'on with nothing saved');
  assert.equal(parseHidden(JSON.stringify(['theatres'])).has('community' as Kind), false, 'on after a choice saved before it existed');
});

test('PK18: a saved choice with Museums and galleries off leaves Community spaces off', () => {
  const parse = parseHidden;
  assert.equal(parse(JSON.stringify(['museums']), null).has('community' as Kind), true, 'saved before the kind: it follows Museums and galleries');
  const known = JSON.stringify(KINDS.map((x) => x.id));
  assert.equal(parse(JSON.stringify(['museums']), known).has('community' as Kind), false, 'saved since: the walker chose');
});

test('PK12: a plain community centre is not a place to find; a notable-named one is', () => {
  const plain = one(poi('town_hall', 'community_centre', 'Coplay Community Center', east(50)));
  assert.equal(plain?.category, 'culture', 'kept as a place of Culture');
  assert.equal(plain.markable, false);
  assert.equal(ringOf([plain], null, O).steps.culture, 0, 'it counts toward nothing (AG1)');
  const old = one(poi('town_hall', 'community_centre', 'Old Stone Meeting House', east(60)));
  assert.equal(old.markable, true);
  assert.equal(old.kind, 'community');
});

test('PK13: arts centres and libraries are Community spaces; museums and galleries stay', () => {
  assert.equal(one(poi('art_gallery', 'arts_centre', 'Banana Factory', east(10))).kind, 'community');
  assert.equal(one(poi('library', 'library', 'Old Library', east(20))).kind, 'community');
  assert.equal(one(poi('museum', 'museum', 'Kemerer Museum', east(30))).kind, 'museums');
  assert.equal(one(poi('art_gallery', 'gallery', 'Riverside Gallery', east(40))).kind, 'museums');
});

test('PK14: MARKABLE_CLASSES re-pinned with the community centre by name', () => {
  assert.deepEqual(
    [...new Set(MARKABLE_CLASSES.map((m) => `${m.cls}:${m.category}${m.byName ? ' (by name)' : ''}`))].sort(),
    [
      'aquarium:viewpoints', 'art_gallery:art', 'art_gallery:culture', 'attraction:viewpoints', 'castle:history',
      'cemetery:history (by name)', 'garden:parks', 'library:culture (by name)', 'monument:history', 'museum:culture',
      'park:parks', 'place_of_worship:history (by name)', 'theatre:culture', 'theme_park:viewpoints', 'town_hall:culture (by name)',
      'town_hall:history (by name)', 'zoo:viewpoints',
    ],
  );
});

test('PK16: no label, field or announcement names a listing or notability; Community spaces is plain', () => {
  const words = /\b(listed|listing|register|registry|historic|landmark|notable|notability|heritage|significan)/i;
  for (const k of KINDS) assert.ok(!words.test(k.label), `${k.label}`);
  assert.ok(KINDS.some((k) => k.label === 'Community spaces'));
  const museum = archivePlace('Coplay Cement Company Kilns', 'museum', east(0), 'v')!;
  for (const key of Object.keys(museum)) assert.ok(!/list|regist|notab|signif|heritage/i.test(key), `a museum carries no field ${key}`);
});

test('PK19: the pinned contract\'s notes name PK1 for the museum class', () => {
  const notes = readFileSync(new URL('./contract/README.md', import.meta.url), 'utf8');
  assert.match(notes, /PK1/);
  assert.match(notes, /museum/);
});
