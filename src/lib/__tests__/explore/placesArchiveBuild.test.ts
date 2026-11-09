/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import { writeArchive } from '../../../../scripts/places-archive/archive.mjs';
import { ALL_CLASS_IDS, CLASSES, classify, gone, keep } from '../../../../scripts/places-archive/classify.mjs';
import { build } from '../../../../scripts/build-places-archive.mjs';
import { cellQuery, cellsFor, itemsFrom, splitCell } from '../../../../scripts/places-archive/fetch-wikidata.mjs';
import { decide } from '../../../../scripts/places-archive/publish.mjs';
import { ARCHIVE_CLASSES } from '../../discovery/archivePois';

// Places worth the stop: the build script's archive writer (PW14), written from the spec before the code.

/** pmtiles' own reader over bytes in memory, as the app reads them over the network. */
const memory = (buf: Uint8Array): Source => ({
  getKey: () => 'memory',
  getBytes: async (offset: number, length: number): Promise<RangeResponse> => ({ data: buf.slice(offset, offset + length).buffer }),
});

const place = (name: string, lon: number, lat: number, cls = 'folly') => ({ name, lon, lat, class: cls, src: 'wd', id: `Q${name.length}${Math.round(lon * 1000)}` });

async function featuresAt(buf: Uint8Array, z: number, x: number, y: number) {
  const t = await new PMTiles(memory(buf)).getZxy(z, x, y);
  if (!t) return [];
  const layer = new VectorTile(new PbfReader(new Uint8Array(t.data))).layers.places;
  return Array.from({ length: layer?.length ?? 0 }, (_, i) => {
    const f = layer!.feature(i).toGeoJSON(x, y, z);
    return { geometry: f.geometry, properties: (f.properties ?? {}) as Record<string, unknown> };
  });
}

