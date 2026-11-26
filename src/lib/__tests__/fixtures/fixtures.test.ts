/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import { createPlacesArchive } from '../../discovery/archive/shell';
import { PLACES_BASE, parseManifest } from '../../discovery/archiveManifest';
import { HOSTS } from '../../net/policy';
import { fakePorts } from '../fakes';

// A town's fixtures, the data set (specs/town-fixtures: TF1, TF2, TF4, TF5, TF14, TF19, TF21, TF25, TF26; G13, decisions
// 0225, 0255, 0268). chronicles-data owns the pack and its contract; contract/ here is the app's pinned copy (its README
// says how to take a new one). Written before the code: the fixtures modules are loaded by a path TypeScript does not
// resolve, as chronicles-data's first tests of a pack are.

const ROOT = join(__dirname, '../../../..');
const C = join(__dirname, 'contract');
const schema = JSON.parse(readFileSync(join(C, 'fixtures.schema.json'), 'utf8'));
const records: { id: string; kind: string; at: [number, number]; name?: string; src: string }[] = JSON.parse(readFileSync(join(C, 'example/fixtures-example.json'), 'utf8'));
const exampleBytes = new Uint8Array(readFileSync(join(C, 'example/fixtures-example-20261109.pmtiles')));
const exampleManifest = readFileSync(join(C, 'example/manifest.json'), 'utf8');
const FILE = 'fixtures-example-20261109.pmtiles';

/* eslint-disable @typescript-eslint/no-explicit-any */
const load = (p: string): Promise<any> => import(String(p));

/** An archive over the example pack's bytes, every byte range it is asked for recorded. */
function memoryArchive(bytes: Uint8Array, asked: { url: string; offset: number; length: number }[], url: string, delayMs = 0) {
  const src: Source = {
    getKey: () => url,
    getBytes: async (offset: number, length: number): Promise<RangeResponse> => {
      asked.push({ url, offset, length });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return { data: bytes.slice(offset, offset + length).buffer as ArrayBuffer };
    },
  };
  return new PMTiles(src);
}

/** The pack over the example, as the app's instance will build it: the manifest's file, the tile reader, the decoder. */
async function examplePack(o: { manifest?: string | null; delayMs?: number } = {}) {
  const { createFixturesPack } = await load('../../fixtures/pack');
  const { decodeFixturesTile } = await load('../../fixtures/read');
  const opened: string[] = [];
  const asked: { url: string; offset: number; length: number }[] = [];
  const missing: string[] = [];
  const open = (url: string) => {
    opened.push(url);
    return memoryArchive(exampleBytes, asked, url, o.delayMs);
  };
  // The places archive's own shell keeps the manifest and names the fixtures file (discovery/archive/shell.ts).
  const archive = createPlacesArchive({
    ...fakePorts(),
    io: { base: PLACES_BASE, fetchText: async () => { if (o.manifest === null) throw new Error('offline'); return o.manifest ?? exampleManifest; }, open, decode: () => [] },
  });
  const pack = createFixturesPack({
    manifest: {
      fixturesFileAt: (at: [number, number]) => archive.fixturesFileAt(at),
      fixturesMissing: (f: string) => { missing.push(f); archive.fixturesMissing(f); },
    },
    io: {
      base: PLACES_BASE,
      open,
      decode: decodeFixturesTile,
    },
    tileMs: 2000,
    readMs: 3000,
  });
  return { pack, opened, asked, missing, archive };
}
/** A view over the example's Hudson fixtures: about 2.5 km by 2 km. */
const HUDSON: [number, number, number, number] = [-74.03, 40.69, -73.99, 40.73];
const key = (fs: { kind: string; name?: string; src: string }[]) => fs.map((f) => `${f.kind}:${f.name ?? ''}:${f.src}`).sort();

