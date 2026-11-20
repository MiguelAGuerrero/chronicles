/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat, Moment } from '../../types';

// Capture at a place (specs/capture-at-a-place, CA1-CA12): written before the code. The place's card carries Camera,
// Voice and Note; a capture started there carries the place on its stamp and finds it when kept. Nothing is armed.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

type CardCapture = (o: { name: string | null; at: LngLat; here: LngLat | null; found: boolean }) => { row: boolean; line: string | null };
type FindOnKept = (k: { place: string | null; piece: boolean; momentId: string }, found: ReadonlySet<string>) => { key: string; momentId: string } | null;
type MomentsHere = (moments: readonly Moment[], at: LngLat, now: number) => { id: string; line: string }[];
interface PlaceCard {
  cardCapture: CardCapture;
  findOnKept: FindOnKept;
  momentsHere: MomentsHere;
}
const card = async () => (await import('../../explore/placeCard')) as unknown as PlaceCard;
type StampFor = (now: number, pos: { here: LngLat | null; lastFixAt: number | null }, into: string | null, place?: string | null) => { t: number; at: LngLat | null; locate: boolean; into: string | null; place: string | null };
const stamp = async () => ((await import('../../pieceStamp')) as unknown as { stampFor: StampFor }).stampFor;

const moment = (id: string, at: LngLat, t: number, kinds: Moment['pieces'][number]['kind'][] = ['photo']): Moment => ({
  id, walk_id: 'w1', t, lat: at[1], lon: at[0], segment_id: null,
  pieces: kinds.map((kind, i) => ({ id: i ? `${id}-${i}` : id, moment_id: id, t: t + i, kind, file_path: null, body: null })),
});

test('CA1: an unfound named place within 60 m offers the capture row on its card', async () => {
  const { cardCapture } = await card();
  assert.equal(cardCapture({ name: 'Old Bridge', at: m(30, 0), here: O, found: false }).row, true);
  assert.equal(cardCapture({ name: 'Old Bridge', at: m(59, 0), here: O, found: false }).row, true, 'just inside 60 m');
  assert.equal(cardCapture({ name: 'Old Bridge', at: m(30, 0), here: null, found: false }).row, true, 'no fix yet: offered');
  assert.equal(cardCapture({ name: null, at: m(30, 0), here: O, found: false }).row, true, 'an unnamed "?" is too (decision 0247)');
});

test('CA2: a stamp taken from the card carries the place, and the photo or video it keeps finds it', async () => {
  const stampFor = await stamp();
  const { findOnKept } = await card();
  const s = stampFor(1000, { here: O, lastFixAt: 990 }, null, 'k:Old Bridge');
  assert.equal(s.place, 'k:Old Bridge');
  assert.deepEqual(findOnKept({ place: s.place, piece: false, momentId: 'm-video' }, new Set()), { key: 'k:Old Bridge', momentId: 'm-video' });
});

test('CA3: a voice memo begun from the card finds the place when it is saved', async () => {
  const stampFor = await stamp();
  const { findOnKept } = await card();
  // The memo's stamp is taken as it begins (useCaptures' voiceStamp) and kept whole until Stop and save.
  const s = stampFor(2000, { here: null, lastFixAt: null }, null, 'k:Grace Church');
  assert.equal(s.place, 'k:Grace Church');
  assert.deepEqual(findOnKept({ place: s.place, piece: false, momentId: 'm-memo' }, new Set()), { key: 'k:Grace Church', momentId: 'm-memo' });
});

test('CA4: a note begun from the card finds the place when it is kept', async () => {
  const stampFor = await stamp();
  const { findOnKept } = await card();
  // The note's stamp is taken as its page opens (beginNote) and handed to keepNote.
  const s = stampFor(3000, { here: O, lastFixAt: 2999 }, null, 'k:Coffee Exchange');
  assert.deepEqual(findOnKept({ place: s.place, piece: false, momentId: 'm-note' }, new Set()), { key: 'k:Coffee Exchange', momentId: 'm-note' });
});

test('CA5: nothing says "the next moment": no arming in the explore core or the walk screen, and the card describes', async () => {
  const { cardCapture } = await card();
  assert.equal(cardCapture({ name: 'Hessian Memorial', at: m(20, 0), here: O, found: false }).line, 'Camera, Voice or Note here keeps the moment with Hessian Memorial.');
  const explore = src('src/lib/explore/explore.ts');
  for (const gone of ['armedLine', 'armedFind', 'armedStill', 'interface Armed', 'next moment']) assert.ok(!explore.includes(gone), `explore.ts: ${gone} is gone`);
  const walk = src('src/app/walk.tsx');
  for (const gone of ['armed-line', 'armed-cancel', 'mark-capture', 'Capture here', 'explore.armed', 'next moment to', 'ties the next moment']) {
    assert.ok(!walk.includes(gone), `walk.tsx: ${gone} is gone`);
  }
  for (const line of [cardCapture({ name: 'X', at: m(20, 0), here: O, found: false }).line, cardCapture({ name: 'X', at: m(200, 0), here: O, found: false }).line]) {
    assert.ok(!/\b(find|found|collect|unlock)\b/i.test(line ?? ''), `no find, collect or unlock: ${line}`);
  }
});

