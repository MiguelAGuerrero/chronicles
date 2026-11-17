/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as atlasModule from '../../atlas/atlas';
import { ringOf, waitingMarks, type AtlasMark } from '../../atlas/atlas';
import { archivePlace, placesFromArchive } from '../../discovery/archivePois';
import { mergePlaces } from '../../discovery/archiveMerge';
import { kindRows, kindSwitch, refineRead } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Kind, Place } from '../../discovery/types';
import { findFor, foundLine, KINDS, kindHint, parseHidden, passedLine, passedPlaces, visibleMarks, type ChecklistItem } from '../../explore/explore';
import { sightsFrom } from '../../nav/scenicSignals';
import { ARCHIVE_CLASS_NAMES, classesOfArchive, classesOfOsm, isStorefront } from '../../presence/presence';
import type { LngLat } from '../../types';

// Explore subtypes (specs/explore-subtypes, XS1-XS28; decision 0191), written from the spec before the code. The new
// module loads by a path TypeScript doesn't resolve, so a todo runs before it exists.

type Subtypes = {
  SUBTYPES: readonly { kind: Kind; parent: Kind; label: string; plural: string; single: string | null; on: boolean; small: boolean }[];
  DEFAULT_OFF: readonly Kind[];
  isSmallPlace: (p: Pick<Place, 'classes'>) => boolean;
  foundRows: <T extends { name: string; generic?: boolean }>(finds: readonly T[]) => T[];
};
const sub = async () => (await import(String('../../discovery/subtypes'))) as Subtypes;

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261117';
const read = (places: (Place | null)[]) => refineRead(places.filter((p): p is Place => !!p), { archive: [] });
const one = (cls: string, name = 'X', p: LngLat = O) => read([archivePlace(name, cls, p, V)])[0];
const item = (p: Place): ChecklistItem => ({ key: p.key, area_key: 'a', name: p.name, category: p.category, kind: p.kind!, at: p.at, generic: p.generic });
const tile = (cls: string, subclass: string, name: string, p: LngLat = O) =>
  placesFromTilePois([{ geometry: { type: 'Point', coordinates: p }, properties: { class: cls, subclass, name }, zoom: 14 }] as never, 'b');
const K = (s: string) => s as Kind;

/** The plan's tree (specs/explore-subtypes/plan.md): archive class → [category, kind]. */
const TREE: [string, string, string][] = [
  ['statue', 'art', 'statues'], ['mural', 'art', 'murals'], ['fountain', 'art', 'fountains'], ['sign', 'art', 'signs'], ['sculpture', 'art', 'public_art'],
  ['marker', 'history', 'markers'], ['plaque', 'history', 'plaques'], ['war_memorial', 'history', 'war_memorials'],
  ['small_memorial', 'history', 'small_memorials'], ['battlefield', 'history', 'battlefields'], ['archaeological_site', 'history', 'archaeological_sites'],
  ['monument', 'history', 'monuments'], ['bridge', 'history', 'bridges'], ['mill', 'history', 'mills'], ['station', 'history', 'stations'],
  ['lighthouse', 'history', 'lighthouses'], ['civic_building', 'history', 'civic_buildings'], ['fort', 'history', 'forts'],
  ['water_tower', 'history', 'towers'], ['clock_tower', 'history', 'towers'], ['historic_machine', 'history', 'old_machines'],
  ['tavern', 'history', 'taverns'], ['old_stone', 'history', 'old_stones'], ['building_structure', 'history', 'structures'],
  ['church', 'history', 'churches'], ['wayside_shrine', 'history', 'wayside_shrines'], ['cemetery', 'history', 'cemeteries'], ['mausoleum', 'history', 'mausoleums'],
  ['garden', 'parks', 'gardens'], ['community_garden', 'parks', 'community_gardens'],
  ['waterfall', 'parks', 'waterfalls'], ['cave', 'parks', 'caves'], ['hot_spring', 'parks', 'hot_springs'], ['old_tree', 'parks', 'old_trees'],
  ['museum', 'culture', 'museums'], ['observatory', 'culture', 'observatories'], ['theatre', 'culture', 'theatres'], ['concert_hall', 'culture', 'concert_halls'],
  ['public_bookcase', 'culture', 'little_libraries'], ['carousel', 'culture', 'carousels'],
  ['overlook', 'viewpoints', 'viewpoints'], ['tower', 'viewpoints', 'viewpoints'], ['fire_tower', 'viewpoints', 'fire_towers'], ['zoo', 'viewpoints', 'attractions'],
  ['odd_engineering', 'viewpoints', 'curiosities'], ['ruin', 'viewpoints', 'old_ruins'], ['ghost_town', 'viewpoints', 'ghost_towns'],
  ['natural_oddity', 'viewpoints', 'natural_oddities'], ['roadside_giant', 'viewpoints', 'roadside_giants'], ['folly', 'viewpoints', 'roadside_giants'],
  ['marks_a_fact', 'viewpoints', 'survey_marks'], ['time_capsule', 'viewpoints', 'time_capsules'],
  // More attractions (decision 0197).
  ['nature_reserve', 'parks', 'nature_reserves'], ['pier', 'history', 'piers'], ['amusement_park', 'viewpoints', 'attractions'], ['museum_by_type', 'culture', 'museums'],
];

