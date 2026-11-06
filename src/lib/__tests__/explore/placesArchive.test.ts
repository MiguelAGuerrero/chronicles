/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdits, mergePlaces } from '../../discovery/archiveMerge';
import { ARCHIVE_CLASSES, placesFromArchive } from '../../discovery/archivePois';
import { placeKey } from '../../discovery/places';
import type { Place } from '../../discovery/types';
import { archiveStale, KINDS, parseHidden } from '../../explore/explore';
import { createPlacesArchive } from '../../discovery/archive/shell';
import { fakePorts } from '../fakes';
import { archiveTilesFor, ARCHIVE_ZOOM, manifestDue, parseManifest, pickRegion, PLACES_BASE, regionUrl } from '../../discovery/archiveManifest';

// Places worth the stop (specs/places-worth-the-stop, PW1-PW19), written from the spec before the code.

const manifest = {
  schema: 1,
  regions: [
    {
      id: 'us',
      current: { file: 'places-us-20261108.pmtiles', version: '20261108', bytes: 1000, sha256: 'ab', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] },
      previous: [{ file: 'places-us-20261101.pmtiles', version: '20261101', bytes: 990, sha256: 'cd', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] }],
    },
  ],
};

test('PW2: the manifest names each region\'s current file by version; anything else is no manifest', () => {
  const m = parseManifest(JSON.stringify(manifest));
  assert.equal(m?.regions[0].current.file, 'places-us-20261108.pmtiles');
  assert.equal(m?.regions[0].current.version, '20261108');
  for (const bad of ['', 'not json', '{"schema":2,"regions":[]}', '{"schema":1}', JSON.stringify({ schema: 1, regions: [{ id: 'us', current: { file: '../evil.pmtiles', version: '1', bounds: [0, 0, 1, 1] } }] })])
    assert.equal(parseManifest(bad), null, bad);
});

test('PW2: the region is the one whose box holds the read\'s centre; outside every region, none', () => {
  const m = parseManifest(JSON.stringify(manifest))!;
  assert.equal(pickRegion(m, [-75.19, 40.69])?.id, 'us');
  assert.equal(pickRegion(m, [8.54, 47.37]), null, 'Zurich: no region, so a read goes on as today');
});

test('PW2: the manifest is checked at most once a day; a failed check waits 10 minutes', () => {
  const day = 24 * 3600_000;
  assert.equal(manifestDue(null, null, 0), true, 'never checked');
  assert.equal(manifestDue(0, null, day - 1), false);
  assert.equal(manifestDue(0, null, day), true);
  assert.equal(manifestDue(null, 1000, 1000 + 10 * 60_000 - 1), false, 'a failed check waits');
  assert.equal(manifestDue(null, 1000, 1000 + 10 * 60_000), true);
});

test('PW2: tiles are stored at z12; the reader asks for the one holding each z14 tile of the read, once', () => {
  assert.equal(ARCHIVE_ZOOM, 12);
  assert.deepEqual(archiveTilesFor([[4768, 6160], [4769, 6161], [4772, 6160]]), [[1192, 1540], [1193, 1540]]);
});

test('PW2, PW16: a region\'s file is addressed by its versioned name; until PW16 is recorded the address is empty and nothing is asked', () => {
  assert.equal(regionUrl('https://example.org/data/', 'places-us-20261108.pmtiles'), 'https://example.org/data/places-us-20261108.pmtiles');
  assert.equal(PLACES_BASE, '', 'the reader does nothing until a real archive has been read from the host (PW16)');
});

test('PW4: Curiosities is a kind, named in words, on by default, and a hidden one stays hidden', () => {
  const k = KINDS.find((x) => x.id === 'curiosities');
  assert.equal(k?.label, 'Curiosities');
  assert.ok(!/\d/.test(k!.label));
  assert.equal(parseHidden(null).has('curiosities'), false, 'on by default');
  assert.equal(parseHidden(JSON.stringify(['curiosities'])).has('curiosities'), true);
});

const pt = (lon: number, lat: number, props: Record<string, unknown>) => ({ geometry: { type: 'Point' as const, coordinates: [lon, lat] }, properties: props });