test('CA6: a capture the card did not start finds nothing, and a piece never carries a place', async () => {
  const stampFor = await stamp();
  const { findOnKept } = await card();
  assert.equal(stampFor(1000, { here: O, lastFixAt: 999 }, null).place, null, 'the stack, the pill and Memories stamp no place');
  assert.equal(findOnKept({ place: null, piece: false, momentId: 'm1' }, new Set()), null);
  assert.equal(stampFor(1000, { here: O, lastFixAt: 999 }, 'open-moment', 'k:Old Bridge').place, null, 'a piece joins its moment, never a place');
  assert.equal(findOnKept({ place: 'k:Old Bridge', piece: true, momentId: 'm1' }, new Set()), null);
});

test('CA7: a card capture that keeps nothing leaves nothing pending', async () => {
  // A find is decided only on a kept moment (findOnKept is the only path); a cancel keeps none, so there is no state to
  // outlive it. The walk screen holds no arming for the next capture to pick up.
  const walk = src('src/app/walk.tsx');
  assert.ok(!/explore\.(arm|disarm)\(/.test(walk), 'the walk screen arms nothing');
  const hook = src('src/lib/explore/useExplore.ts');
  assert.ok(!/setArmed|armedRef|armedFind/.test(hook), 'useExplore keeps no arming');
  const { findOnKept } = await card();
  assert.equal(typeof findOnKept, 'function');
});

// CA9 as amended by decision 0247 (fix poi-any-distance): a place is a point, so the row no longer waits on 60 m.
test('CA9: farther than 60 m a place still offers the row, and its line describes', async () => {
  const { cardCapture } = await card();
  assert.deepEqual(cardCapture({ name: 'Old Bridge', at: m(150, 0), here: O, found: false }), { row: true, line: 'Camera, Voice or Note here keeps the moment with Old Bridge.' });
  assert.deepEqual(cardCapture({ name: null, at: m(150, 0), here: O, found: false }), { row: true, line: 'Walk within 60 m to see what it is. Camera, Voice or Note here keeps the moment with it.' });
});

test('CA10: a stamp with a place is the same stamp otherwise: its time, its fix and whether to locate', async () => {
  const stampFor = await stamp();
  for (const pos of [{ here: O, lastFixAt: 990 }, { here: O, lastFixAt: 1 }, { here: null, lastFixAt: null }]) {
    const { place, ...withPlace } = stampFor(1000, pos, null, 'k:Old Bridge');
    const { place: none, ...plain } = stampFor(1000, pos, null);
    assert.deepEqual(withPlace, plain, JSON.stringify(pos));
    assert.equal(place, 'k:Old Bridge');
    assert.equal(none, null);
  }
});

test('CA11: a found place\'s card lists the moments within 60 m, newest first, three at most, in words', async () => {
  const { momentsHere } = await card();
  const day = 24 * 3600_000;
  const now = new Date(2026, 10, 20, 15, 0).getTime();
  const at = m(0, 0);
  const got = momentsHere([
    moment('old', m(10, 0), now - 9 * day),
    moment('far', m(80, 0), now - 2 * 3600_000),
    moment('mid', m(-20, 5), now - 3 * day, ['voice', 'photo']),
    moment('new', m(5, 5), now - 3600_000, ['video']),
    moment('newer', m(0, 40), now - 1800_000, ['text']),
  ], at, now);
  assert.deepEqual(got.map((x) => x.id), ['newer', 'new', 'mid'], 'within 60 m, newest first, three');
  assert.match(got[0].line, /^A note, this afternoon$/i);
  assert.match(got[1].line, /^A video, this afternoon$/i);
  assert.match(got[2].line, /^A voice memo and a photo, /);
  for (const x of got) assert.ok(!/\b\d+ (moments|captures)\b/.test(x.line), `no count: ${x.line}`);
  assert.deepEqual(momentsHere([], at, now), []);
});

test('CA11: a found place offers the row too, with no line of its own', async () => {
  const { cardCapture } = await card();
  assert.deepEqual(cardCapture({ name: 'Old Bridge', at: m(20, 0), here: O, found: true }), { row: true, line: null });
  assert.deepEqual(cardCapture({ name: 'Old Bridge', at: m(150, 0), here: O, found: true }), { row: true, line: null }, 'at any distance (decision 0247)');
});

test('CA12: a capture from a found place\'s card writes no second find', async () => {
  const { findOnKept } = await card();
  assert.equal(findOnKept({ place: 'k:Old Bridge', piece: false, momentId: 'm2' }, new Set(['k:Old Bridge'])), null);
});

// The UI review (Nov 20). U1: the card's line names its own buttons, so the stack's look-alike buttons beside it are not
// read as doing the same (H4); U3: a moment of the walk in progress is said as on this walk, never "late last night".
test('capture-at-a-place ui 2: the card\'s line names the card\'s own buttons', async () => {
  const { cardCapture } = await card();
  assert.equal(cardCapture({ name: 'Hessian Memorial', at: m(20, 0), here: O, found: false }).line, 'Camera, Voice or Note here keeps the moment with Hessian Memorial.');
});

test('capture-at-a-place ui 3: a moment of the walk in progress is said as on this walk', async () => {
  const { momentsHere } = (await card()) as unknown as { momentsHere: (ms: readonly Moment[], at: LngLat, now: number, walkId?: string | null) => { id: string; line: string }[] };
  const now = new Date(2026, 10, 20, 1, 30).getTime();
  const got = momentsHere([moment('this', m(5, 0), now - 60_000, ['video']), { ...moment('other', m(5, 5), now - 3 * 24 * 3600_000, ['text']), walk_id: 'w0' }], m(0, 0), now, 'w1');
  assert.equal(got[0].line, 'A video, on this walk');
  assert.ok(!/on this walk/.test(got[1].line), got[1].line);
});