test('XS1: a waterfall, a covered bridge, a fountain and a carousel from the archive show within range and a capture beside each finds it', async () => {
  await sub();
  for (const [cls, name] of [['waterfall', 'Bushkill Falls'], ['bridge', 'Knox Covered Bridge'], ['fountain', 'Plaza Fountain'], ['carousel', 'Park Carousel']]) {
    const p = one(cls, name, at(40));
    const it = item(p);
    const shown = visibleMarks({ items: [it], here: O, rangeM: 100, found: new Set(), hidden: new Set(), revealed: new Set() });
    assert.equal(shown.length, 1, cls);
    assert.equal(findFor(at(30), [it], new Set())?.name, name, cls);
    // A named find says its kind after it, as every named find has since PC16.
    assert.equal(foundLine({ name, category: p.category, generic: false, kind: p.kind }), `Found: ${name} · ${KINDS.find((k) => k.id === p.kind)?.label}`);
  }
});

test('XS3: each archive class of contract v4 maps to one category, kind and subtype, pinned; the app pins contract v4', async () => {
  await sub();
  for (const [cls, category, kind] of TREE) {
    const p = one(cls);
    assert.equal(p?.category, category, cls);
    assert.equal(p?.kind, kind, cls);
    assert.equal(p?.markable, true, `${cls} is a place to find`);
  }
  const sources = JSON.parse(readFileSync(join(__dirname, 'contract', 'sources.json'), 'utf8'));
  assert.ok(sources.contractVersion >= 4, 'v4 or later (v6 since more attractions)');
  assert.deepEqual([...ARCHIVE_CLASS_NAMES].sort(), [...sources.classes].sort());
});

test('XS4: two new kinds, Nature and Zoos and aquariums (audit 12); the map\'s attractions stay with Viewpoints and attractions', async () => {
  await sub();
  const label = (id: string) => KINDS.find((k) => k.id === id)?.label;
  assert.equal(label('nature'), 'Nature');
  // Decision 0197 (the owner, Nov 17): amusement parks joined zoos and aquariums.
  assert.equal(label('attractions'), 'Zoos and amusement parks');
  assert.equal(label('viewpoints'), 'Viewpoints and attractions');
  for (const k of ['waterfalls', 'caves', 'hot_springs', 'old_trees']) assert.equal(kindRows(KINDS, new Set()).find((r) => r.kind.id === k)?.depth, 1, k);
  assert.equal(tile('zoo', 'zoo', 'City Zoo')[0]?.kind, 'attractions');
  assert.equal(tile('zoo', 'petting_zoo', 'Farm Zoo')[0]?.kind, 'attractions');
  assert.equal(tile('aquarium', 'aquarium', 'Aquarium')[0]?.kind, 'attractions');
  assert.equal(tile('attraction', 'attraction', 'SteelStacks')[0]?.kind, 'viewpoints');
  assert.equal(tile('attraction', 'viewpoint', 'Lookout')[0]?.kind, 'viewpoints');
});

