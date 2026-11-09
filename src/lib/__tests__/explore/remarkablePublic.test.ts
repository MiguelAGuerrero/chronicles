/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { archivePlace } from '../../discovery/archivePois';
import { applyEdits, mergePlaces } from '../../discovery/archiveMerge';
import { isMarkable } from '../../discovery/noise';
import { categoryOfPoi, placesFromTilePois } from '../../discovery/tilePois';
import { KINDS } from '../../explore/explore';
import { reachLine, REACH_M, wayNear } from '../../explore/reach/rule';
import { createReach } from '../../explore/reach/shell';
import { fakePorts } from '../fakes';
import type { TileFeature } from '../../areas/tilePlaces';
import type { LngLat } from '../../types';
import fixture from './tilePoisSteelStacks.json';

// Remarkable and public (RP9-RP20, decision 0104): what the app does with listed places, attractions, the aviary and
// reachability. Written before the code, from specs/remarkable-and-public/spec.md.

const tile = fixture.features as unknown as (TileFeature & { zoom?: number })[];
const placesNow = () => placesFromTilePois(tile, fixture.build);
const poi = (cls: string, subclass: string, name: string, at: LngLat): TileFeature & { zoom?: number } =>
  ({ type: 'Feature', geometry: { type: 'Point', coordinates: at }, properties: { class: cls, subclass, name }, zoom: 14 } as unknown as TileFeature & { zoom?: number });
/** A module the slice adds, loaded by a path TypeScript doesn't resolve, so the test fails while it is missing. */
const later = (path: string): Promise<Record<string, unknown>> => import(String(path));

test('RP9: a listed church in the tiles with no notable word is one place to find, of the archive\'s kind', () => {
  const at: LngLat = [-75.3807, 40.6206];
  const tiles = placesFromTilePois([poi('place_of_worship', 'place_of_worship', 'Central Moravian Church', at)], 'b');
  assert.equal(tiles.length, 1);
  assert.equal(isMarkable(tiles[0]), false, 'today the name rule stops it (no word from notable.json)');
  const archived = archivePlace('Central Moravian Church', 'church', [at[0] + 0.0002, at[1]], 'v1');
  assert.ok(archived, 'church is an archive class');
  const merged = applyEdits(mergePlaces(tiles, [archived!]), { remove: [], add: [] }, 'v1');
  const found = merged.filter((p) => p.name === 'Central Moravian Church');
  assert.equal(found.length, 1, 'one place');
  assert.ok(isMarkable(found[0]));
  assert.equal(found[0].kind, 'churches');
});