test('PW14: the archive is the same bytes each time, and the app\'s reader finds each place in its z12 tile', async () => {
  const places = [place('Bushkill Folly', -75.2, 40.7), place('Odd Rock', -75.19, 40.69, 'natural_oddity')];
  const a = writeArchive(places);
  const b = writeArchive([...places].reverse());
  assert.deepEqual(Buffer.from(a), Buffer.from(b), 'the same bytes, whatever order the inputs came in');
  const header = await new PMTiles(memory(a)).getHeader();
  assert.deepEqual([header.minZoom, header.maxZoom, header.tileType, header.clustered], [12, 12, 1, true]);
  const z = 12;
  const n = 2 ** z;
  const x = Math.floor(((-75.2 + 180) / 360) * n);
  const r = (40.7 * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  const got = await featuresAt(a, z, x, y);
  const names = got.map((f) => f.properties.name).sort();
  assert.deepEqual(names, ['Bushkill Folly', 'Odd Rock']);
  const folly = got.find((f) => f.properties.name === 'Bushkill Folly')!;
  assert.deepEqual(Object.keys(folly.properties).sort(), ['class', 'id', 'name', 'src'], 'PW7: nothing else rides along');
  const [lon, lat] = (folly.geometry as { coordinates: number[] }).coordinates;
  assert.ok(Math.abs(lon + 75.2) < 0.0002 && Math.abs(lat - 40.7) < 0.0002, `within a few metres (${lon}, ${lat})`);
});

test('PW14: the root directory always fits in the reader\'s first read; leaf directories hold the rest, and every tile is found', async () => {
  // Places scattered over the US, as real ones are: their tile ids compress poorly, so the root alone won't fit.
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const places = Array.from({ length: 80000 }, (_, i) => place(`P${i}`, -124 + rand() * 57, 25 + rand() * 24));
  const us = await new PMTiles(memory(writeArchive(places))).getHeader();
  assert.ok(us.rootDirectoryOffset + us.rootDirectoryLength <= 16384, 'a US-sized root fits in the 16 KB first read');
  // A smaller first read forces leaf directories, so the path a larger archive takes is read for real.
  const buf = writeArchive(places, { firstRead: 2048 });
  const header = await new PMTiles(memory(buf)).getHeader();
  assert.ok(header.rootDirectoryOffset + header.rootDirectoryLength <= 2048, 'the root fits the smaller read');
  assert.ok((header.leafDirectoryLength ?? 0) > 0, 'leaf directories hold the rest');
  for (const i of [0, 12345, 79999]) {
    const p = places[i];
    const n = 2 ** 12;
    const x = Math.floor(((p.lon + 180) / 360) * n);
    const r = (p.lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
    assert.ok((await featuresAt(buf, 12, x, y)).some((f) => f.properties.name === p.name), `tile of ${p.name}`);
  }
});

const item = (o: Partial<{ p31: string[]; heritage: boolean; nhl: boolean; article: boolean; dissolved: boolean; closed: boolean; states: string[]; name: string; lon: number; lat: number }>) =>
  ({ p31: [], heritage: false, nhl: false, article: false, dissolved: false, closed: false, states: [], name: 'X', lon: -75.19, lat: 40.69, ...o });
const DISTRICT = 'Q15243209';
const FOLLY = 'Q180174';
const STATUE = 'Q179700';
const MURAL = 'Q219423';
const OVERLOOK = 'Q6017969';
const HOUSE = 'Q3947';

test('PW6: type decides, in a fixed order of pinned Wikidata classes, never age or listing', () => {
  assert.equal(classify(item({ p31: [FOLLY], heritage: true })), 'folly', 'a listed century-old folly is a curiosity');
  assert.equal(classify(item({ p31: [HOUSE], heritage: true, nhl: true })), 'heritage_building', 'a National Historic Landmark house is history');
  assert.equal(classify(item({ p31: [HOUSE], heritage: true, article: true })), null, 'an article is no sign: nearly every listing has one (the owner, Nov 6: landmarks only)');
  assert.equal(classify(item({ p31: [HOUSE], heritage: true })), null, 'a plain listing is left out (the owner, Nov 6)');
  assert.equal(classify(item({ p31: [DISTRICT], heritage: true, nhl: true, article: true })), null, 'a historic district is an area, never a place');
  assert.equal(classify(item({ p31: [HOUSE] })), null, 'an unlisted ordinary house is left out');
  assert.equal(classify(item({ p31: [STATUE, FOLLY] })), 'statue', 'it commemorates: a monument first');
  assert.equal(classify(item({ p31: [MURAL, OVERLOOK] })), 'mural', 'made as art, before a viewpoint');
  assert.equal(classify(item({ p31: [OVERLOOK, FOLLY] })), 'overlook', 'you go there to look out, before an odd class');
  for (const cls of Object.keys(CLASSES)) assert.ok(cls in ARCHIVE_CLASSES, `${cls} is in the app's pinned table (PW5)`);
  assert.ok(Object.values(CLASSES).every((ids: unknown) => (ids as string[]).every((q) => /^Q\d+$/.test(q))), 'fixed lists of Wikidata classes, never a judgment at run time');
});

test('PW7: a place enters with a class and a location, and only while its sources say it still exists', () => {
  assert.equal(keep(item({ p31: [FOLLY] })), 'folly', 'a Wikidata entry with a location is enough');
  assert.equal(keep(item({ p31: [FOLLY], lon: Number.NaN })), null, 'no location: left out');
  assert.equal(keep(item({ p31: [HOUSE] })), null, 'no class from the table: a signal alone never admits a place');
  assert.equal(gone(item({ dissolved: true }), 'folly'), true, 'demolished, dissolved or abolished (P576)');
  assert.equal(gone(item({ closed: true }), 'odd_engineering'), false, 'closed is not gone: a decommissioned lighthouse still stands (places-worth-the-stop audit 6)');
  assert.equal(gone(item({ dissolved: true }), 'ruin'), false, 'a ghost town\'s abolished date: the ruins still stand (audit 6)');
  assert.equal(gone(item({ states: ['demolished'] })), true);
  assert.equal(gone(item({ states: ['destroyed by fire'] })), true);
  assert.equal(gone(item({ states: ['abandoned'] })), false, 'an abandoned place still exists and stays');
  assert.equal(gone(item({ states: ['ruins'] })), false, 'so does a ruin');
  assert.equal(keep(item({ p31: [FOLLY], dissolved: true })), null);
});

test('PW14, PW7, PW13: the build turns Wikidata items (and, if given, OSM tags) into one region\'s archive, the same bytes each time', async () => {
  const items = [
    { id: 'Q1', name: 'Bushkill Folly', lon: -75.2, lat: 40.7, p31: [FOLLY] },
    { id: 'Q2', name: 'Gone Tower', lon: -75.21, lat: 40.71, p31: ['Q1440300'] },
    { id: 'Q3', name: 'Old House', lon: -75.22, lat: 40.72, p31: [HOUSE] },
    { id: 'Q4', name: 'Unwanted Statue', lon: -75.23, lat: 40.73, p31: [STATUE] },
  ];
  const osm = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-75.21, 40.71] }, properties: { wikidata: 'Q2', 'demolished:man_made': 'tower' } }] };
  const edits = { remove: [{ name: 'Unwanted Statue', at: [-75.23, 40.73] }], add: [{ name: 'Giant Peanut', at: [-75.18, 40.69], class: 'roadside_giant' }] };
  const a = build({ items, osm, edits, region: 'us', version: '20261108' });
  const b = build({ items: [...items].reverse(), osm, edits, region: 'us', version: '20261108' });
  assert.equal(a.file, 'places-us-20261108.pmtiles');
  assert.deepEqual(Buffer.from(a.bytes), Buffer.from(b.bytes));
  assert.deepEqual(a.places.map((p: { name: string; class: string }) => `${p.name}:${p.class}`).sort(), ['Bushkill Folly:folly', 'Giant Peanut:roadside_giant'],
    'the tower OSM says is demolished, the unlisted house and the removed statue are left out; the owner\'s add is in');
  const noOsm = build({ items, region: 'us', version: '20261108' });
  assert.ok(noOsm.places.some((p: { name: string }) => p.name === 'Gone Tower'), 'without OSM, Wikidata alone decides');
});

