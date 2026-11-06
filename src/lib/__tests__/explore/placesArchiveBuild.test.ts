/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
// @ts-expect-error: a plain ES module script, no types
import { writeArchive } from '../../../../scripts/places-archive/archive.mjs';
// @ts-expect-error: a plain ES module script, no types
import { CLASSES, classify, gone, keep } from '../../../../scripts/places-archive/classify.mjs';
// @ts-expect-error: a plain ES module script, no types
import { build } from '../../../../scripts/build-places-archive.mjs';
// @ts-expect-error: a plain ES module script, no types
import { cellQuery, cellsFor, itemsFrom, splitCell } from '../../../../scripts/places-archive/fetch-wikidata.mjs';
// @ts-expect-error: a plain ES module script, no types
import { ALL_CLASS_IDS } from '../../../../scripts/places-archive/classify.mjs';
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
  return Array.from({ length: layer?.length ?? 0 }, (_, i) => layer!.feature(i).toGeoJSON(x, y, z));
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
  assert.ok(header.leafDirectoryLength > 0, 'leaf directories hold the rest');
  for (const i of [0, 12345, 79999]) {
    const p = places[i];
    const n = 2 ** 12;
    const x = Math.floor(((p.lon + 180) / 360) * n);
    const r = (p.lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
    assert.ok((await featuresAt(buf, 12, x, y)).some((f) => f.properties.name === p.name), `tile of ${p.name}`);
  }
});

const item = (o: Partial<{ p31: string[]; heritage: boolean; dissolved: boolean; closed: boolean; states: string[]; name: string; lon: number; lat: number }>) =>
  ({ p31: [], heritage: false, dissolved: false, closed: false, states: [], name: 'X', lon: -75.19, lat: 40.69, ...o });
const FOLLY = 'Q180174';
const STATUE = 'Q179700';
const MURAL = 'Q219423';
const OVERLOOK = 'Q6017969';
const HOUSE = 'Q3947';

test('PW6: type decides, in a fixed order of pinned Wikidata classes, never age or listing', () => {
  assert.equal(classify(item({ p31: [FOLLY], heritage: true })), 'folly', 'a listed century-old folly is a curiosity');
  assert.equal(classify(item({ p31: [HOUSE], heritage: true })), 'heritage_building', 'a listed ordinary house is history');
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
  assert.equal(gone(item({ dissolved: true })), true, 'demolished, dissolved or abolished (P576)');
  assert.equal(gone(item({ closed: true })), true, 'closed for good (P3999)');
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
  assert.match(q, /wdt:P649/, 'National Register id');
  assert.match(q, /wdt:P1435/, 'heritage designation');
  assert.match(q, /wdt:P17 wd:Q30/, 'in the US');
  assert.match(q, /cornerSouthWest "Point\(-76 40\)"/);
  assert.match(q, /wdt:P576/);
  assert.match(q, /wdt:P3999/);
  assert.ok(!/sitelinks|schema:about|pageviews|COUNT/i.test(q), 'no popularity is ever asked for (PW7)');
  assert.ok(cellsFor([[-125, 24, -66, 50]], 2).length > 300, 'the conterminous US in 2-degree cells');
  assert.deepEqual(splitCell([-76, 40, -74, 42]), [[-76, 40, -75, 41], [-75, 40, -74, 41], [-76, 41, -75, 42], [-75, 41, -74, 42]]);
});

test('PW14: the fetch\'s rows become one item each, with its classes, listing and whether it is gone', () => {
  const b = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
  const items = itemsFrom([
    b({ item: 'http://www.wikidata.org/entity/Q1', label: 'Folly', coord: 'Point(-75.2 40.7)', p31: 'http://www.wikidata.org/entity/Q180174' }),
    b({ item: 'http://www.wikidata.org/entity/Q1', label: 'Folly', coord: 'Point(-75.2 40.7)', p31: 'http://www.wikidata.org/entity/Q3947', nrhp: '123' }),
    b({ item: 'http://www.wikidata.org/entity/Q2', label: 'Old Mill', coord: 'Point(-75.3 40.8)', p31: 'http://www.wikidata.org/entity/Q44494', dissolved: '1950-01-01', stateLabel: 'demolished' }),
  ]);
  assert.deepEqual(items, [
    { id: 'Q1', name: 'Folly', lon: -75.2, lat: 40.7, p31: ['Q180174', 'Q3947'], heritage: true, dissolved: false, closed: false, states: [] },
    { id: 'Q2', name: 'Old Mill', lon: -75.3, lat: 40.8, p31: ['Q44494'], heritage: false, dissolved: true, closed: false, states: ['demolished'] },
  ]);
});
