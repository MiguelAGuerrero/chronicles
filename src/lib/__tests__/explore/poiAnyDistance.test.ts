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

type CardCapture = (o: { name: string | null; found: boolean }) => { row: boolean; line: string | null };
type MomentsHere = (moments: readonly Moment[], at: LngLat, now: number, walkId?: string | null, findingId?: string | null) => { id: string; line: string }[];
const card = async () => (await import('../../explore/placeCard')) as unknown as { cardCapture: CardCapture; momentsHere: MomentsHere };

const moment = (id: string, at: LngLat, t: number): Moment => ({
  id, walk_id: 'w0', t, lat: at[1], lon: at[0], segment_id: null,
  pieces: [{ id: `${id}-p`, moment_id: id, t, kind: 'photo', file_path: 'x.jpg', body: null } as Moment['pieces'][number]],
});

test('fix poi-any-distance: a named place\'s card offers the row however far the walker stands, with its line', async () => {
  const { cardCapture } = await card();
  for (const far of [150, 800, 5000]) {
    // The card no longer reads the walker's distance at all: the old 60 m gate is gone.
    assert.deepEqual(cardCapture({ name: 'Old Bridge', found: false }), { row: true, line: 'Camera, Voice or Note here keeps the moment with Old Bridge.' }, `${far} m`);
  }
  const body = src('src/lib/explore/placeCard.ts').match(/export function cardCapture[\s\S]*?\n}/)![0];
  assert.ok(!/distanceM|PLACE_REACH_M|kept with it from within/.test(body), 'the row reads no distance, and no line says it waits on 60 m');
});

test('fix poi-any-distance: an unnamed "?" card offers the row too, and its line never names the place', async () => {
  const { cardCapture } = await card();
  const got = cardCapture({ name: null, found: false });
  assert.equal(got.row, true);
  assert.equal(got.line, 'Walk within 60 m to see what it is. Camera, Voice or Note here keeps the moment with it.');
  assert.ok(!/\b(find|found|collect|unlock)\b/i.test(got.line ?? ''), 'describes, never urges (steward S5)');
});

test('fix poi-any-distance: a found place\'s card offers the row at any distance', async () => {
  const { cardCapture } = await card();
  assert.deepEqual(cardCapture({ name: 'Old Bridge', found: true }), { row: true, line: null });
});

test('fix poi-any-distance: "Moments here" lists the moment that found the place, wherever it was taken', async () => {
  const { momentsHere } = await card();
  const now = Date.UTC(2026, 10, 20, 15);
  const at = m(0, 0);
  const ms = [moment('near', m(10, 0), now - 3_600_000), moment('finder', m(900, 0), now - 7_200_000), moment('next-door', m(400, 0), now - 60_000)];
  assert.deepEqual(momentsHere(ms, at, now, null, 'finder').map((x) => x.id), ['near', 'finder'], 'the finder at 900 m is listed; a stranger at 400 m is not');
  assert.deepEqual(momentsHere(ms, at, now, null, null).map((x) => x.id), ['near'], 'with no find, by spot only');
});

test('fix poi-any-distance: the walk screen reads the finding moment for the card, and a "?" row never speaks the name', () => {
  const ex = src('src/lib/explore/useExplore.ts');
  const body = ex.slice(ex.indexOf('const momentsAt'), ex.indexOf('const rangeM'));
  assert.match(body, /getMomentsByIds\(/, 'momentsAt reads the find\'s own moment');
  assert.match(body, /momentsHere\([^)]*finding/, 'and hands it to momentsHere');
  const walk = src('src/app/walk.tsx');
  assert.match(walk, /<PlaceCaptureRow place=\{openMarkNamed \? openMark\.name : null\}/, 'a "?" row is spoken without its name');
  assert.ok(!/here: live\.here, found: openMarkFound/.test(walk), 'cardCapture no longer reads the walker\'s position');
});