test('PW14, PW7: the fetch asks each US cell for the pinned classes and heritage places, and never for a count', () => {
  const q = cellQuery([-76, 40, -75, 41]);
  for (const id of ALL_CLASS_IDS) assert.ok(q.includes(`wd:${id}`), id);
  assert.match(q, /wdt:P1435 wd:Q624232/, 'Landmarks (places-worth-the-stop audit 5)');
  assert.ok(!/wdt:P649/.test(q), 'listings by their designation, never by the register\'s reference number (RP10 amends audit 5: listings are asked for)');
  assert.match(q, /wdt:P17 wd:Q30/, 'in the US');
  assert.match(q, /cornerSouthWest "Point\(-76 40\)"/);
  assert.match(q, /wdt:P576/);
  assert.match(q, /wdt:P3999/);
  assert.ok(!/sitelinks|schema:about|wikipedia|pageviews|COUNT/i.test(q), 'nothing about articles or popularity is ever asked for (PW7)');
  assert.ok(cellsFor([[-125, 24, -66, 50]], 2).length > 300, 'the conterminous US in 2-degree cells');
  assert.deepEqual(splitCell([-76, 40, -74, 42]), [[-76, 40, -75, 41], [-75, 40, -74, 41], [-76, 41, -75, 42], [-75, 41, -74, 42]]);
});

test('PW14: the fetch\'s rows become one item each, with its classes, listing and whether it is gone', () => {
  const b = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
  const items = itemsFrom([
    b({ item: 'http://www.wikidata.org/entity/Q1', label: 'Folly', coord: 'Point(-75.2 40.7)', p31: 'http://www.wikidata.org/entity/Q180174' }),
    b({ item: 'http://www.wikidata.org/entity/Q1', label: 'Folly', coord: 'Point(-75.2 40.7)', p31: 'http://www.wikidata.org/entity/Q3947', nhl: 'true' }),
    b({ item: 'http://www.wikidata.org/entity/Q2', label: 'Old Mill', coord: 'Point(-75.3 40.8)', p31: 'http://www.wikidata.org/entity/Q44494', dissolved: '1950-01-01', stateLabel: 'demolished' }),
  ]);
  assert.deepEqual(items, [
    { id: 'Q1', name: 'Folly', lon: -75.2, lat: 40.7, p31: ['Q180174', 'Q3947'], listed: false, nhl: true, dissolved: false, closed: false, states: [] },
    { id: 'Q2', name: 'Old Mill', lon: -75.3, lat: 40.8, p31: ['Q44494'], listed: false, nhl: false, dissolved: true, closed: false, states: ['demolished'] },
  ]);
});