test('XS5: a subtype row shows indented under its kind only while the kind is on, locked under a kind off', async () => {
  const { SUBTYPES } = await sub();
  const rows = kindRows(KINDS, new Set());
  for (const s of SUBTYPES) {
    const i = rows.findIndex((r) => r.kind.id === s.kind);
    assert.ok(i > 0 && rows[i].depth >= 1, s.kind);
    assert.ok(!kindRows(KINDS, new Set([s.parent])).some((r) => r.kind.id === s.kind), `${s.kind} hides with ${s.parent}`);
    assert.deepEqual(kindSwitch(new Set([s.parent]), s.kind), { on: false, locked: true });
  }
});

test('XS6: a fresh install starts the small things and ghost towns off, everything else on', async () => {
  const { DEFAULT_OFF } = await sub();
  const OFF = ['plaques', 'small_memorials', 'old_stones', 'wayside_shrines', 'ghost_towns', 'fountains', 'old_trees', 'survey_marks'];
  assert.deepEqual([...DEFAULT_OFF].sort(), [...OFF].sort());
  const hidden = parseHidden(null, null);
  for (const k of KINDS) assert.equal(hidden.has(k.id), OFF.includes(k.id), k.id);
});

test('XS7: saved switches keep their meaning after the update', async () => {
  await sub();
  const before = ['public_art', 'museums', 'theatres', 'community', 'little_libraries', 'monuments', 'plaques', 'small_memorials', 'structures', 'old_stones', 'churches', 'wayside_shrines', 'cemeteries', 'parks', 'community_parks', 'viewpoints', 'curiosities', 'time_capsules'];
  // Viewpoints and attractions was off: zoos stay off under the new kind.
  const h = parseHidden(JSON.stringify(['viewpoints', 'small_memorials', 'old_stones', 'wayside_shrines']), JSON.stringify(before));
  assert.ok(h.has(K('attractions')));
  assert.ok(h.has(K('ghost_towns')), 'starts off until seen');
  assert.ok(!h.has(K('plaques')), 'a reader who turned plaques on keeps them on');
  // A kind off hides its new subtypes.
  assert.equal(kindSwitch(parseHidden(JSON.stringify(['structures']), JSON.stringify(before)), K('bridges')).on, false);
});

test('XS8: a subtype switched on or off stays so after a reload', async () => {
  await sub();
  const all = KINDS.map((k) => k.id);
  const h = parseHidden(JSON.stringify(['bridges']), JSON.stringify(all));
  assert.ok(h.has(K('bridges')));
  assert.ok(!h.has(K('ghost_towns')), 'switched on, stays on');
});

test('XS9: an off subtype shows no "?" on a walk, on the map or in "Waiting"', async () => {
  await sub();
  const p = one('ghost_town', 'Centralia', at(20));
  const it = item(p);
  const shown = (hidden: Set<Kind>) => visibleMarks({ items: [it], here: O, rangeM: 100, found: new Set(), hidden, revealed: new Set() }).length;
  assert.equal(shown(parseHidden(null, null)), 0);
  assert.equal(shown(new Set()), 1);
  const mark = { ...it, markable: true } as unknown as AtlasMark;
  assert.equal(waitingMarks([mark], new Set(), O, parseHidden(null, null), { all: true }).length, 0);
});

test('XS10: a historical marker is in Historical markers (on); an OSM plaque in Plaques (off)', async () => {
  await sub();
  assert.equal(one('marker', 'Bethlehem Steel Historical Marker').kind, 'markers');
  assert.equal(one('plaque', 'Blue plaque').kind, 'plaques');
  const hidden = parseHidden(null, null);
  assert.ok(!hidden.has(K('markers')));
  assert.ok(hidden.has(K('plaques')));
  assert.equal(KINDS.find((k) => k.id === 'plaques')?.label, 'Plaques');
});

test('XS11: statues and busts are Public art; a map artwork stays Public art itself', async () => {
  await sub();
  assert.equal(one('statue', 'Soldier').category, 'art');
  assert.equal(one('statue', 'Soldier').kind, 'statues');
  assert.equal(tile('art_gallery', 'artwork', 'Untitled')[0]?.kind, 'public_art');
});

