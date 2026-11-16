/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { fakePorts } from '../fakes';

// Storefronts (specs/storefronts, SF6, SF7, SF18): the network side over fakes, written before the code.
type At = [number, number];
type Shop = { type: string; name: string; at: At; chain: boolean };
type Read = { state: 'ok' | 'empty' | 'uncovered' | 'failed'; places: Shop[] };
type Io = { base: string; fetchText(url: string): Promise<string>; open(url: string): { getZxy(z: number, x: number, y: number): Promise<{ data: ArrayBuffer } | undefined> }; decode(bytes: ArrayBuffer, x: number, y: number): unknown[] };
const mod = () => import('../../storefronts/shell' as string) as Promise<{ createStorefronts: (p: ReturnType<typeof fakePorts> & { io: Io; tileMs?: number; readMs?: number }) => { read(tiles: [number, number][], centre: At): Promise<Read>; refresh(): Promise<void> } }>;

const BASE = 'https://data.example/storefronts/';
const MANIFEST = JSON.stringify({
  schema: 1,
  regions: [{ id: 'us', current: { file: 'storefronts-us-20261114.pmtiles', version: '20261114', bytes: 1000, sha256: 'ab', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] }, previous: [] }],
});
const READ: [number, number][] = [[4768, 6160], [4769, 6161], [4772, 6160]];
const CENTRE: At = [-75.19, 40.69];
const feature = (name: string) => ({ geometry: { type: 'Point', coordinates: [-75.19, 40.69] }, properties: { type: 'second_hand', name, rating: 5, hours: 'x' } });

function fakeIo(o: { manifest?: () => Promise<string>; tile?: () => Promise<{ data: ArrayBuffer } | undefined>; features?: unknown[] } = {}) {
  const log = { fetched: [] as string[], opened: [] as string[], tiles: [] as string[] };
  const io: Io = {
    base: BASE,
    fetchText: async (url) => (log.fetched.push(url), o.manifest ? o.manifest() : MANIFEST),
    open: (url) => (log.opened.push(url), { getZxy: async (z, x, y) => (log.tiles.push(`${z}/${x}/${y}`), o.tile ? o.tile() : { data: new ArrayBuffer(1) }) }),
    decode: () => o.features ?? [feature('Second Chance')],
  };
  return { io, log };
}

test('SF6: a read asks the one current file of the storefront manifest for the z12 tiles its z14 tiles fall in, and nothing else', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const { io, log } = fakeIo();
  const got = await createStorefronts({ ...fakePorts(), io }).read(READ, CENTRE);
  assert.deepEqual(log.fetched, [`${BASE}manifest.json`]);
  assert.deepEqual(log.opened, [`${BASE}storefronts-us-20261114.pmtiles`]);
  assert.deepEqual(log.tiles.sort(), ['12/1192/1540', '12/1193/1540']);
  assert.equal(got.state, 'ok');
  assert.deepEqual(got.places.map((p) => p.name), ['Second Chance']);
  assert.deepEqual(Object.keys(got.places[0]).sort(), ['at', 'chain', 'name', 'type'], 'SF4: the rating and hours never reach a place');
});

test('SF6: the manifest is checked at most daily and kept across a restart', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const ports = fakePorts();
  const { io, log } = fakeIo();
  await createStorefronts({ ...ports, io }).read(READ, CENTRE);
  const again = createStorefronts({ ...ports, io });
  await again.read(READ, CENTRE);
  assert.equal(log.fetched.length, 1, 'the second app run uses the kept manifest');
  ports.clock.advance(24 * 3600_000);
  await again.read(READ, CENTRE);
  assert.equal(log.fetched.length, 2, 'a day later it checks again');
});

test('SF6, SF18: nothing is written but the two meta keys: no place cache, no table, no moment', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const ports = fakePorts();
  await createStorefronts({ ...ports, io: fakeIo().io }).read(READ, CENTRE);
  const effects = ports.log.effects('db.');
  assert.ok(effects.length > 0);
  for (const e of effects) assert.match(e, /^db\.setMeta/, e);
  const keys = new Set(ports.log.entries.filter((e) => e.call === 'db.setMeta').map((e) => String(e.args[0])));
  assert.deepEqual([...keys].sort(), ['storefronts_checked_at', 'storefronts_manifest']);
});

test('SF6: with no address nothing is asked, and outside every region nothing is opened', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const none = fakeIo();
  const off = await createStorefronts({ ...fakePorts(), io: { ...none.io, base: '' } }).read(READ, CENTRE);
  assert.equal(none.log.fetched.length + none.log.opened.length, 0, 'no address: no request at all');
  assert.deepEqual([off.places.length], [0]);
  const { io, log } = fakeIo();
  const zurich = await createStorefronts({ ...fakePorts(), io }).read([[8530, 5740]], [8.54, 47.37]);
  assert.equal(log.opened.length, 0);
  assert.equal(zurich.state, 'uncovered');
});

test('SF7: no region, a covered area with none, and a failed read are three different states, none throwing', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const uncovered = await createStorefronts({ ...fakePorts(), io: fakeIo().io }).read([[8530, 5740]], [8.54, 47.37]);
  const empty = await createStorefronts({ ...fakePorts(), io: fakeIo({ features: [] }).io }).read(READ, CENTRE);
  const failedTile = await createStorefronts({ ...fakePorts(), io: fakeIo({ tile: async () => { throw new Error('Bad response code: 500'); } }).io, tileMs: 20, readMs: 50 }).read(READ, CENTRE);
  const failedManifest = await createStorefronts({ ...fakePorts(), io: fakeIo({ manifest: async () => { throw new Error('offline'); } }).io }).read(READ, CENTRE);
  assert.deepEqual([uncovered.state, empty.state, failedTile.state, failedManifest.state], ['uncovered', 'empty', 'failed', 'failed']);
  for (const r of [uncovered, empty, failedTile, failedManifest]) assert.deepEqual(r.places, []);
});

test('SF7: a read that stalls gives a failed read, never a hang', { todo: 'test first' }, async () => {
  const { createStorefronts } = await mod();
  const r = await createStorefronts({ ...fakePorts(), io: fakeIo({ tile: () => new Promise<never>(() => {}) }).io, tileMs: 20, readMs: 50 }).read(READ, CENTRE);
  assert.equal(r.state, 'failed');
});
