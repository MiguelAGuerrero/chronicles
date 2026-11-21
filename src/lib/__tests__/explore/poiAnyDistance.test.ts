/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat, Moment } from '../../types';

// fix poi-any-distance (decision 0247, amending 0246): a place is a point, and a long bridge or a monument seen from
// across a park is still the place a moment is kept with. The card's capture row is offered at any distance, a "?" card
// included (the moment kept names it, as any find does), and a found card's "Moments here" lists the moment that found
// the place wherever it was taken.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

type CardCapture = (o: { name: string | null; found: boolean; riding?: boolean; reach?: string }) => { row: boolean; line: string | null };
type MomentsHere = (moments: readonly Moment[], at: LngLat, now: number, walkId?: string | null, finder?: Moment | null) => { id: string; line: string }[];
const card = async () => (await import('../../explore/placeCard')) as unknown as { cardCapture: CardCapture; momentsHere: MomentsHere };

const moment = (id: string, at: LngLat, t: number): Moment => ({
  id, walk_id: 'w0', t, lat: at[1], lon: at[0], segment_id: null,
  pieces: [{ id: `${id}-p`, moment_id: id, t, kind: 'photo', file_path: 'x.jpg', body: null } as Moment['pieces'][number]],
});
const NOW = Date.UTC(2026, 10, 20, 15);
const momentsAtBody = () => {
  const ex = src('src/lib/explore/useExplore.ts');
  return ex.slice(ex.indexOf('const momentsAt'), ex.indexOf('const rangeM'));
};

test('fix poi-any-distance: a named place\'s card offers the row however far the walker stands, with its line', async () => {
  const { cardCapture } = await card();
  // The card takes no position: whatever the distance, the same answer (the old 60 m gate is gone).
  assert.deepEqual(cardCapture({ name: 'Old Bridge', found: false }), { row: true, line: 'Camera, Voice or Note keeps the moment with Old Bridge.' });
  const body = src('src/lib/explore/placeCard.ts').match(/export function cardCapture[\s\S]*?\n}/)![0];
  assert.ok(!/distanceM|PLACE_REACH_M|here:|kept with it from within/.test(body), 'the row reads no distance, and no line says it waits on 60 m');
});

test('fix poi-any-distance: an unnamed "?" card offers the row too, and its line never names the place', async () => {
  const { cardCapture } = await card();
  const got = cardCapture({ name: null, found: false });
  assert.equal(got.row, true);
  assert.equal(got.line, 'Walk within 60 m to see what it is. Camera, Voice or Note keeps the moment with it.');
  assert.ok(!/\b(find|found|collect|unlock)\b/i.test(got.line ?? ''), 'describes, never urges (steward S5)');
});

test('fix poi-any-distance: a found place\'s card offers the row at any distance', async () => {
  const { cardCapture } = await card();
  assert.deepEqual(cardCapture({ name: 'Old Bridge', found: true }), { row: true, line: null });
});

test('fix poi-any-distance: "Moments here" lists the moment that found the place, wherever it was taken', async () => {
  const { momentsHere } = await card();
  const near = [moment('near', m(10, 0), NOW - 3_600_000), moment('next-door', m(400, 0), NOW - 60_000)];
  const finder = moment('finder', m(900, 0), NOW - 7_200_000);
  assert.deepEqual(momentsHere(near, m(0, 0), NOW, null, finder).map((x) => x.id), ['near', 'finder'], 'the finder at 900 m is listed; a stranger at 400 m is not');
  assert.deepEqual(momentsHere(near, m(0, 0), NOW, null, null).map((x) => x.id), ['near'], 'with no find, by spot only');
});

test('fix poi-any-distance: the walk screen reads the finding moment for the card, and a "?" row never speaks the name', () => {
  const body = momentsAtBody();
  assert.match(body, /getMomentsByIds\(\[finding\]\)/, 'momentsAt reads the find\'s own moment');
  assert.match(body, /momentsHere\(near, at, now, [^,]+, finder\)/, 'and hands it to momentsHere as the finder');
  const walk = src('src/app/walk.tsx');
  assert.match(walk, /<PlaceCaptureRow place=\{openMarkNamed \? openMark\.name : null\}/, 'a "?" row is spoken without its name');
  assert.ok(!/here: live\.here, found: openMarkFound/.test(walk), 'cardCapture no longer reads the walker\'s position');
});

