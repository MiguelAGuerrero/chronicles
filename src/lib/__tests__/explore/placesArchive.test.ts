/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergePlaces } from '../../discovery/archiveMerge';
import { ARCHIVE_CLASSES, placesFromArchive } from '../../discovery/archivePois';
import { placeKey } from '../../discovery/places';
import type { Place } from '../../discovery/types';
import { archiveStale, KINDS, parseHidden } from '../../explore/explore';
import { ATLAS_CODE, ATLAS_RULES, keptProfile, MARKS_EXPLAINED, profileStale, rereadAt, ringOf, rowCurrent, STEPS, type AtlasArea, type AtlasProfile } from '../../atlas/atlas';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChecklists, placeFinds, readCentre, type ChecklistArea, type Find } from '../../explore/explore';
import type { PlaceCandidate } from '../../areas/types';
import { createPlacesArchive } from '../../discovery/archive/shell';
import { fakePorts } from '../fakes';
import { archiveTag, archiveTilesFor, ARCHIVE_ZOOM, blockKey, manifestDue, parseManifest, pickRegion, PLACES_BASE, regionUrl } from '../../discovery/archiveManifest';

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

test('PW2, PW16: a region\'s file is addressed by its versioned name; the address is the chronicles-data Pages site, recorded and allowed', async () => {
  assert.equal(regionUrl('https://example.org/data/', 'places-us-20261108.pmtiles'), 'https://example.org/data/places-us-20261108.pmtiles');
  // PW16, recorded Nov 10: a cross-origin byte range of places-us-20261110.3.pmtiles answered 206 with its content-range and
  // access-control-allow-origin: *, and the app's reader decoded Bethlehem's tile from it.
  assert.equal(PLACES_BASE, 'https://miguelaguerrero.github.io/chronicles-data/');
  const host = new URL(PLACES_BASE).host;
  const { HOSTS } = await import('../../net/policy');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ALLOWED_HOSTS } = require('../../../../scripts/check-vision.js') as { ALLOWED_HOSTS: Record<string, string> };
  assert.ok(host in HOSTS, 'in lib/net\'s table');
  assert.ok(host in ALLOWED_HOSTS, 'on the vision\'s allowed hosts, with its reason');
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
    church: ['history', 'churches'], cemetery: ['history', 'cemeteries'], theatre: ['culture', 'theatres'], museum: ['culture', 'museums'],
    historic_site: ['history', 'monuments'], building_structure: ['history', 'structures'],
  }, 'a new class is a deliberate change to this table (as AG5); contract v2 re-pinned it (RP8, decisions 0109, 0111)');
  const got = placesFromArchive([pt(-75.19, 40.69, { name: 'Bushkill Park Folly', class: 'folly', src: 'wd', id: 'Q1' }), pt(-75.19, 40.691, { name: 'A shop', class: 'shop', src: 'osm', id: 'n2' })], 'v20261108');
  assert.equal(got.length, 1, 'the shop\'s class is not in the table: left out, never guessed');
  assert.deepEqual([got[0].category, got[0].kind, got[0].markable, got[0].build], ['viewpoints', 'curiosities', true, 'v20261108']);
});