test('PW15: no place in the archive is taken from OpenStreetMap (it only corroborates), so the map\'s own credit, which names it, stands', () => {
  const osm = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [-75.2, 40.7] }, properties: { wikidata: 'Q1', man_made: 'lighthouse' } }] };
  const r = build({ items: [{ id: 'Q1', name: 'Light', lon: -75.2, lat: 40.7, p31: ['Q39715'] }], osm, edits: { remove: [], add: [{ name: 'Mine', at: [-75.1, 40.6], class: 'folly' }] }, region: 'us', version: '20261108' });
  assert.deepEqual([...new Set(r.places.map((p: { src: string }) => p.src))].sort(), ['owner', 'wd']);
});

test('PW19: the weekly build publishes only when the archive changed, and a failed build publishes nothing', () => {
  const manifest = { schema: 1, regions: [{ id: 'us', current: { file: 'places-us-20261101.pmtiles', version: '20261101', sha256: 'aaa', bounds: [-125, 24, -66, 50] } }] };
  assert.deepEqual(decide({ region: 'us', sha256: 'aaa', manifest }), { publish: false, reason: 'unchanged' });
  assert.deepEqual(decide({ region: 'us', sha256: 'bbb', manifest }), { publish: true, reason: 'changed' });
  assert.deepEqual(decide({ region: 'us', sha256: 'bbb', manifest: { schema: 1, regions: [] } }), { publish: true, reason: 'new region' });
  assert.deepEqual(decide({ region: 'us', sha256: 'bbb', manifest: null }), { publish: true, reason: 'no manifest yet' });
  assert.deepEqual(decide({ region: 'us', sha256: null, manifest }), { publish: false, reason: 'no archive built' });
  assert.deepEqual(decide({ region: 'us', sha256: 'bbb', manifest: null, unreachable: true }), { publish: false, reason: 'manifest unreachable' }, 'places-worth-the-stop audit 7: one network error publishes nothing');
});

// Remarkable and public (RP1-RP12, decision 0104): a listed place enters when remarkable and public. Written before
// the code, from specs/remarkable-and-public/spec.md. Class ids checked against Wikidata on Nov 9.
const Q = {
  church: 'Q16970', cemetery: 'Q39614', roadBridge: 'Q537127', gristmill: 'Q623605', station: 'Q55488',
  house: 'Q3947', building: 'Q41176', schoolBuilding: 'Q1244442', office: 'Q1021645', bank: 'Q18761864', hotel: 'Q27686',
  museum: 'Q33506', houseMuseum: 'Q2087181', theatre: 'Q24354', district: 'Q15243209', statue: 'Q179700', lighthouse: 'Q39715',
};
let n = 0;
const listed = (name: string, p31: string[], o: { nhl?: boolean; listed?: boolean } = {}) =>
  ({ id: `Q9${++n}`, name, lon: -75.37 + n * 0.001, lat: 40.61, p31, listed: o.listed ?? true, nhl: o.nhl ?? false });
const osmFor = (...tagged: [{ id: string; lon: number; lat: number }, Record<string, string>][]) =>
  ({ type: 'FeatureCollection', features: tagged.map(([it, tags]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [it.lon, it.lat] }, properties: { wikidata: it.id, ...tags } })) });
const built = (items: ReturnType<typeof listed>[], osm: unknown = null, extra: Record<string, unknown> = {}) =>
  build({ items, osm, region: 'us', version: '20261109', ...extra } as Parameters<typeof build>[0]);
const names = (r: { places: { name: string }[] }) => r.places.map((p) => p.name).sort();
const classOf = (r: { places: { name: string; class: string }[] }, name: string) => r.places.find((p) => p.name === name)?.class;

test('RP1: a listed church, cemetery, bridge, mill and station enter by their type', () => {
  const r = built([
    listed('Central Moravian Church', [Q.church]),
    listed('Nisky Hill Cemetery', [Q.cemetery]),
    listed('Northampton Street Bridge', [Q.roadBridge]),
    listed('Bushkill Gristmill', [Q.gristmill]),
    listed('Mauch Chunk Station', [Q.station]),
  ]);
  assert.deepEqual(names(r), ['Bushkill Gristmill', 'Central Moravian Church', 'Mauch Chunk Station', 'Nisky Hill Cemetery', 'Northampton Street Bridge']);
});