test('PW5: each archive class maps to one category and kind; the table is pinned, and an unknown class is left out', () => {
  assert.deepEqual(ARCHIVE_CLASSES, {
    folly: ['viewpoints', 'curiosities'], novelty_building: ['viewpoints', 'curiosities'], roadside_giant: ['viewpoints', 'curiosities'],
    natural_oddity: ['viewpoints', 'curiosities'], odd_engineering: ['viewpoints', 'curiosities'], marks_a_fact: ['viewpoints', 'curiosities'],
    art_environment: ['viewpoints', 'curiosities'], ruin: ['viewpoints', 'curiosities'],
    monument: ['history', 'monuments'], memorial: ['history', 'monuments'], statue: ['history', 'monuments'], marker: ['history', 'monuments'],
    mural: ['art', 'public_art'], sculpture: ['art', 'public_art'],
    overlook: ['viewpoints', 'viewpoints'], tower: ['viewpoints', 'viewpoints'],
    heritage_building: ['history', 'monuments'],
  }, 'a new class is a deliberate change to this table (as AG5)');
  const got = placesFromArchive([pt(-75.19, 40.69, { name: 'Bushkill Park Folly', class: 'folly', src: 'wd', id: 'Q1' }), pt(-75.19, 40.691, { name: 'A shop', class: 'shop', src: 'osm', id: 'n2' })], 'v20261108');
  assert.equal(got.length, 1, 'the shop\'s class is not in the table: left out, never guessed');
  assert.deepEqual([got[0].category, got[0].kind, got[0].markable, got[0].build], ['viewpoints', 'curiosities', true, 'v20261108']);
});

test('PW9: an unnamed archive place is never kept', () => {
  assert.deepEqual(placesFromArchive([pt(-75.19, 40.69, { class: 'folly', src: 'wd', id: 'Q1' }), pt(-75.19, 40.69, { name: '  ', class: 'folly', src: 'wd', id: 'Q2' })], 'v'), []);
});

const tilePlace = (name: string, category: Place['category'], at: [number, number]): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1', markable: true, kind: category === 'history' ? 'monuments' : undefined });

test('PW8: a place in the tiles and in the archive, same name within 50 m in any category, is one mark; the archive\'s kind wins', () => {
  const archive = placesFromArchive([pt(-75.19, 40.69, { name: 'Hessian Powder Magazine', class: 'ruin', src: 'wd', id: 'Q9' })], 'v1');
  const tiles = [tilePlace('Hessian Powder Magazine', 'history', [-75.19, 40.6903]), tilePlace('Main Street Bakery', 'food', [-75.191, 40.69])];
  const merged = mergePlaces(tiles, archive);
  assert.deepEqual(merged.map((p) => [p.name, p.kind ?? null]).sort(), [['Hessian Powder Magazine', 'curiosities'], ['Main Street Bakery', null]]);
  const far = mergePlaces([tilePlace('Hessian Powder Magazine', 'history', [-75.19, 40.70])], archive);
  assert.equal(far.length, 2, 'the same name a kilometre away is another place');
});

test('PW13: the owner\'s file removes a place whichever source named it, and adds one as a mark of its class', () => {
  const places = mergePlaces([tilePlace('Old Water Tower', 'history', [-75.19, 40.69])], placesFromArchive([pt(-75.2, 40.69, { name: 'Odd Rock', class: 'natural_oddity', src: 'wd', id: 'Q3' })], 'v1'));
  const edited = applyEdits(places, { remove: [{ name: 'old water tower', at: [-75.19002, 40.69001] }, { name: 'Odd Rock', at: [-75.2, 40.69] }], add: [{ name: 'Giant Peanut', at: [-75.18, 40.69], class: 'roadside_giant' }] }, 'v1');
  assert.deepEqual(edited.map((p) => [p.name, p.category, p.kind]), [['Giant Peanut', 'viewpoints', 'curiosities']]);
  assert.deepEqual(applyEdits(places, { remove: [], add: [{ name: 'Mystery', at: [0, 0], class: 'unknown' }] }, 'v1').length, 2, 'an added place of an unknown class is left out');
});

// ——— The archive's network side (PW1, PW2, PW3, PW16), over fakes ———

const BASE = 'https://data.example/';
const MANIFEST = JSON.stringify(manifest);
/** An archive whose tiles are JSON lists of features; it records what was asked of it. */
function fakeIo(o: { manifest?: () => Promise<string>; tile?: (z: number, x: number, y: number) => Promise<{ data: ArrayBuffer } | undefined> } = {}) {
  const log = { fetched: [] as string[], opened: [] as string[], tiles: [] as string[] };
  const enc = (f: unknown[]) => new TextEncoder().encode(JSON.stringify(f)).buffer as ArrayBuffer;
  const io = {
    base: BASE,
    fetchText: async (url: string) => (log.fetched.push(url), o.manifest ? o.manifest() : MANIFEST),
    open: (url: string) => (log.opened.push(url), {
      getZxy: async (z: number, x: number, y: number) => (log.tiles.push(`${z}/${x}/${y}`), o.tile ? o.tile(z, x, y) : { data: enc([pt(-75.19, 40.69, { name: 'Bushkill Folly', class: 'folly', src: 'wd', id: 'Q1' })]) }),
    }),
    decode: (bytes: ArrayBuffer) => JSON.parse(new TextDecoder().decode(bytes)),
  };
  return { io, log };
}
const READ: [number, number][] = [[4768, 6160], [4769, 6161], [4772, 6160]];
const CENTRE: [number, number] = [-75.19, 40.69];