test('XS12: ruins are one subtype whatever the source; a castle stays a monument', async () => {
  await sub();
  assert.equal(one('ruin', 'Old Furnace').kind, 'old_ruins');
  assert.equal(read(tile('castle', 'ruins', 'Fort Ruins'))[0]?.kind, 'old_ruins');
  assert.equal(read(tile('castle', 'castle', 'Castle Hill'))[0]?.kind, 'monuments');
});

test('XS13: an unnamed place is named by its type, said once when found', async () => {
  await sub();
  const labels: [string, string][] = [
    ['fountain', 'A fountain'], ['waterfall', 'A waterfall'], ['lighthouse', 'A lighthouse'], ['war_memorial', 'A war memorial'], ['mill', 'A mill'],
    ['historic_machine', 'An old machine'], ['hot_spring', 'A hot spring'], ['old_tree', 'An old tree'], ['carousel', 'A carousel'], ['plaque', 'A plaque'],
  ];
  for (const [cls, name] of labels) {
    const p = archivePlace('', cls, O, V);
    assert.equal(p?.name, name, cls);
    assert.equal(p?.generic, true, cls);
  }
  for (const cls of ['water_tower', 'cave', 'bridge', 'garden']) assert.equal(archivePlace('', cls, O, V), null, cls);
  const f = one('fountain', '');
  assert.equal(foundLine({ name: 'A fountain', category: f?.category ?? 'art', generic: true, kind: K('fountains') }), 'Found: A fountain');
});

test('XS14: an unnamed archive statue and an unnamed map artwork within 20 m are one place, the archive\'s', async () => {
  await sub();
  const t = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'art_gallery', subclass: 'artwork' }, zoom: 14 }] as never, 'b');
  const a = [archivePlace('', 'statue', at(12), V)!];
  const merged = read(mergePlaces(t, a));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].kind, 'statues');
});

test('XS15: bars weigh each subtype by the size of the stop, only while it is on', async () => {
  await sub();
  const { presenceTally, stepsShown } = atlasModule;
  const bridges = Array.from({ length: 2 }, (_, i) => archivePlace(`Bridge ${i}`, 'bridge', at(i * 30, 40), V)!);
  const tally = presenceTally(ringOf(bridges, null, O).ring, O);
  const profile = { steps: { history: 0 }, tally } as never;
  assert.ok(stepsShown(profile, new Set()).history >= 1, 'bridges on');
  assert.equal(stepsShown(profile, new Set([K('bridges')])).history, 0, 'bridges off');
});

test('XS16: only a concert hall, an observatory, a zoo and a tavern of the new classes are storefronts', async () => {
  await sub();
  const NEW = ['fountain', 'sign', 'plaque', 'war_memorial', 'battlefield', 'archaeological_site', 'bridge', 'mill', 'station', 'lighthouse', 'civic_building', 'fort', 'water_tower', 'clock_tower', 'tavern', 'historic_machine', 'mausoleum', 'garden', 'waterfall', 'cave', 'hot_spring', 'old_tree', 'concert_hall', 'observatory', 'carousel', 'zoo', 'fire_tower', 'ghost_town'];
  const front = NEW.filter((c) => classesOfArchive(c).some(isStorefront));
  assert.deepEqual(front.sort(), ['concert_hall', 'observatory', 'tavern', 'zoo']);
});

test('XS17: the planner and scenic routes treat a new subtype as its kind; small subtypes and unnamed places stay out', async () => {
  const { isSmallPlace } = await sub();
  const places = read([archivePlace('Covered Bridge', 'bridge', at(10), V), archivePlace('Bushkill Falls', 'waterfall', at(20), V), archivePlace('', 'waterfall', at(30), V), archivePlace('Town Fountain', 'fountain', at(40), V), archivePlace('Marker', 'marker', at(50), V)]);
  assert.deepEqual(sightsFrom(places, new Set(), new Set()).map((s) => s.name).sort(), ['Bushkill Falls', 'Covered Bridge']);
  assert.ok(!isSmallPlace(places[0]));
  assert.ok(isSmallPlace(places[3]) && isSmallPlace(places[4]));
});