test('TF1: the app\'s kinds are the pinned contract\'s closed list, thirteen, in its order; an unknown kind is ignored', async () => {
  const { FIXTURE_KINDS } = await load('../../fixtures/kinds');
  assert.equal(schema.contractVersion, 9);
  assert.deepEqual([...FIXTURE_KINDS], schema.kinds.map((k: { kind: string }) => k.kind));
  assert.equal(FIXTURE_KINDS.length, 13);
  assert.deepEqual(schema.kinds.map((k: { osm: string }) => k.osm), [
    'information=office', 'amenity=townhall', 'amenity=library', 'amenity=post_office', 'place=square', 'amenity=marketplace',
    'railway=station', 'amenity=bus_station', 'amenity=courthouse', 'amenity=community_centre', 'amenity=ferry_terminal',
    'leisure=common', 'leisure=bandstand',
  ], 'the owner\'s thirteen tags (Nov 25)');
  assert.match(schema.clients, /ignores a kind it does not know/);
  const { fixturesFromFeatures } = await load('../../fixtures/read');
  assert.deepEqual(fixturesFromFeatures([{ lon: -74, lat: 40.7, props: { kind: 'palace', id: 'f_1', src: 'osm', name: 'X' } }]), [], 'an unknown kind is dropped, never an error');
});

test('TF2: no practical amenity is a kind, and a pack feature of one is dropped', async () => {
  const { FIXTURE_KINDS } = await load('../../fixtures/kinds');
  const { fixturesFromFeatures } = await load('../../fixtures/read');
  for (const k of ['toilets', 'parking', 'drinking_water', 'bench', 'atm', 'bank', 'bus_stop', 'post_box', 'fuel', 'pharmacy', 'supermarket', 'information', 'board']) {
    assert.ok(!FIXTURE_KINDS.includes(k), `${k} is not a fixture`);
    assert.deepEqual(fixturesFromFeatures([{ lon: -74, lat: 40.7, props: { kind: k, id: 'f_2', src: 'osm', name: 'Public Toilets' } }]), []);
  }
});

test('TF4: fixtures come through the adapter from the pack, an in-memory source for tests; none is hard-coded, a region with no pack yields none', async () => {
  const { memoryFixtures, readFixtures } = await load('../../fixtures/read');
  const { pack } = await examplePack();
  const inHudson = records.filter((r) => r.at[0] >= HUDSON[0] && r.at[0] <= HUDSON[2] && r.at[1] >= HUDSON[1] && r.at[1] <= HUDSON[3]);
  assert.ok(inHudson.length >= 15);
  assert.deepEqual(key(await readFixtures(pack, HUDSON)), key(inHudson), 'the example pack\'s records in view, read by tile');
  const ridge = records.find((r) => r.name === 'Ridge Public Library')!;
  const there: [number, number, number, number] = [ridge.at[0] - 0.01, ridge.at[1] - 0.01, ridge.at[0] + 0.01, ridge.at[1] + 0.01];
  assert.deepEqual(key(await readFixtures(pack, there)), key([ridge]), 'and Wikidata\'s library elsewhere');
  const mem = memoryFixtures(records);
  assert.deepEqual(key(await readFixtures(mem, HUDSON)), key(inHudson));
  // A manifest with no fixtures, a point outside every region, no source and a failing source: none, and no throw.
  const noFixtures = JSON.stringify({ ...JSON.parse(exampleManifest), regions: JSON.parse(exampleManifest).regions.map(({ fixtures: _f, ...r }: any) => r) });
  assert.deepEqual(await readFixtures((await examplePack({ manifest: noFixtures })).pack, HUDSON), []);
  assert.deepEqual(await readFixtures((await examplePack({ manifest: null })).pack, HUDSON), []);
  assert.equal(parseManifest(noFixtures)!.regions[0].fixtures, undefined, 'an older manifest has none');
  const evil = JSON.parse(exampleManifest);
  evil.regions[0].fixtures = { current: { file: '../evil.pmtiles', version: '1', bounds: [0, 0, 1, 1] }, previous: [] };
  assert.equal(parseManifest(JSON.stringify(evil))!.regions[0].fixtures, undefined, 'a file that is not a fixtures pack\'s name is none');
  assert.equal((await (await examplePack()).archive.fixturesFileAt([10, 10])), null, 'a point outside every region');
  assert.deepEqual(await readFixtures(null, HUDSON), []);
  assert.deepEqual(await readFixtures({ read: async () => { throw new Error('offline'); } }, HUDSON), []);
  // Nothing hard-coded: no fixture's name from the example is spelled anywhere under src/ but the tests.
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== '__tests__') walk(p); } else if (/\.(ts|tsx)$/.test(f)) files.push(p); } };
  walk(join(ROOT, 'src'));
  for (const name of ['Hudson Free Library', 'Hudson Visitor Center', 'Maple Street Library', 'Ridge Public Library']) {
    assert.ok(!files.some((f) => readFileSync(f, 'utf8').includes(name)), `${name} is in no source file`);
  }
});

