/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import { createPlacesArchive } from '../../discovery/archive/shell';
import { ARCHIVE_ZOOM, parseManifest } from '../../discovery/archiveManifest';
import { DIMENSIONS, isStore } from '../../outing/stores';
import { createStoresPack } from '../../outing/storesPack';
import { decodeStoresTile, STORES_ZOOM, storesFromFeatures, type PackFeature } from '../../outing/storesRead';
import { fakePorts } from '../fakes';

// The stores pack's reader (QC14, QC29), over the contract's pinned example and over fakes.

const C = join(__dirname, 'contract');
const read = (p: string) => readFileSync(join(C, p), 'utf8');
const contract = JSON.parse(read('stores.schema.json'));
const MANIFEST = read('example/manifest.json');
const BASE = 'https://data.example/';
const AT: [number, number] = [-75.38, 40.62];

const memory = (buf: Uint8Array): Source => ({
  getKey: () => 'memory',
  getBytes: async (offset: number, length: number): Promise<RangeResponse> => ({ data: buf.slice(offset, offset + length).buffer as ArrayBuffer }),
});

/** The example pack served as a file, recording what was asked. */
function fakeIo(o: { manifest?: () => Promise<string>; tile?: () => Promise<never> } = {}) {
  const log = { fetched: [] as string[], opened: [] as string[], tiles: [] as string[] };
  const pm = new PMTiles(memory(new Uint8Array(readFileSync(join(C, 'example/stores-example-20261109.pmtiles')))));
  const io = {
    base: BASE,
    fetchText: async (url: string) => (log.fetched.push(url), o.manifest ? o.manifest() : MANIFEST),
    open: (url: string) => (log.opened.push(url), {
      getZxy: async (z: number, x: number, y: number) => {
        log.tiles.push(`${z}/${x}/${y}`);
        if (o.tile) return o.tile();
        return pm.getZxy(z, x, y);
      },
    }),
    decode: decodeStoresTile,
  };
  return { io, log };
}

function build(o: Parameters<typeof fakeIo>[0] = {}, ports = fakePorts()) {
  const { io, log } = fakeIo(o);
  const archive = createPlacesArchive({ ...ports, io: { ...io, decode: () => [] }, tileMs: 200, readMs: 400 });
  const pack = createStoresPack({ manifest: archive, io, tileMs: 200, readMs: 400 });
  return { pack, log, archive, ports };
}

test('QC14: the manifest\'s stores entry is read when present and absent in older manifests', () => {
  const m = parseManifest(MANIFEST)!;
  assert.equal(m.regions[0].stores?.current.file, 'stores-example-20261109.pmtiles');
  assert.deepEqual(m.regions[0].stores?.previous, []);
  const old = JSON.parse(MANIFEST);
  delete old.regions[0].stores;
  assert.equal(parseManifest(JSON.stringify(old))!.regions[0].stores, undefined, 'an older manifest has none');
  old.regions[0].stores = { current: { file: '../evil.pmtiles', version: '1', bounds: [0, 0, 1, 1] }, previous: [] };
  const bad = parseManifest(JSON.stringify(old))!;
  assert.equal(bad.regions[0].stores, undefined, 'a stores file that is no stores file is none, the places archive still serves');
  assert.ok(bad.regions[0].current.file);
});

test('QC14: the app keeps to the stores contract it pins: dimensions, feature properties, the example pack', async () => {
  assert.equal(contract.contractVersion, 3);
  // The app's table holds every emitted dimension of the contract, with exactly its closed list.
  for (const [dim, d] of Object.entries(contract.dimensions as Record<string, { emitted: boolean; values: string[] }>)) {
    if (d.emitted) assert.deepEqual([...DIMENSIONS[dim]].sort(), [...d.values].sort(), dim);
    else assert.equal(dim in DIMENSIONS, false, `${dim} is reserved: not read yet`);
  }
  assert.deepEqual(Object.keys(contract.feature.properties).sort(), ['id', 'name', 'src', 'what']);
  assert.equal(contract.feature.additionalProperties, false);
  assert.deepEqual(contract.reserved, ['hours']);
  // The example's records are stores by the app's own check (QC11), and its pack decodes to the same.
  const records = JSON.parse(read('example/stores-example.json'));
  for (const r of records) assert.equal(isStore(r), true, r.id);
  const pm = new PMTiles(memory(new Uint8Array(readFileSync(join(C, 'example/stores-example-20261109.pmtiles')))));
  assert.equal((await pm.getHeader()).maxZoom, STORES_ZOOM);
  assert.equal(STORES_ZOOM, ARCHIVE_ZOOM);
});