test('XS18: a museum and three historical markers passed say the museum', async () => {
  await sub();
  const places = read([archivePlace('Museum of the Revolution', 'museum', at(0, 10), V), archivePlace('A Marker', 'marker', at(5, 10), V), archivePlace('B Marker', 'marker', at(10, 10), V), archivePlace('C Marker', 'marker', at(15, 10), V)]);
  const passed = passedPlaces({ items: places.map(item), fixes: [{ at: O, t: 1 }], since: 0, hidden: new Set(), foundHere: new Set() });
  assert.equal(passedLine(passed), 'Passed Museum of the Revolution without stopping');
});

test('XS19: no subtype row, heading or label carries a number', async () => {
  const { SUBTYPES } = await sub();
  for (const k of KINDS) assert.doesNotMatch(`${k.label} ${kindHint(k.id) ?? ''}`, /\d/, k.id);
  for (const s of SUBTYPES) assert.doesNotMatch(`${s.plural} ${s.single ?? ''}`, /\d/, s.kind);
});

test('XS20: every subtype resolves from a class or a tile class; none needs a fetch of its own', async () => {
  const { SUBTYPES } = await sub();
  const fromArchive = new Set(TREE.map(([, , kind]) => kind));
  for (const s of SUBTYPES) assert.ok(fromArchive.has(s.kind) || s.kind === 'community_parks', `${s.kind} has a class`);
});

test('XS21: springs, dams, drinking fountains, benches and give boxes are never places', async () => {
  await sub();
  for (const cls of ['spring', 'dam', 'drinking_water', 'bench', 'give_box']) assert.deepEqual(classesOfArchive(cls), [], cls);
  assert.equal(tile('drinking_water', 'drinking_water', 'Tap').length, 0);
  assert.deepEqual(classesOfOsm('fountain', 'fountain').filter((c) => c !== 'none'), []);
});

test('XS25: no label names significance', async () => {
  const { SUBTYPES } = await sub();
  // "Historical markers" is what the signs are called, not a credential; the other words name significance (0110).
  const words = /notable|remarkable|champion|landmark|listed|wonder|famous/i;
  assert.equal(KINDS.find((k) => k.id === 'taverns')?.label, 'Old taverns and inns', 'never "Historic taverns"');
  for (const k of KINDS) assert.doesNotMatch(k.label, words, k.id);
  for (const s of SUBTYPES) assert.doesNotMatch(`${s.label} ${s.plural} ${s.single ?? ''}`, words, s.kind);
});

test('XS26: three unnamed fountains found are one Found row; two passed read in the plural', async () => {
  const { foundRows, SUBTYPES } = await sub();
  const f = (name: string) => ({ name, generic: true, category: 'art', at: O });
  assert.deepEqual(foundRows([f('A fountain'), f('A fountain'), f('A fountain')]).map((r) => r.name), ['Fountains']);
  assert.equal(passedLine([{ name: 'A fountain', generic: true }, { name: 'A fountain', generic: true }]), 'Passed fountains without stopping');
  for (const s of SUBTYPES.filter((x) => x.single)) assert.ok(s.plural.length > 0, s.kind);
});

test('XS27: an unnamed water tower is no place', async () => {
  await sub();
  assert.equal(archivePlace('', 'water_tower', O, V), null);
  assert.equal(archivePlace('Old Water Tower', 'water_tower', O, V)?.name, 'Old Water Tower');
});

test('XS28: an artistic fountain is Public art and shows with Fountains off; a plain fountain only with Fountains on', async () => {
  await sub();
  const art = one('sculpture', 'Swann Memorial Fountain', at(20));
  const plain = one('fountain', 'Plaza Fountain', at(30));
  const off = parseHidden(null, null);
  const shown = (p: Place) => visibleMarks({ items: [item(p)], here: O, rangeM: 100, found: new Set(), hidden: off, revealed: new Set() }).length;
  assert.equal(shown(art), 1);
  assert.equal(shown(plain), 0);
  // The archive's own split: a fountain that is art comes as `sculpture` (data ST5).
  assert.equal(placesFromArchive([{ type: 'Feature', geometry: { type: 'Point', coordinates: O }, properties: { name: 'Swann', class: 'sculpture', src: 'wd', id: 'p' } }] as never, V)[0]?.kind, 'public_art');
});