test('PW9: an unnamed archive place is kept only for a monument, memorial or statue (OL11); any other class is left out', () => {
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

// ——— The atlas (PW10) ———

const RING: [number, number] = [-75.19, 40.69];
const near = (dx: number): [number, number] => [RING[0] + dx * 0.0001, RING[1]];

test('PW10: the atlas counts the archive\'s curiosities among Viewpoints & oddities, and its dots and "?" agree', () => {
  const tiles = [tilePlace('Main Street Bakery', 'food', near(1)), tilePlace('Town Clock', 'history', near(2))];
  const archive = placesFromArchive([pt(...near(3), { name: 'Bushkill Folly', class: 'folly', src: 'wd', id: 'Q1' }), pt(...near(4), { name: 'Odd Rock', class: 'natural_oddity', src: 'wd', id: 'Q2' })], 'v1');
  const r = ringOf(tiles, archive, RING);
  assert.equal(r.steps.viewpoints, 2, 'two curiosities: two findable places of Viewpoints & oddities');
  assert.deepEqual(r.marks.filter((m) => m.kind === 'curiosities').length, 2, 'the "?" marks are the same places');
  assert.equal(ringOf(tiles, null, RING).steps.viewpoints, 0, 'without the archive, as before');
});

test('PW10: the steps stay fixed, and a ring\'s thin is judged from the map\'s places alone', () => {
  assert.deepEqual(STEPS, { history: [1, 4, 12], art: [1, 4, 12], culture: [1, 3, 8], parks: [1, 3, 6], viewpoints: [1, 2, 5], food: [4, 15, 50], shops: [4, 15, 50], nightlife: [2, 6, 20] },
    'STEPS takes no input from the archive');
  const archive = placesFromArchive([1, 2, 3, 4, 5].map((i) => pt(...near(i), { name: `Rock ${i}`, class: 'natural_oddity', src: 'wd', id: `Q${i}` })), 'v1');
  assert.equal(ringOf([], archive, RING).thin, true, 'five curiosities and nothing on the map: still thin, as with no archive');
  assert.equal(ringOf([], null, RING).thin, true);
});

test('PW10: a read without the archive never replaces one measured with it; a ring measured without it is read again 30 minutes after one is known', () => {
  const prof = (archive: string | null): AtlasProfile => ({ steps: {} as AtlasProfile['steps'], strips: [], stripAt: null, marks: [], sketch: { paths: [] } as unknown as AtlasProfile['sketch'], overture: 'r1', archive });
  assert.equal(keptProfile(prof('v1'), prof(null)).archive, 'v1');
  assert.equal(keptProfile(prof('v1'), prof('v2')).archive, 'v2');
  assert.equal(profileStale(prof(null), 'r1', 'v1'), true, 'measured without the archive while one is known');
  assert.equal(profileStale(prof('v0'), 'r1', 'v1'), true, 'an older version');
  assert.equal(profileStale(prof('v1'), 'r1', 'v1'), false);
  assert.equal(profileStale(prof(null), 'r1', null), false, 'no archive known: nothing to wait for');
  const area = (p: AtlasProfile): AtlasArea => ({ key: 'k', level: 'neighborhood', name: 'Fox', at: RING, reachM: 800, build: 'b', code: 'a7', listed_at: 0, read_at: 1000, failed_at: null, profile: p });
  assert.equal(rereadAt(area(prof(null)), 'r1', 'v1'), 1000 + 30 * 60_000);
  assert.equal(rereadAt(area(prof('v0')), 'r1', 'v1'), 1000 + ATLAS_RULES.retryMs);
  assert.equal(rereadAt(area(prof('v1')), 'r1', 'v1'), null);
});

test('PW10: ATLAS_CODE is bumped past a7; since a8 rows from a6 are read again too (PK7: the bars changed at every level)', () => {
  assert.equal(ATLAS_CODE, 'a8.p1', 'a8, then presence\'s code (specs/presence PR6)');
  for (const level of ['neighborhood', 'town'] as const)
    assert.equal(rowCurrent({ build: 'b1', code: 'a6', level }, 'b1'), false, `${level} rows from a6 are read again`);
});

test('PW11: no count, rank or "popular" mark: the kinds, their labels and the marks text carry no digit', () => {
  for (const k of KINDS) assert.ok(!/\d/.test(k.label), k.label);
  for (const line of MARKS_EXPLAINED) assert.ok(!/\d/.test(line), line);
  const fields = Object.keys(placesFromArchive([pt(-75.19, 40.69, { name: 'Folly', class: 'folly', src: 'wd', id: 'Q1', sitelinks: '40', rank: '1' })], 'v')[0]).sort();
  assert.deepEqual(fields, ['at', 'build', 'category', 'generic', 'key', 'kind', 'markable', 'name'], 'nothing that measures a place reaches the app');
});

test('PW17: a place\'s sheet names its finds and never a total, archive places included', () => {
  const a: ChecklistArea = { key: 'H', level: 'neighborhood', name: 'H', at: CENTRE, build: 'b', built_at: 1, count: 40, archive: '20261108' };
  const f = (name: string) => ({ key: name, area_key: 'H', name }) as unknown as Parameters<typeof placeFinds>[2][number];
  const got = placeFinds({ level: 'neighborhood', name: 'H', lon: CENTRE[0], lat: CENTRE[1] }, [{ ...a, key: a.key }], [f('Bushkill Folly')]);
  assert.ok(Array.isArray(got) && got.every((x) => !('total' in (x as object)) && !('count' in (x as object))));
  assert.deepEqual(got!.map((x) => x.name), ['Bushkill Folly']);
});

test('PW18: the scenic routes\' Sights read is unchanged: it reads the map\'s places only, not the archive', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'nav', 'scenicRead', 'shell.ts'), 'utf8');
  assert.match(src, /placesFromTilePois\(/);
  assert.ok(!/archive/i.test(src), 'the archive is not wired into the scenic read');
});