test('TF5: a fixture carries its kind, its position and its name where it has one, and nothing a crowd says', async () => {
  const { isFixture } = await load('../../fixtures/kinds');
  const { fixturesFromFeatures } = await load('../../fixtures/read');
  const good = { id: 'f_0000000000000001', kind: 'library', at: [-74, 40.7], name: 'Hudson Free Library', src: 'osm' };
  assert.ok(isFixture(good));
  const { name: _n, ...unnamed } = good;
  assert.ok(isFixture(unnamed), 'an unnamed square is a square');
  for (const extra of ['rating', 'reviews', 'visits', 'count', 'hours', 'popularity', 'wikidata']) assert.equal(isFixture({ ...good, [extra]: 1 }), false, `${extra} is refused`);
  const plain = { lon: -74, lat: 40.7, props: { kind: 'library', id: 'f_1', src: 'osm', name: 'Hudson Free Library' } };
  const poisoned = { ...plain, props: { ...plain.props, rating: '5', visits: '1000', opening_hours: '24/7', popularity: 'high' } };
  assert.deepEqual(fixturesFromFeatures([poisoned]), fixturesFromFeatures([plain]));
  assert.deepEqual(Object.keys(fixturesFromFeatures([plain])[0]).sort(), ['at', 'id', 'kind', 'name', 'src']);
  const sq = fixturesFromFeatures([{ lon: -74, lat: 40.7, props: { kind: 'square', id: 'f_3', src: 'osm' } }])[0];
  assert.deepEqual(Object.keys(sq).sort(), ['at', 'id', 'kind', 'src'], 'no name, not an empty one');
});

test('TF14: read by tile, only for what is on screen; bounded; a read can be stopped', async () => {
  const { FIXTURE_TILES_MAX, readFixtures } = await load('../../fixtures/read');
  assert.equal(FIXTURE_TILES_MAX, 9);
  const { pack, opened, asked } = await examplePack();
  const got = await readFixtures(pack, HUDSON);
  assert.ok(got.length > 0);
  assert.ok(got.every((f: any) => f.at[0] >= HUDSON[0] && f.at[0] <= HUDSON[2] && f.at[1] >= HUDSON[1] && f.at[1] <= HUDSON[3]), 'only what is in view');
  assert.ok(!got.some((f: any) => f.name === 'Ridge Public Library'), 'a fixture off screen is not returned');
  assert.ok(opened.every((u) => u === `${PLACES_BASE}${FILE}`));
  const ranges = asked.length;
  await readFixtures(pack, HUDSON);
  assert.equal(asked.length, ranges, 'a tile is read once');
  // Too wide a view reads nothing and asks for nothing.
  const wide = await examplePack();
  assert.deepEqual(await readFixtures(wide.pack, [-75, 40, -73, 42]), []);
  assert.deepEqual(wide.asked, []);
  // Stopped before: nothing asked. Stopped during: nothing returned, the read ends.
  const before = await examplePack();
  assert.deepEqual(await readFixtures(before.pack, HUDSON, () => true), []);
  assert.deepEqual(before.asked, []);
  const during = await examplePack({ delayMs: 1500 });
  let stop = false;
  setTimeout(() => { stop = true; }, 100);
  const t0 = Date.now();
  assert.deepEqual(await readFixtures(during.pack, HUDSON, () => stop), []);
  assert.ok(Date.now() - t0 < 1400, 'it ended when told to, before the slow tile came');
});