test('RP2: a listed house or building enters only when a museum type or its OSM tags show it open; historic=building is no sign', () => {
  const trout = listed('Trout Hall', [Q.house]);
  const burnside = listed('Burnside Plantation', [Q.building]);
  const plain = listed('Gauff-Roth House', [Q.house]);
  const gem = listed('Gemeinhaus', [Q.building, Q.houseMuseum]);
  const r = built([trout, burnside, plain, gem], osmFor([trout, { tourism: 'museum' }], [burnside, { tourism: 'attraction' }], [plain, { historic: 'building' }]));
  assert.deepEqual(names(r), ['Burnside Plantation', 'Gemeinhaus', 'Trout Hall']);
});

test('RP3: a listed house, school, office, bank, hotel or bare building with no open sign and no Landmark stays out', () => {
  const r = built([
    listed('Kistler Residence', [Q.house]),
    listed('Liberty High School', [Q.schoolBuilding]),
    listed('Farr Building', [Q.office]),
    listed('Allentown National Bank', [Q.bank]),
    listed('Hotel Sterling', [Q.hotel]),
    listed('Dime Savings and Trust Company', [Q.building]),
    listed('Old Mill, unlisted', [Q.gristmill], { listed: false }),
  ]);
  assert.deepEqual(names(r), []);
});

test('RP4: a National Historic Landmark enters whatever its type, a private house included', () => {
  const r = built([listed('Private Landmark House', [Q.house], { nhl: true, listed: false }), listed('Landmark Office', [Q.office], { nhl: true })]);
  assert.deepEqual(names(r), ['Landmark Office', 'Private Landmark House']);
});

test('RP5: access=private or access=no keeps a place out, a Landmark too', () => {
  const estate = listed('Gated Landmark Estate', [Q.house], { nhl: true });
  const chapel = listed('Closed Chapel', [Q.church]);
  const open = listed('Open Church', [Q.church]);
  const r = built([estate, chapel, open], osmFor([estate, { access: 'private' }], [chapel, { access: 'no' }], [open, { access: 'yes' }]));
  assert.deepEqual(names(r), ['Open Church']);
});

test('RP6: a historic district never enters, a Landmark too', () => {
  const r = built([listed('Historic Moravian Bethlehem Historic District', [Q.district], { nhl: true }), listed('A Church', [Q.church])]);
  assert.deepEqual(names(r), ['A Church']);
});

test('RP7: OSM joins only by its wikidata tag, and every place comes from Wikidata or the owner (extends PW15\'s test)', () => {
  const house = listed('Kistler Residence', [Q.house]);
  const church = listed('A Church', [Q.church]);
  // A museum tag on an element with no wikidata tag, at the house's very spot, says nothing about the house.
  const osm = { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [house.lon, house.lat] }, properties: { tourism: 'museum', name: 'Kistler Residence' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-75.1, 40.5] }, properties: { historic: 'monument', name: 'OSM-only Monument' } },
  ] };
  const r = built([house, church], osm);
  assert.deepEqual(names(r), ['A Church']);
  assert.deepEqual([...new Set(r.places.map((p: { src: string }) => p.src))], ['wd']);
});

test('RP8: listed places take their kind by type, and 0103\'s classes keep theirs', () => {
  const r = built([
    listed('A Church', [Q.church]), listed('A Cemetery', [Q.cemetery]), listed('State Theatre', [Q.theatre]),
    listed('A Museum', [Q.museum]), listed('A Bridge', [Q.roadBridge]), listed('Washington Grays Monument', [Q.statue]),
    listed('A Lighthouse', [Q.lighthouse]),
  ]);
  assert.equal(classOf(r, 'A Church'), 'church');
  assert.equal(classOf(r, 'A Cemetery'), 'cemetery');
  assert.equal(classOf(r, 'State Theatre'), 'theatre');
  assert.equal(classOf(r, 'A Museum'), 'museum');
  assert.equal(classOf(r, 'A Bridge'), 'heritage_building');
  assert.equal(classOf(r, 'Washington Grays Monument'), 'statue', 'a listing never changes the class 0103 gave');
  assert.equal(classOf(r, 'A Lighthouse'), 'odd_engineering');
  const kinds = ARCHIVE_CLASSES as Record<string, readonly [string, string]>;
  assert.deepEqual(kinds.church, ['history', 'churches']);
  assert.deepEqual(kinds.cemetery, ['history', 'cemeteries']);
  assert.deepEqual(kinds.theatre, ['culture', 'theatres']);
  assert.deepEqual(kinds.museum, ['culture', 'museums']);
  assert.deepEqual(kinds.heritage_building, ['history', 'structures'], 'Buildings and structures (the owner, Nov 9)');
});