// The cold find (decision 0167, Nov 17): icons that read as something else in this app or in general.
test('explore-subtypes ui 1: no subtype wears an icon that reads as Settings, your trace, danger or another row\'s tool', () => {
  const icon = (id: string) => KINDS.find((k) => k.id === id)?.icon;
  assert.notEqual(icon('mills'), 'cog-outline', 'a gear reads as Settings');
  assert.notEqual(icon('ghost_towns'), 'footsteps-outline', 'footsteps read as your own walks in a walking app (audit 8: the name the app uses)');
  assert.notEqual(icon('old_ruins'), 'skull-outline', 'a skull reads as danger or death');
  assert.notEqual(icon('lighthouses'), 'flashlight-outline', 'a flashlight reads as a pen or a hammer beside Archaeological sites');
});

// The audit (Nov 17, specs/explore-subtypes "Audit"): each accepted finding's regression test, before its fix.
const pf = (props: Record<string, unknown>, p: LngLat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: props });

test('explore-subtypes audit 1: on a v3 pack an OpenStreetMap `marker` is a plaque, off by default, never an on Marker', () => {
  const [osm] = placesFromArchive([pf({ name: '', class: 'marker', src: 'osm', id: 'p1' }, O)] as never, V);
  const [wd] = placesFromArchive([pf({ name: 'Bethlehem Steel Historical Marker', class: 'marker', src: 'wd', id: 'p2' }, at(50))] as never, V);
  assert.equal(read([osm])[0].kind, 'plaques');
  assert.equal(osm.name, 'A plaque');
  assert.equal(read([wd])[0].kind, 'markers');
  assert.ok(parseHidden(null, null).has(K('plaques')));
});

test('explore-subtypes audit 3: an unnamed map artwork beside an unnamed archive fountain stays shown; only artworks merge', () => {
  const t = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'art_gallery', subclass: 'artwork' }, zoom: 14 }] as never, 'b');
  const merged = read(mergePlaces(t, [archivePlace('', 'fountain', at(12), V)!]));
  assert.deepEqual(merged.map((p) => p.name).sort(), ['A fountain', 'Public art']);
});

test('explore-subtypes audit 4: a found unnamed artwork merged into an archive statue stays found', async () => {
  const { keepFindKeys } = await import('../../discovery/archiveMerge');
  const t = placesFromTilePois([{ geometry: { type: 'Point', coordinates: at(0) }, properties: { class: 'art_gallery', subclass: 'artwork' }, zoom: 14 }] as never, 'b');
  const merged = mergePlaces(t, [archivePlace('', 'statue', at(12), V)!]);
  const kept = keepFindKeys(merged, [{ key: t[0].key, name: 'Public art', at: t[0].at, generic: true } as never]);
  assert.deepEqual(kept.map((p) => p.key), [t[0].key]);
});

test('explore-subtypes audit 5: Monuments or Plaques and markers off before the update keeps statues and markers off', () => {
  const before = ['public_art', 'museums', 'theatres', 'community', 'little_libraries', 'monuments', 'plaques', 'small_memorials', 'structures', 'old_stones', 'churches', 'wayside_shrines', 'cemeteries', 'parks', 'community_parks', 'viewpoints', 'curiosities', 'time_capsules'];
  const mon = parseHidden(JSON.stringify(['monuments', 'plaques', 'small_memorials', 'old_stones', 'wayside_shrines']), JSON.stringify(before));
  assert.ok(mon.has(K('statues')) && mon.has(K('markers')));
  const plq = parseHidden(JSON.stringify(['plaques', 'small_memorials', 'old_stones', 'wayside_shrines']), JSON.stringify(before));
  assert.ok(plq.has(K('markers')), 'Plaques and markers off keeps markers off');
  assert.ok(!plq.has(K('statues')));
  const on = parseHidden(JSON.stringify(['small_memorials', 'old_stones', 'wayside_shrines']), JSON.stringify(before));
  assert.ok(!on.has(K('markers')) && !on.has(K('statues')));
});