test('QC14: the reader reads the example pack by tile and returns its stores', async () => {
  const { pack, log } = build();
  const got = await pack.read(AT, 2600);
  const records = JSON.parse(read('example/stores-example.json')) as { id: string; name: string; at: [number, number]; facets: Record<string, string[]>; src: string }[];
  assert.ok(got.length > 0);
  for (const s of got) {
    const want = records.find((r) => r.id === s.id)!;
    assert.deepEqual([s.name, s.src, s.facets], [want.name, want.src, want.facets], s.id);
    assert.ok(Math.abs(s.at[0] - want.at[0]) < 1e-3 && Math.abs(s.at[1] - want.at[1]) < 1e-3);
  }
  assert.ok(got.some((s) => s.facets.what.includes('books')) && got.some((s) => s.facets.what.includes('second_hand')));
  assert.deepEqual(log.opened, ['https://data.example/stores-example-20261109.pmtiles']);
  assert.ok(log.tiles.length > 0 && log.tiles.every((t) => t.startsWith('12/')), 'z12 tiles of the one file');
});

test('QC14: unknown dimensions and values in a pack are dropped, never an error (QC40)', () => {
  const f: PackFeature[] = [{ lon: -75.38, lat: 40.62, props: { name: 'X', id: 's_1', src: 'osm', what: 'books,teapots', mood: 'calm', how: 'thrift' } }];
  assert.deepEqual(storesFromFeatures(f)[0].facets, { what: ['books'] });
});

test('QC14: a failed read, an old manifest or no region leaves nothing and says nothing', async () => {
  const failing = build({ tile: async () => { throw new Error('Bad response code: 500'); } });
  assert.deepEqual(await failing.pack.read(AT, 2600), []);
  const stalled = build({ tile: () => new Promise<never>(() => {}) });
  assert.deepEqual(await stalled.pack.read(AT, 2600), []);
  const old = JSON.parse(MANIFEST);
  delete old.regions[0].stores;
  const none = build({ manifest: async () => JSON.stringify(old) });
  assert.deepEqual(await none.pack.read(AT, 2600), []);
  assert.equal(none.log.opened.length, 0, 'an old manifest: no pack file is asked for');
  const offline = build({ manifest: async () => { throw new Error('offline'); } });
  assert.deepEqual(await offline.pack.read(AT, 2600), []);
  const zurich = build();
  assert.deepEqual(await zurich.pack.read([8.54, 47.37], 2600), []);
  assert.equal(zurich.log.opened.length, 0, 'outside every region nothing is asked');
});

test('QC14: a listed stores file that is missing is passed over for the previous one', async () => {
  const m = JSON.parse(MANIFEST);
  m.regions[0].stores.previous = [{ ...m.regions[0].stores.current, file: 'stores-example-20261101.pmtiles', version: '20261101' }];
  const { pack, log } = build({ manifest: async () => JSON.stringify(m), tile: async () => { throw new Error('Bad response code: 404'); } });
  assert.deepEqual(await pack.read(AT, 2600), []);
  await pack.read(AT, 2600);
  assert.ok(log.opened.includes('https://data.example/stores-example-20261101.pmtiles'), 'the next read uses the one before');
});

test('QC29: the pack is asked for only through the tile path: no query, no body, nothing but the file', async () => {
  const { pack, log } = build();
  await pack.read(AT, 2600);
  for (const u of [...log.fetched, ...log.opened]) {
    const url = new URL(u);
    assert.equal(url.search, '');
    assert.equal(url.host, 'data.example');
    assert.match(url.pathname, /^\/(manifest\.json|stores-example-\d{8}\.pmtiles)$/);
  }
});