// The review (Nov 20): the auditor's F2-F5 and the UX review's U1.
test('fix poi-any-distance audit 1: on a ride a "?" card offers no row, so nothing unrevealed is named (R12)', async () => {
  const { cardCapture } = await card();
  assert.deepEqual(cardCapture({ name: null, found: false, riding: true }), { row: false, line: 'Walk within 60 m to see what it is.' });
  assert.equal(cardCapture({ name: 'Old Bridge', found: false, riding: true }).row, true, 'a named place is already named');
  assert.match(src('src/app/walk.tsx'), /cardCapture\(\{[^}]*riding: live\.riding/, 'the walk screen hands the card the ride');
});

test('fix poi-any-distance audit 2: the far finder reaches the card through core, and is listed once', async () => {
  const { momentsHere } = await card();
  const finder = moment('finder', m(900, 0), NOW - 7_200_000);
  assert.deepEqual(momentsHere([], m(0, 0), NOW, null, finder).map((x) => x.id), ['finder'], 'a finder with nothing near is listed');
  const nearFinder = moment('nf', m(5, 0), NOW - 60_000);
  assert.deepEqual(momentsHere([nearFinder, nearFinder], m(0, 0), NOW, null, nearFinder).map((x) => x.id), ['nf'], 'read near and as the finder: listed once');
});

test('fix poi-any-distance audit 3: a failed finder read keeps the near moments', () => {
  assert.match(momentsAtBody(), /getMomentsByIds\(\[finding\]\)\.catch\(\(\) => \[\]\)/, 'the finder\'s read failing alone leaves the near list');
});

test('fix poi-any-distance audit 4: the finder stays listed beside three newer near moments', async () => {
  const { momentsHere } = await card();
  const near = [1, 2, 3].map((k) => moment(`n${k}`, m(k * 5, 0), NOW - k * 60_000));
  const finder = moment('finder', m(800, 0), NOW - 9 * 3_600_000);
  assert.deepEqual(momentsHere(near, m(0, 0), NOW, null, finder).map((x) => x.id), ['n1', 'n2', 'finder'], 'three at most, the finder always among them');
  assert.deepEqual(momentsHere(near, m(0, 0), NOW, null, null).map((x) => x.id), ['n1', 'n2', 'n3'], 'with no finder, the newest three');
});

test('fix poi-any-distance audit 5: the card\'s line never says "here" of a place far off, and its 60 m follows the units', async () => {
  const { cardCapture } = await card();
  assert.equal(cardCapture({ name: 'Old Bridge', found: false }).line, 'Camera, Voice or Note keeps the moment with Old Bridge.');
  assert.equal(cardCapture({ name: null, found: false, reach: '200 ft' }).line, 'Walk within 200 ft to see what it is. Camera, Voice or Note keeps the moment with it.');
  assert.match(src('src/app/walk.tsx'), /cardCapture\(\{[^}]*reach: formatDistance\(PLACE_REACH_M\)/, 'the walk screen says the reach in the reader\'s units');
});

// Round 2 of the review (Nov 20): the auditor's F1-F5.
type FindOnKept = (k: { place: string | null; piece: boolean; momentId: string }, found: ReadonlySet<string>, ride?: { riding: boolean; named: boolean }) => { key: string; momentId: string } | null;
test('fix poi-any-distance audit 7: a "?" capture kept once a ride has begun writes no find and says no name', async () => {
  const { findOnKept } = (await import('../../explore/placeCard')) as unknown as { findOnKept: FindOnKept };
  const k = { place: 'k:Bridge', piece: false, momentId: 'm1' };
  assert.equal(findOnKept(k, new Set(), { riding: true, named: false }), null, 'unrevealed, on a ride: nothing named (R12)');
  assert.deepEqual(findOnKept(k, new Set(), { riding: true, named: true }), { key: 'k:Bridge', momentId: 'm1' }, 'already named: the find stands');
  assert.deepEqual(findOnKept(k, new Set(), { riding: false, named: false }), { key: 'k:Bridge', momentId: 'm1' }, 'on foot: a "?" is found');
  const ex = src('src/lib/explore/useExplore.ts');
  assert.match(ex.slice(ex.indexOf('const keptAtPlace')), /findOnKept\([^;]*riding: [^,]*, named: [^)]*\)/, 'keptAtPlace hands the ride and the name at keep time');
});

test('fix poi-any-distance audit 8: a finder newer than the near moments leads; a finder with no pieces is not listed', async () => {
  const { momentsHere } = await card();
  const n1 = moment('n1', m(5, 0), NOW - 7_200_000);
  const finder = moment('f', m(700, 0), NOW - 3_600_000);
  assert.deepEqual(momentsHere([n1], m(0, 0), NOW, null, finder).map((x) => x.id), ['f', 'n1'], 'newest first, finder included');
  assert.deepEqual(momentsHere([n1], m(0, 0), NOW, null, { ...finder, pieces: [] }).map((x) => x.id), ['n1'], 'an empty finder is not a line');
});

test('fix poi-any-distance audit 10: the "?" line in miles reads the reach as the app writes it', async () => {
  const { cardCapture } = await card();
  const { formatDistance } = (await import('../../format')) as unknown as { formatDistance: (m: number, u: 'km' | 'mi') => string };
  const { PLACE_REACH_M } = (await import('../../explore/placeCard')) as unknown as { PLACE_REACH_M: number };
  const ft = formatDistance(PLACE_REACH_M, 'mi');
  assert.match(ft, /ft$/);
  assert.equal(cardCapture({ name: null, found: false, reach: ft }).line, `Walk within ${ft} to see what it is. Camera, Voice or Note keeps the moment with it.`);
});

test('fix poi-any-distance audit 11: the finder\'s read failing is caught to nothing, never rethrown', () => {
  const ok = (body: string) => /getMomentsByIds\(\[finding\]\)\.catch\(\(\) => \[\]\)/.test(body);
  assert.ok(ok(momentsAtBody()), 'momentsAt catches the finder read to an empty list');
  assert.ok(!ok('db.getMomentsByIds([finding]).catch((e) => Promise.reject(e))'), 'a rethrow is caught by the scan');
});
