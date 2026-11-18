/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presenceTally, ringOf, stepsShown } from '../../atlas/atlas';
import { archivePlace } from '../../discovery/archivePois';
import { mergePlaces } from '../../discovery/archiveMerge';
import { barsOf } from '../../discovery/bars';
import { kindRows, refineRead } from '../../discovery/refinements';
import { SUBTYPES } from '../../discovery/subtypes';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Place } from '../../discovery/types';
import { foundLine, KINDS, parseHidden } from '../../explore/explore';
import { PRESENCE_CODE } from '../../presence/presence';
import type { LngLat } from '../../types';

// The more-attractions audit (specs/more-attractions, Audit record; decision 0198, the owner's calls of Nov 18).

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261118';
const read = (places: (Place | null)[]) => refineRead(places.filter((p): p is Place => !!p), { archive: [] });
const one = (cls: string, name = 'X', p: LngLat = O) => read([archivePlace(name, cls, p, V)])[0];
const tile = (cls: string, subclass: string, name: string, p: LngLat = O) =>
  read(placesFromTilePois([{ geometry: { type: 'Point', coordinates: p }, properties: { class: cls, subclass, name }, zoom: 14 }] as never, 'b'));
const label = (id: string) => KINDS.find((k) => k.id === id)?.label;

test('more-attractions audit 1: every amusement, theme or water park is one row, "Amusement parks", under "Zoos and aquariums"', () => {
  assert.equal(label('attractions'), 'Zoos and aquariums', 'the zoos kind is named for zoos and aquariums again');
  const row = SUBTYPES.find((s) => s.parent === 'attractions');
  assert.ok(row, 'a subtype under the zoos kind');
  assert.equal(row?.label, 'Amusement parks');
  assert.equal(row?.on, true, 'on by default (the owner, Nov 18: "Own row, on")');
  assert.equal(row?.small, false);
  assert.equal(kindRows(KINDS, new Set()).find((r) => r.kind.id === row?.kind)?.depth, 1);
  const kind = row!.kind;
  // Whichever source holds it: the archive's amusement_park, the map's theme_park, a water park.
  assert.equal(one('amusement_park', 'Dorney Park')?.kind, kind, 'the archive');
  assert.equal(tile('theme_park', 'theme_park', 'Dorney Park')[0]?.kind, kind, 'the map\'s theme park');
  assert.equal(tile('water_park', 'water_park', 'Wildwater Kingdom')[0]?.kind, kind, 'a water park as its own poi class');
  assert.equal(tile('swimming', 'water_park', 'Wildwater Kingdom')[0]?.kind, kind, 'a water park under another class');
  // One switch hides every such park; zoos stay.
  const hidden = new Set([kind]);
  const bars = (p: Place[]) => stepsShown({ steps: {} as never, tally: presenceTally(ringOf(p, null, O).ring, O) } as never, hidden).viewpoints;
  assert.equal(bars([archivePlace('Dorney Park', 'amusement_park', at(0, 40), V)!]), 0, 'the archive park is off');
  assert.equal(bars(placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0, 40) }, properties: { class: 'theme_park', subclass: 'theme_park', name: 'Dorney Park' }, zoom: 14 }] as never, 'b')), 0, 'the map park is off');
  // An archive park and a tile park of the same place are one place, of one kind.
  const t = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'theme_park', subclass: 'theme_park', name: 'Dorney Park' }, zoom: 14 }] as never, 'b');
  const merged = read(mergePlaces(t, [archivePlace('Dorney Park', 'amusement_park', at(10), V)!]));
  assert.equal(merged.length, 1, 'one place');
  assert.equal(merged[0].kind, kind);
  // A reader with Viewpoints off before (theme parks were under it) or zoos off keeps every park off.
  const knewBefore = JSON.stringify(KINDS.map((k) => k.id).filter((k) => k !== kind));
  assert.ok(parseHidden(JSON.stringify(['viewpoints']), knewBefore).has(kind), 'Viewpoints off keeps theme parks off');
  assert.ok(parseHidden(JSON.stringify(['attractions']), knewBefore).has(kind), 'zoos off keeps amusement parks off');
  assert.ok(!parseHidden(JSON.stringify([]), knewBefore).has(kind), 'a reader with both on sees them');
  assert.ok(!parseHidden(null, null).has(kind), 'on for a new reader');
  assert.ok(!parseHidden(JSON.stringify(['viewpoints']), JSON.stringify(KINDS.map((k) => k.id))).has(kind), 'a reader who has seen the row keeps their own choice');
  // The found line of an aquarium names zoos and aquariums, never amusement parks.
  const aq = tile('aquarium', 'aquarium', 'Adventure Aquarium')[0];
  assert.equal(foundLine({ name: aq.name, category: aq.category, generic: false, kind: aq.kind }), 'Found: Adventure Aquarium · Zoos and aquariums');
  // p9 for audits 1-3; p10 since typed bridges (MA10), nothing carried.
  assert.equal(PRESENCE_CODE, 'p10');
});