test('RP10: the fetch asks for National Register listings and Landmarks, never for popularity', () => {
  const q = cellQuery([-76, 40, -75, 41]);
  assert.match(q, /ps:P1435 wd:Q19558910/, 'National Register listings (the owner, Nov 9; ended ones left out since audit 13)');
  assert.match(q, /wdt:P1435 wd:Q624232/, 'and Landmarks');
  assert.ok(!/sitelinks|schema:about|wikipedia|pageviews|COUNT/i.test(q));
  const b = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
  const [it] = itemsFrom([b({ item: 'http://www.wikidata.org/entity/Q1', label: 'A Church', coord: 'Point(-75.2 40.7)', p31: 'http://www.wikidata.org/entity/Q16970', listed: 'true' })]);
  assert.equal((it as { listed?: boolean }).listed, true);
});

test('RP12: the build writes a review per area beside the archive, and an owner\'s remove leaves the place out', () => {
  const church = listed('A Church', [Q.church]);
  const trout = listed('Trout Hall', [Q.house]);
  const landmark = listed('Landmark House', [Q.house], { nhl: true });
  const items = [church, trout, landmark];
  const osm = osmFor([trout, { tourism: 'museum' }]);
  const areas = [{ name: 'Bethlehem', bbox: [-75.5, 40.5, -75.2, 40.7] }];
  const r = built(items, osm, { review: areas }) as unknown as { bytes: Uint8Array; review?: { areas: { name: string; places: { name: string; class: string; reason: string }[] }[]; region: Record<string, number> } };
  const plain = built(items, osm);
  assert.deepEqual(Buffer.from(r.bytes), Buffer.from(plain.bytes), 'the review is never inside the archive');
  const reasons = Object.fromEntries((r.review?.areas[0].places ?? []).map((p) => [p.name, p.reason]));
  assert.deepEqual(reasons, { 'A Church': 'public type', 'Trout Hall': 'shown open', 'Landmark House': 'landmark' });
  assert.ok(r.review && Object.keys(r.review.region).length > 0, 'and a summary for the whole region, by class and reason');
  const struck = built(items, osm, { edits: { remove: [{ name: 'A Church', at: [church.lon, church.lat] }], add: [] } });
  assert.ok(!names(struck).includes('A Church'));
});

// Remarkable and public, the audit (Nov 9): regression tests, each written before its fix.
const laterMod = (path: string): Promise<Record<string, unknown>> => import(String(path));

test('remarkable-and-public audit 1: a listed courthouse, town hall, city hall and library enter by their type; a home never does', async () => {
  const r = built([
    listed('Old Lehigh County Courthouse', ['Q1137809']), listed('Easton Town Hall', ['Q543654']), listed('Bethlehem City Hall', ['Q25550691']),
    listed('Easton Area Public Library', ['Q28564']), listed('Dimmick Memorial Library', ['Q7075']),
  ]);
  assert.deepEqual(names(r), ['Bethlehem City Hall', 'Dimmick Memorial Library', 'Easton Area Public Library', 'Easton Town Hall', 'Old Lehigh County Courthouse']);
  const { groupsFrom } = await laterMod('../../../../scripts/places-archive/pin-types.mjs') as { groupsFrom: (c: Record<string, string[]>) => Record<string, string[]> };
  // A rectory is a house and a church's; a courthouse is a government building, an office building's subclass.
  const g = groupsFrom({ Q16970: ['Q16970', 'Qrectory'], Q3947: ['Q3947', 'Qrectory'], Q1137809: ['Q1137809'], Q1021645: ['Q1021645', 'Q16831714', 'Q1137809'] });
  assert.ok(!g.church.includes('Qrectory'), 'a place people live in is never public by type');
  assert.ok(g.public.includes('Q1137809'), 'a courthouse stays public though it is also an office building');
});