test('explore-subtypes audit 6: an unnamed map viewpoint is still a scenic Sight; an unnamed subtype place is not', () => {
  const vp = read(tile('attraction', 'viewpoint', ''));
  const statue = read([archivePlace('', 'statue', at(30), V)]);
  assert.deepEqual(sightsFrom([...vp, ...statue], new Set(), new Set()).map((s) => s.name), ['A viewpoint']);
});

test('explore-subtypes audit 7: an area row shows the bars of the subtypes switched on, whichever list it comes from', async () => {
  const { presenceTally, rowsShown } = atlasModule as typeof atlasModule & { rowsShown: (rows: unknown[], hidden: Set<Kind>) => { profile: { steps: Record<string, number> } }[] };
  const bridges = Array.from({ length: 2 }, (_, i) => archivePlace(`Bridge ${i}`, 'bridge', at(i * 30, 40), V)!);
  const tally = presenceTally(ringOf(bridges, null, O).ring, O);
  const row = { key: 't', profile: { steps: { history: 0 }, tally } };
  assert.ok(rowsShown([row], new Set())[0].profile.steps.history >= 1);
  assert.equal(rowsShown([row], new Set([K('bridges')]))[0].profile.steps.history, 0);
});

test('explore-subtypes audit 8: ghost towns wear no icon the app uses for walks', () => {
  assert.notEqual(KINDS.find((k) => k.id === 'ghost_towns')?.icon, 'footsteps-outline');
});

test('explore-subtypes audit 9: a zoo\'s enclosures are not places of their own', () => {
  assert.equal(tile('zoo', 'enclosure', 'Lion House').length, 0);
});

test('explore-subtypes audit 10: the replay folds unnamed finds of one type', async () => {
  const { replayFound } = (await import('../../explore/explore')) as unknown as { replayFound: (f: { name: string; generic: boolean }[]) => string | null };
  assert.equal(replayFound([{ name: 'A statue', generic: true }, { name: 'A statue', generic: true }]), 'Found Statues');
});

test('explore-subtypes audit 11: unnamed murals and sculptures fold into one "Public art" row and read once in a passed line', async () => {
  const { foundRows } = await sub();
  const f = (name: string) => ({ name, generic: true, category: 'art', at: O });
  assert.deepEqual(foundRows([f('Public art'), f('Public art'), f('Public art')]).map((r) => r.name), ['Public art']);
  assert.equal(passedLine([{ name: 'Public art', generic: true }, { name: 'Public art', generic: true }]), 'Passed public art without stopping');
});

test('explore-subtypes audit 12: zoos and aquariums are a kind named for what they are; the map\'s attractions stay with Viewpoints', () => {
  // Decision 0197 (the owner, Nov 17): amusement parks joined zoos and aquariums; still named for what they are.
  assert.equal(KINDS.find((k) => k.id === 'attractions')?.label, 'Zoos and amusement parks');
  assert.equal(tile('zoo', 'zoo', 'City Zoo')[0]?.kind, 'attractions');
  assert.equal(tile('attraction', 'attraction', 'SteelStacks')[0]?.kind, 'viewpoints');
  assert.equal(tile('theme_park', 'theme_park', 'Dorney Park')[0]?.kind, 'viewpoints');
  assert.equal(KINDS.find((k) => k.id === 'viewpoints')?.label, 'Viewpoints and attractions');
});

test('explore-subtypes audit 13: a marker weighs a quarter in a bar, as a plaque does', async () => {
  const { barWeight } = await import('../../presence/presence');
  assert.equal(barWeight(classesOfArchive('marker')), 0.25);
});

test('explore-subtypes audit 14: taverns read "Old taverns" in a sentence', async () => {
  const { SUBTYPES } = await sub();
  assert.equal(SUBTYPES.find((s) => s.kind === 'taverns')?.plural, 'Old taverns');
});