// ——— Audit regressions (places-worth-the-stop audit, Nov 6) ———

const fox: PlaceCandidate = { level: 'neighborhood', name: 'Fox', at: CENTRE, reachM: 1000 };
const findOf = (p: Place): Find => ({ key: p.key, area_key: null, walk_id: 'w', capture_id: 'c', found_at: 1, name: p.name, category: p.category, kind: p.kind ?? 'monuments', at: p.at, generic: false });

test('places-worth-the-stop audit 1: a find made on the map\'s place stays found after its area is rebuilt with the archive\'s', () => {
  const tile = { ...tilePlace('Hessian Powder Magazine', 'history', [CENTRE[0] + 0.0003, CENTRE[1]]), kind: 'monuments' as const };
  const found = findOf(tile);
  const archive = placesFromArchive([pt(CENTRE[0] + 0.0003, CENTRE[1] + 0.00002, { name: 'Hessian Powder Magazine', class: 'ruin', src: 'wd', id: 'Q9' })], 'v1');
  const built = buildChecklists({ places: mergePlaces([tile], archive), candidates: [fox], centre: CENTRE, build: 'b1', now: 2, archive: 'v1', finds: [found] });
  const item = built.items.find((i) => i.name === 'Hessian Powder Magazine');
  assert.equal(item?.key, found.key, 'the rebuilt item keeps the find\'s key, so it shows as found and is never found again');
  const ring = ringOf([tile], archive, CENTRE, undefined, [found]);
  assert.ok(ring.marks.some((m) => m.key === found.key), 'the atlas sees the same find');
});

test('places-worth-the-stop audit 2: a find stays found when the next version moves the place a few metres', () => {
  const v1 = placesFromArchive([pt(CENTRE[0] + 0.0004, CENTRE[1], { name: 'Odd Rock', class: 'natural_oddity', src: 'wd', id: 'Q2' })], 'v1')[0];
  const found = findOf(v1);
  const v2 = placesFromArchive([pt(CENTRE[0] + 0.00046, CENTRE[1], { name: 'Odd Rock', class: 'natural_oddity', src: 'wd', id: 'Q2' })], 'v2');
  assert.notEqual(v2[0].key, v1.key, 'the position moved past the key\'s rounding');
  const built = buildChecklists({ places: v2, candidates: [fox], centre: CENTRE, build: 'b1', now: 2, archive: 'v2', finds: [found] });
  assert.equal(built.items[0]?.key, found.key);
});

test('places-worth-the-stop audit 3: a fix in an area built with an older archive version, or none, asks for a read', () => {
  const area = (archive: string | null) => ({ level: 'neighborhood' as const, name: 'Fox', at: CENTRE, build: 'b1', archive });
  const reads = [{ centre: CENTRE, build: 'b1' }];
  assert.deepEqual(readCentre({ fix: CENTRE, candidates: [fox], areas: [area(null)], reads, build: 'b1', archive: 'v1' }), CENTRE, 'built before the archive: read again');
  assert.deepEqual(readCentre({ fix: CENTRE, candidates: [fox], areas: [area('v0')], reads, build: 'b1', archive: 'v1' }), CENTRE, 'an older version: read again');
  assert.equal(readCentre({ fix: CENTRE, candidates: [fox], areas: [area('v1')], reads, build: 'b1', archive: 'v1' }), null);
  assert.equal(readCentre({ fix: CENTRE, candidates: [fox], areas: [area(null)], reads, build: 'b1', archive: null }), null, 'no archive known: nothing to read for');
});

test('PP13: with blocks, an area is tagged and judged at its own point, so one by a block\'s edge is not read on every fix', () => {
  const reads = [{ centre: CENTRE, build: 'b1' }];
  // Its point is in block A; the walker stands just over the edge in block B.
  const tagAt = (at: [number, number]) => (blockKey(at) === blockKey(CENTRE) ? 'b:aaaaaaaaaaaaaaaa' : 'b:bbbbbbbbbbbbbbbb');
  const area = { level: 'neighborhood' as const, name: 'Fox', at: CENTRE, build: 'b1', archive: 'b:aaaaaaaaaaaaaaaa' };
  assert.equal(readCentre({ fix: CENTRE, candidates: [fox], areas: [area], reads, build: 'b1', archive: tagAt }), null);
  assert.equal(tagAt([CENTRE[0], CENTRE[1] + 0.7]), 'b:bbbbbbbbbbbbbbbb', 'a fix in the next block has another tag');
  const built = buildChecklists({ places: [], candidates: [fox], centre: CENTRE, build: 'b1', now: 1, archive: tagAt });
  assert.equal(built.areas[0]?.archive, 'b:aaaaaaaaaaaaaaaa', 'each area records its own block\'s tag');
});