test('TF19: nothing counts fixtures: the modules store nothing and export no count; the contract holds no count', async () => {
  const dir = join(ROOT, 'src/lib/fixtures');
  for (const f of readdirSync(dir)) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.doesNotMatch(src, /from '\.\.\/(db|ports|meta|store|recorder|notifier)\b|setMeta|getMeta|localStorage|AsyncStorage/, `${f} stores nothing`);
    assert.doesNotMatch(src, /export (const|function) \w*(count|total|tally)\w*/i, `${f} exports no count`);
  }
  assert.doesNotMatch(JSON.stringify({ r: schema.record, f: schema.feature }), /count|total|tally/i);
});

test('TF21: nothing leaves the device beyond the pack\'s byte ranges from the host the other packs come from', async () => {
  const { pack, opened, asked } = await examplePack();
  const { readFixtures } = await load('../../fixtures/read');
  await readFixtures(pack, HUDSON);
  assert.ok(opened.length > 0);
  for (const u of opened) {
    const url = new URL(u);
    assert.equal(url.host, new URL(PLACES_BASE).host, 'the places archive\'s host');
    assert.equal(url.search, '', 'no query');
    assert.match(url.pathname, /\/fixtures-[a-z0-9]+-\d{8}(\.\d+)?\.pmtiles$/);
  }
  assert.ok(asked.every((a) => a.length > 0 && a.offset >= 0), 'byte ranges only');
  assert.deepEqual(Object.keys(HOSTS).sort(), ['miguelaguerrero.github.io', 'overpass-api.de', 'overturemaps-extras-us-west-2.s3.amazonaws.com', 'tiles.openfreemap.org'], 'no new host');
  const dir = join(ROOT, 'src/lib/fixtures');
  for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /fetch\(|https?:\/\//, `${f} makes no request of its own`);
});

test('TF25: one fixture is kept once, from both sources, in the pinned example', async () => {
  const { fixturesFromFeatures } = await load('../../fixtures/read');
  assert.ok(records.some((r) => r.src === 'osm') && records.some((r) => r.src === 'wd'), 'OpenStreetMap\'s and Wikidata\'s');
  const m = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111_320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110_540);
  for (const a of records) for (const b of records) {
    if (a === b || a.kind !== b.kind || !a.name || a.name !== b.name) continue;
    assert.ok(m(a.at, b.at) > 250, `${a.kind} ${a.name} is kept once within 250 m`);
  }
  // The reader keeps the pack's src as it is.
  assert.equal(fixturesFromFeatures([{ lon: -73.5, lat: 41.2, props: { kind: 'library', id: 'f_9', src: 'wd', name: 'Ridge Public Library' } }])[0].src, 'wd');
});

test('TF26: a tourist office is the town\'s own, information=office; an attraction\'s visitor centre is never a kind', async () => {
  const { FIXTURE_KINDS } = await load('../../fixtures/kinds');
  assert.equal(schema.kinds.find((k: { kind: string }) => k.kind === 'tourist_office').osm, 'information=office');
  assert.ok(!FIXTURE_KINDS.includes('visitor_centre'));
  assert.ok(!schema.kinds.some((k: { osm: string }) => k.osm === 'information=visitor_centre'));
  assert.match(JSON.stringify(schema.notFixtures), /information=visitor_centre/);
});