/** String literals in the files under `dir` that a screen could show. */
function shownStrings(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...shownStrings(p));
    else if (/\.tsx?$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/(['"`])((?:(?!\1)[^\n\\])*)\1/g)) out.push(m[2]);
  }
  return out;
}

test('RP11: an archive point carries name, class, src and id only, and no copy names a listing', async () => {
  const { build } = await later('../../../../scripts/build-places-archive.mjs') as { build: (o: unknown) => { places: Record<string, unknown>[] } };
  const r = build({ items: [{ id: 'Q1', name: 'A Church', lon: -75.3, lat: 40.6, p31: ['Q16970'], listed: true, nhl: false }], region: 'us', version: '20261109' });
  assert.equal(r.places.length, 1, 'a listed church enters');
  assert.deepEqual(Object.keys(r.places[0]).sort(), ['class', 'id', 'lat', 'lon', 'name', 'src']);
  const root = join(__dirname, '..', '..', '..');
  const said = [...shownStrings(join(root, 'app')), ...shownStrings(join(root, 'components')), ...KINDS.map((k) => k.label)];
  const listing = said.filter((s) => /\b(National Register|listed building|listed place|heritage[- ]listed|landmark|NRHP)\b/i.test(s));
  assert.deepEqual(listing, [], 'no screen names a listing or a register');
});

test('RP13: every named attraction in the tiles is a place to find, SteelStacks among them', () => {
  const attractions = tile.filter((f) => f.properties?.class === 'attraction' && f.properties?.subclass === 'attraction' && f.properties?.name);
  assert.ok(attractions.length >= 1);
  const places = placesNow();
  for (const f of attractions) {
    const p = places.find((x) => x.name === f.properties!.name);
    assert.ok(p && isMarkable(p) && p.kind === 'viewpoints', `${f.properties!.name} is a place to find of Viewpoints and attractions`);
  }
  const steel = places.find((p) => p.name === 'SteelStacks');
  assert.ok(steel && isMarkable(steel));
  // Pinned with the slice: the kind's label says "attractions".
  assert.equal(KINDS.find((k) => k.id === 'viewpoints')?.label, 'Viewpoints and attractions');
  assert.ok(KINDS.some((k) => k.id === ('structures' as never)), 'the slice adds Buildings and structures beside it');
});

test('RP14: an attraction stays one place to find through the merge and the edits', () => {
  const tiles = placesNow();
  const steel = tiles.find((p) => p.name === 'SteelStacks')!;
  const listedNear = archivePlace('Bethlehem Steel Lehigh Plant Mill No. 2 Annex', 'heritage_building', [steel.at[0] + 0.0003, steel.at[1]], 'v1')!;
  assert.ok(listedNear, 'a listed building beside it is an archive place');
  const merged = applyEdits(mergePlaces(tiles, [listedNear]), { remove: [], add: [] }, 'v1');
  assert.equal(merged.filter((p) => p.name === 'SteelStacks' && isMarkable(p)).length, 1);
  assert.equal(listedNear.kind, 'structures');
  const struck = applyEdits(merged, { remove: [{ name: 'SteelStacks', at: steel.at }], add: [] }, 'v1');
  assert.equal(struck.filter((p) => p.name === 'SteelStacks').length, 0, 'only the owner\'s remove takes it away');
});

test('RP15: the National Aviary (zoo/aviary) is a place to find', () => {
  assert.equal(categoryOfPoi('zoo', 'aviary'), 'viewpoints');
  const aviary = placesNow().find((p) => p.name === 'National Aviary');
  assert.ok(aviary && isMarkable(aviary) && aviary.kind === 'viewpoints');
});

test('RP16: a lodging place in the tiles is never a place to find', () => {
  assert.ok(tile.some((f) => f.properties?.class === 'lodging' && f.properties?.name === 'Historic Hotel Bethlehem'));
  assert.equal(categoryOfPoi('lodging', 'hotel'), null);
  assert.ok(!placesNow().some((p) => /Hotel/.test(p.name) && isMarkable(p)));
  // Pinned with the slice: the aviary is the only new markable class.
  assert.equal(categoryOfPoi('zoo', 'aviary'), 'viewpoints');
});

test('RP18: no kind\'s label names a register or significance, and Buildings and structures is a kind', () => {
  for (const k of KINDS) assert.ok(!/\b(landmark|notable|listed|remarkable|register|significant)\b/i.test(k.label), k.label);
  const s = KINDS.find((k) => k.id === ('structures' as never));
  assert.equal(s?.label, 'Buildings and structures');
  assert.ok(KINDS.findIndex((k) => k.id === ('structures' as never)) === KINDS.findIndex((k) => k.id === 'monuments') + 1, 'after Monuments and ruins');
});

test('RP20: a place with no street or path within 60 m is said, never filtered; with nothing cached around it, nothing is said', async () => {
  assert.equal(REACH_M, 60);
  const mLon = 1 / (111320 * Math.cos((40.61 * Math.PI) / 180));
  const mLat = 1 / 110540;
  const O: LngLat = [-75.366, 40.6145];
  const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
  // A street as the cache holds it: pieces a few metres long, so each lies in its own z14 tile (audit 7).
  const street = Array.from({ length: 21 }, (_, i) => at(-200 + i * 20, 0));
  assert.equal(wayNear(at(0, 30), [street]), true);
  assert.equal(wayNear(at(0, 100), [street]), false, 'no street or path within 60 m');
  assert.equal(wayNear(at(0, 400), [street]), null, 'nothing within 300 m: nothing cached there, so nothing is said');
  assert.equal(wayNear(at(0, 30), []), null);
  assert.equal(reachLine(false), 'No street or path close by');
  assert.equal(reachLine(true), null);
  assert.equal(reachLine(null), null, 'nothing cached is never said as far');
  // The shell reads the segments the reads cached; it never removes the place (said, never filtered).
  const { db } = fakePorts();
  await db.putSegments([{ id: 's1', name: 'East 1st Street', kind_detail: 'residential', length_m: 400, geometry: [street], build: 'b' }]);
  const r = createReach({ db });
  assert.equal(await r.near(at(0, 30)), true);
  assert.equal(await r.near(at(0, 100)), false);
  assert.equal(await r.near(at(0, 2000)), null);
});

// Remarkable and public, the audit (Nov 9): regression tests, each written before its fix.

test('remarkable-and-public audit 5: a listed cemetery 120 m from the tiles\' same-named one is one place to find', () => {
  const tiles = placesFromTilePois([poi('cemetery', 'cemetery', 'Nisky Hill Cemetery', [-75.3725, 40.6235])], 'b');
  const gate: LngLat = [-75.3725 + 120 / 84400, 40.6235];
  const archived = archivePlace('Nisky Hill Cemetery', 'cemetery', gate, 'v1')!;
  const merged = mergePlaces(tiles, [archived]);
  assert.equal(merged.filter((p) => p.name === 'Nisky Hill Cemetery').length, 1, 'same name, same category, within 200 m (the owner, Nov 9)');
  const far = archivePlace('Nisky Hill Cemetery', 'cemetery', [-75.3725 + 250 / 84400, 40.6235], 'v1')!;
  assert.equal(mergePlaces(tiles, [far]).filter((p) => p.name === 'Nisky Hill Cemetery').length, 2, 'past 200 m they are two');
  const otherKind = archivePlace('Nisky Hill Cemetery', 'museum', gate, 'v1')!;
  assert.equal(mergePlaces(tiles, [otherKind]).filter((p) => p.name === 'Nisky Hill Cemetery').length, 2, 'another category merges only within 50 m');
});

test('remarkable-and-public audit 6: a later tap\'s reach line is never replaced by an earlier tap\'s answer', async () => {
  const waits: ((v: never[]) => void)[] = [];
  const db = { getSegmentsIn: () => new Promise<never[]>((r) => waits.push(r)) };
  const r = createReach({ db } as never) as unknown as { ask?: (key: string, at: LngLat, answer: (a: { key: string; near: boolean | null }) => void) => void };
  assert.equal(typeof r.ask, 'function', 'the shell answers only the latest ask');
  const got: string[] = [];
  r.ask!('A', [-75.3, 40.6], (a) => got.push(a.key));
  r.ask!('B', [-75.3, 40.6], (a) => got.push(a.key));
  waits[1]([]);
  await new Promise((x) => setTimeout(x, 0));
  waits[0]([]);
  await new Promise((x) => setTimeout(x, 0));
  assert.deepEqual(got, ['B'], 'A answered last and is dropped');
});

test('remarkable-and-public audit 7: with the tile beside a place unread, a place by its tile edge says nothing', () => {
  // z14 tile 4770/6158's west edge, at Bethlehem: a place 20 m inside it, its street 30 m west in the unread tile.
  const n = 2 ** 14;
  const edgeLon = (4770 / n) * 360 - 180;
  const lat = 40.6145;
  const m = 1 / (111320 * Math.cos((lat * Math.PI) / 180));
  const place: LngLat = [edgeLon + 20 * m, lat];
  const farInTile = [[edgeLon + 200 * m, lat - 0.002], [edgeLon + 200 * m, lat + 0.002]] as LngLat[];
  assert.equal(wayNear(place, [farInTile]), null, 'the disc reaches an unread tile: nothing is said');
  const westStreet = [[edgeLon - 30 * m, lat - 0.002], [edgeLon - 30 * m, lat + 0.002]] as LngLat[];
  assert.equal(wayNear(place, [farInTile, westStreet]), true);
});