test('places-worth-the-stop audit 4: a version listed but missing is passed over for the previous one, without asking again and again', async () => {
  const ports = fakePorts();
  const prevFile = 'places-us-20261101.pmtiles';
  const { io, log } = fakeIo({ tile: async () => { throw new Error('Bad response code: 404'); } });
  const tiles: string[] = [];
  const io2 = { ...io, open: (url: string) => (log.opened.push(url), { getZxy: async (z: number, x: number, y: number) => {
    tiles.push(`${url.split('/').pop()} ${z}/${x}/${y}`);
    if (url.endsWith('20261108.pmtiles')) throw new Error('Bad response code: 404');
    return { data: new TextEncoder().encode(JSON.stringify([pt(-75.19, 40.69, { name: 'Old Folly', class: 'folly', src: 'wd', id: 'Q7' })])).buffer as ArrayBuffer };
  } }) };
  const archive = createPlacesArchive({ ...ports, io: io2, tileMs: 50, readMs: 100 });
  assert.equal(await archive.read(READ, CENTRE), null, 'the current file is missing');
  const got = await archive.read(READ, CENTRE);
  assert.equal(got?.version, '20261101', 'the previous version is used');
  assert.ok(log.opened.some((u) => u.endsWith(prevFile)));
  assert.equal(archive.versionAt(CENTRE), '20261101', 'the atlas is told the version actually read, so no ring is re-read every two minutes');
  const fetched = log.fetched.length;
  for (let i = 0; i < 5; i++) await archive.read(READ, CENTRE);
  assert.equal(log.fetched.length, fetched, 'the manifest is not asked for again on every read');
});

// Places pipeline (specs/places-pipeline): written before its code (decision 0018).
test('PP13: an area is rebuilt only when its block\'s hash changes, and once for an area tagged with a file version', async () => {
  const here = blockKey(CENTRE);
  assert.equal(here, '8/74/96');
  const withBlocks = (h: string, other = 'cccccccccccccccc', version = '20261108') =>
    JSON.stringify({ ...manifest, regions: [{ ...manifest.regions[0], current: { ...manifest.regions[0].current, file: `places-us-${version}.pmtiles`, version, blocks: { [here]: h, '8/40/90': other } } }] });
  const ports = fakePorts();
  let text = withBlocks('aaaaaaaaaaaaaaaa');
  const { io } = fakeIo({ manifest: async () => text });
  const archive = createPlacesArchive({ ...ports, io });
  const first = await archive.read(READ, CENTRE);
  assert.equal(first?.version, 'b:aaaaaaaaaaaaaaaa', 'an area records its block\'s hash');
  assert.equal(archive.versionAt(CENTRE), 'b:aaaaaaaaaaaaaaaa');
  assert.equal(archive.versionAt([-110, 40]), 'b:none', 'a block with no places');
  assert.equal(archiveStale('20261108', archive.versionAt(CENTRE)), true, 'an area tagged with a file version is rebuilt once');
  assert.equal(archiveStale(first!.version, archive.versionAt(CENTRE)), false);
  // A new file whose other blocks changed but not this one: the area stands.
  text = withBlocks('aaaaaaaaaaaaaaaa', 'dddddddddddddddd', '20261115');
  ports.clock.advance(24 * 3600_000);
  await archive.refresh();
  assert.equal(archiveStale(first!.version, archive.versionAt(CENTRE)), false, 'a new file version alone rebuilds nothing');
  text = withBlocks('bbbbbbbbbbbbbbbb');
  ports.clock.advance(24 * 3600_000);
  await archive.refresh();
  assert.equal(archiveStale(first!.version, archive.versionAt(CENTRE)), true, 'its block changed: rebuilt');
  // A malformed blocks map is ignored, and the file's version is the tag as before.
  const bad = parseManifest(JSON.stringify({ ...manifest, regions: [{ ...manifest.regions[0], current: { ...manifest.regions[0].current, blocks: { here: 'x' } } }] }));
  assert.equal(bad?.regions[0].current.blocks, undefined);
  assert.equal(archiveTag(bad!.regions[0].current, CENTRE), '20261108');
});