test('more-attractions audit 2: a museum by type never lights History, whatever its name; a map museum keeps PK2\'s name rule', () => {
  for (const name of ['Bucks County Historical Museum', 'Old Jail Museum', 'Old Corner Museum']) {
    assert.deepEqual(barsOf(one('museum_by_type', name)), ['culture'], name);
  }
  assert.deepEqual(barsOf(tile('museum', 'museum', 'Old Jail Museum')[0]), ['culture', 'history'], 'the map\'s museum by a historic name');
  assert.deepEqual(barsOf(one('museum', 'Mid-Atlantic Air Museum')), ['culture', 'history'], 'a listed museum');
});

test('more-attractions audit 3: an unlisted pier keeps its row but adds nothing to the History bar', () => {
  const p = one('pier', 'Steel Pier', at(0, 40));
  assert.equal(p?.kind, 'piers');
  const piers = [archivePlace('Steel Pier', 'pier', at(0, 40), V)!, archivePlace('Central Pier', 'pier', at(30, 40), V)!, archivePlace('North Pier', 'pier', at(60, 40), V)!];
  const tally = presenceTally(ringOf(piers, null, O).ring, O);
  assert.equal(stepsShown({ steps: {} as never, tally } as never, new Set()).history, 0, 'piers on, History unlit');
});

test('more-attractions audit 4: Nature reserves sits after Community gardens under Parks and gardens', () => {
  const ids = KINDS.map((k) => k.id as string);
  assert.equal(ids.indexOf('nature_reserves'), ids.indexOf('community_gardens') + 1);
});

test('more-attractions audit 5: Nature reserves wears binoculars, and no other row does', () => {
  assert.equal(KINDS.find((k) => k.id === 'nature_reserves')?.icon, 'binoculars-outline');
  assert.equal(KINDS.filter((k) => k.icon === 'binoculars-outline').length, 1);
});

test('more-attractions audit 7: an unnamed pier, nature reserve, amusement park or museum by type is no place', () => {
  for (const cls of ['pier', 'nature_reserve', 'amusement_park', 'museum_by_type']) {
    assert.ok(archivePlace('Named', cls, O, V), `${cls} named is a place`);
    assert.equal(archivePlace('', cls, O, V), null, cls);
  }
});

test('more-attractions audit 18: a natural national monument is a Natural monuments place under Nature, never History', () => {
  // The owner, Nov 18: "Own subtype under Nature". Contract v7's `natural_monument` (Devils Tower, Muir Woods, Jewel Cave).
  const p = one('natural_monument', 'Devils Tower National Monument');
  assert.equal(p?.category, 'parks');
  assert.equal(p?.kind, 'natural_monuments');
  assert.deepEqual(barsOf(p), ['parks'], 'what Nature lights, never History');
  assert.ok(!p?.classes?.includes('recorded'), 'held for its type, never a listing');
  const row = SUBTYPES.find((s) => s.kind === 'natural_monuments');
  assert.equal(row?.parent, 'nature');
  assert.equal(row?.label, 'Natural monuments');
  assert.equal(row?.on, true);
  assert.equal(row?.small, false);
  assert.equal(kindRows(KINDS, new Set()).find((r) => r.kind.id === 'natural_monuments')?.depth, 1);
  const icon = KINDS.find((k) => k.id === 'natural_monuments')?.icon;
  assert.ok(icon && icon !== 'ellipse-outline', 'an icon of its own');
  assert.equal(KINDS.filter((k) => k.icon === icon).length, 1, 'no other row wears it');
  assert.ok(!parseHidden(null, null).has(row!.kind), 'on for a new reader');
});