test('remarkable-and-public audit 2: every statement of osm.overpassql is bounded and well formed; the build reads Overpass JSON and refuses any other shape', () => {
  const ql = readFileSync(join(__dirname, '..', '..', '..', '..', 'scripts', 'places-archive', 'osm.overpassql'), 'utf8');
  const statements = ql.split('\n').filter((l) => /^\s*nwr/.test(l));
  assert.ok(statements.length >= 4);
  for (const s of statements) {
    assert.match(s, /\(\{\{bbox\}\}\);\s*$/, `bounded: ${s}`);
    assert.ok(!/\]~"/.test(s), `a key regex sits inside its brackets: ${s}`);
  }
  const estate = listed('Gated Landmark Estate', ['Q3947'], { nhl: true });
  const overpass = { elements: [{ type: 'way', id: 1, center: { lon: estate.lon, lat: estate.lat }, tags: { wikidata: estate.id, access: 'private' } }] };
  assert.deepEqual(names(built([estate], overpass)), [], 'Overpass\'s own JSON is read: access=private keeps it out');
  assert.throws(() => built([estate], { nodes: [] }), /osm/i, 'an export of another shape is refused, never read as empty');
});

test('remarkable-and-public audit 4: a listed station tagged was:railway=station still enters; demolished: and destroyed: still remove', () => {
  const station = listed('Union Station', ['Q55488']);
  const gone1 = listed('Gone Station', ['Q55488']);
  const gone2 = listed('Burnt Church', ['Q16970']);
  const r = built([station, gone1, gone2], osmFor([station, { 'was:railway': 'station', amenity: 'restaurant' }], [gone1, { 'demolished:building': 'train_station' }], [gone2, { 'destroyed:building': 'church' }]));
  assert.deepEqual(names(r), ['Union Station']);
});

test('remarkable-and-public audit 10: a Landmark archaeological site, battlefield or shipwreck is a Monument, not a building', () => {
  const r = built([listed('Indian Steps', ['Q839954'], { nhl: true }), listed('Bushy Run Battlefield', ['Q4895508'], { nhl: true }), listed('A Wreck', ['Q852190'], { nhl: true })]);
  for (const n of ['Indian Steps', 'Bushy Run Battlefield', 'A Wreck']) assert.equal(classOf(r, n), 'historic_site', n);
  assert.deepEqual((ARCHIVE_CLASSES as Record<string, readonly [string, string]>).historic_site, ['history', 'monuments']);
});

test('remarkable-and-public audit 11: an element tagged wikidata=Q1;Q2 speaks for both items', () => {
  const a = listed('Church A', ['Q16970']);
  const b = listed('Church B', ['Q16970']);
  const osm = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lon, a.lat] }, properties: { wikidata: `${a.id};${b.id}`, access: 'private' } }] };
  assert.deepEqual(names(built([a, b], osm)), []);
});

test('remarkable-and-public audit 12: a district also typed ghost town or monument never enters', () => {
  const r = built([listed('Eckley Miners\' Village', ['Q15243209', 'Q74047'], { nhl: true }), listed('Monument Square District', ['Q15243209', 'Q4989906'])]);
  assert.deepEqual(names(r), []);
});

test('remarkable-and-public audit 13: a listing that ended is no listing, and a cut-off answer splits the cell', async () => {
  const q = cellQuery([-76, 40, -75, 41]);
  assert.match(q, /p:P1435 \?h\w* \. \?h\w* ps:P1435 wd:Q19558910 \. FILTER NOT EXISTS \{ \?h\w* pq:P582/, 'delisted (an end time) is not listed');
  const { parseAnswer } = await laterMod('../../../../scripts/places-archive/fetch-wikidata.mjs') as { parseAnswer: (t: string) => unknown };
  assert.equal(parseAnswer('{"results": {"bindings": [{"item"'), null, 'a timeout that cut the JSON is a split, not a crash');
  assert.deepEqual(parseAnswer('{"results":{"bindings":[]}}'), []);
});

test('remarkable-and-public audit 18: the review is written to its own folder, never the archive\'s', async () => {
  const { reviewDir } = await laterMod('../../../../scripts/build-places-archive.mjs') as { reviewDir: (out: string, reviewOut: string | null) => string };
  assert.throws(() => reviewDir('out', null), /review-out/);
  assert.throws(() => reviewDir('out', 'out/'), /review-out/);
  assert.equal(reviewDir('out', 'review'), 'review');
});