test('PW1: a read asks the one current region file for the z12 tiles its z14 tiles fall in, and nothing else', async () => {
  const ports = fakePorts();
  const { io, log } = fakeIo();
  const archive = createPlacesArchive({ ...ports, io, tileMs: 1000, readMs: 2000 });
  const got = await archive.read(READ, CENTRE);
  assert.deepEqual(log.opened, ['https://data.example/places-us-20261108.pmtiles']);
  assert.deepEqual(log.tiles.sort(), ['12/1192/1540', '12/1193/1540']);
  assert.equal(got?.version, '20261108');
  assert.deepEqual(got?.places.map((p) => [p.name, p.kind, p.build]), [['Bushkill Folly', 'curiosities', '20261108']]);
});

test('PW2: the manifest is fetched at most daily, kept across a restart; a failed check waits 10 minutes', async () => {
  const ports = fakePorts();
  const { io, log } = fakeIo();
  await createPlacesArchive({ ...ports, io }).read(READ, CENTRE);
  const again = createPlacesArchive({ ...ports, io });
  await again.read(READ, CENTRE);
  assert.equal(log.fetched.length, 1, 'the second app run uses the kept manifest');
  ports.clock.advance(24 * 3600_000);
  await again.read(READ, CENTRE);
  assert.equal(log.fetched.length, 2, 'a day later it checks again');
  let fail = true;
  const flaky = fakeIo({ manifest: async () => { if (fail) throw new Error('offline'); return MANIFEST; } });
  const fresh = fakePorts();
  const a = createPlacesArchive({ ...fresh, io: flaky.io });
  assert.equal(await a.read(READ, CENTRE), null, 'no manifest yet: a read goes on as today');
  fail = false;
  fresh.clock.advance(10 * 60_000 - 1);
  await a.read(READ, CENTRE);
  assert.equal(flaky.log.fetched.length, 1, 'waits after a failed check');
  fresh.clock.advance(1);
  assert.notEqual(await a.read(READ, CENTRE), null);
});

test('PW3: an archive that fails, stalls or is missing gives nothing, never an error; a missing one sends the next read back to the manifest', async () => {
  for (const tile of [async () => { throw new Error('Bad response code: 500'); }, () => new Promise<never>(() => {})]) {
    const { io } = fakeIo({ tile });
    assert.equal(await createPlacesArchive({ ...fakePorts(), io, tileMs: 20, readMs: 50 }).read(READ, CENTRE), null);
  }
  const ports = fakePorts();
  const { io, log } = fakeIo({ tile: async () => { throw new Error('Bad response code: 404'); } });
  const archive = createPlacesArchive({ ...ports, io, tileMs: 20, readMs: 50 });
  assert.equal(await archive.read(READ, CENTRE), null);
  await archive.read(READ, CENTRE);
  assert.equal(log.fetched.length, 2, 'the file the manifest named is gone: the manifest is read again at once');
});

test('PW2, PW16: outside every region, or with no address yet, nothing is asked', async () => {
  const { io, log } = fakeIo();
  assert.equal(await createPlacesArchive({ ...fakePorts(), io }).read([[8530, 5740]], [8.54, 47.37]), null, 'Zurich');
  assert.equal(log.opened.length, 0);
  const none = fakeIo();
  assert.equal(await createPlacesArchive({ ...fakePorts(), io: { ...none.io, base: '' } }).read(READ, CENTRE), null);
  assert.equal(none.log.fetched.length + none.log.opened.length, 0, 'no address: no request at all');
});

test('PW12: an area built without the archive while one is known, or with an older one, is rebuilt; with none known, nothing is', () => {
  assert.equal(archiveStale(null, '20261108'), true, 'built without, one known now');
  assert.equal(archiveStale(undefined, '20261108'), true, 'a row from before the column');
  assert.equal(archiveStale('20261101', '20261108'), true, 'an older version');
  assert.equal(archiveStale('20261108', '20261108'), false);
  assert.equal(archiveStale('20261108', null), false, 'this read had no archive (offline): keep what was built');
  assert.equal(archiveStale(null, null), false);
});
