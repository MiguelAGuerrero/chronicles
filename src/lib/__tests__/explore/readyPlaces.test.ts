/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { ChecklistItem } from '../../explore/explore';
import type { LngLat } from '../../types';

// Places on the ready map (RQ1-RQ18, specs/ready-map-places): the "?" around you on Navigate's map before Start, written
// before the code. The screens' half is the `readyplaces` journey.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '');

type Surface = { places: boolean; reads: boolean; alerts: boolean; card: 'walk' | 'ready' | null; only: string | null };
type SurfaceIn = { walkOpen: boolean; walkPlaces: boolean; readyPlaces: boolean; readyActive: boolean; destKey: string | null };
const explore = async () =>
  (await import('../../explore/explore')) as unknown as {
    placesSurface?: (o: SurfaceIn) => Surface;
    destinationMark?: (o: { items: ChecklistItem[]; key: string | null; here: LngLat | null; found: Set<string>; revealed: Set<string> }) => { item: ChecklistItem; state: string }[];
    readyDest?: (item: ChecklistItem, named: boolean) => { at: LngLat; label: string; kind: string; placeKey?: string };
    visibleMarks: typeof import('../../explore/explore').visibleMarks;
  };

const O: LngLat = [-77.4336, 37.5387];
/** A point `m` metres east of O. */
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const item = (key: string, m: number, o: Partial<ChecklistItem> = {}): ChecklistItem => ({ key, area_key: 'a', name: key, category: 'history', kind: 'monuments', at: east(m), generic: false, ...o });
const before = (o: Partial<SurfaceIn> = {}): SurfaceIn => ({ walkOpen: false, walkPlaces: false, readyPlaces: true, readyActive: true, destKey: null, ...o });

test('RQ2: before Start, the places shown are visibleMarks around the ready fix within the range', async () => {
  const m = await explore();
  assert.ok(m.placesSurface, 'placesSurface exists');
  const s = m.placesSurface(before());
  assert.equal(s.places, true);
  // The walk's own rule around the ready map's fix: within the range, nearest first, named within 60 m.
  const items = [item('capitol', 10), item('statue', 90), item('mansion', 150)];
  const shown = m.visibleMarks({ items, here: O, rangeM: 100, found: new Set(), hidden: new Set(), revealed: new Set() });
  assert.deepEqual(shown.map((x) => [x.item.key, x.state]), [['capitol', 'named'], ['statue', 'unknown']]);
});

test('RQ4: with Places off before Start, placesSurface draws nothing and reads nothing', async () => {
  const m = await explore();
  assert.ok(m.placesSurface, 'placesSurface exists');
  const s = m.placesSurface(before({ readyPlaces: false }));
  assert.deepEqual([s.places, s.reads, s.card, s.only], [false, false, null, null]);
});

test('RQ5: before Start, a read is allowed only while the ready screen is in front', async () => {
  const m = await explore();
  assert.ok(m.placesSurface, 'placesSurface exists');
  assert.equal(m.placesSurface(before()).reads, true);
  assert.equal(m.placesSurface(before({ readyActive: false })).reads, false);
  assert.equal(m.placesSurface(before({ readyActive: false })).places, false);
  // The read itself is the walk's: one queue, the same failure wait (`retryAllowed`, `readCentre`), unchanged.
  const hook = src('src/lib/explore/useExplore.ts');
  assert.match(hook, /surface\.reads/, 'useExplore gates its reads on the surface, not on a walk alone');
});

test('RQ8: before Start, placesSurface never alerts and gives the ready card, never the walk\'s capture card', async () => {
  const m = await explore();
  assert.ok(m.placesSurface, 'placesSurface exists');
  const s = m.placesSurface(before());
  assert.equal(s.alerts, false);
  assert.equal(s.card, 'ready');
  // On a walk with Places on, as today.
  const w = m.placesSurface(before({ walkOpen: true, walkPlaces: true }));
  assert.deepEqual([w.places, w.reads, w.alerts, w.card, w.only], [true, true, true, 'walk', null]);
});

test('RQ9: a walk opened from the ready map takes the walk\'s layers, not the ready map\'s', async () => {
  const m = await explore();
  assert.ok(m.placesSurface, 'placesSurface exists');
  // Places on before Start, off on the walk (MD3): the walk draws nothing, but still reads (checklists build on every walk).
  const w = m.placesSurface(before({ walkOpen: true, walkPlaces: false, readyPlaces: true }));
  assert.deepEqual([w.places, w.reads, w.alerts, w.card, w.only], [false, true, false, null, null]);
});

test('RQ14: Set as destination from a ready "?" is a find destination with the place\'s key', async () => {
  const m = await explore();
  assert.ok(m.readyDest, 'readyDest exists');
  const it = item('capitol', 10, { name: 'Virginia State Capitol' });
  assert.deepEqual(m.readyDest(it, false), { at: it.at, label: 'A place to find', kind: 'find', placeKey: 'capitol' });
  assert.deepEqual(m.readyDest(it, true), { at: it.at, label: 'Virginia State Capitol', kind: 'find', placeKey: 'capitol' });
});

test('RQ18: on a walk to a place with Places off, placesSurface draws only that place, with its card', async () => {
  const m = await explore();
  assert.ok(m.placesSurface && m.destinationMark, 'placesSurface and destinationMark exist');
  const s = m.placesSurface(before({ walkOpen: true, walkPlaces: false, destKey: 'mansion' }));
  assert.deepEqual([s.places, s.card, s.only, s.alerts], [false, 'walk', 'mansion', false]);
  // Places on: every "?" as before, the destination among them.
  assert.equal(m.placesSurface(before({ walkOpen: true, walkPlaces: true, destKey: 'mansion' })).only, null);
  // The one place, at any distance, unnamed until 60 m or revealed; found when found; nothing for an unknown key.
  const items = [item('capitol', 10), item('mansion', 900)];
  const one = m.destinationMark({ items, key: 'mansion', here: O, found: new Set(), revealed: new Set() });
  assert.deepEqual(one.map((x) => [x.item.key, x.state]), [['mansion', 'unknown']]);
  assert.deepEqual(m.destinationMark({ items, key: 'mansion', here: east(880), found: new Set(), revealed: new Set() }).map((x) => x.state), ['named']);
  assert.deepEqual(m.destinationMark({ items, key: 'mansion', here: O, found: new Set(['mansion']), revealed: new Set() }).map((x) => x.state), ['found']);
  assert.deepEqual(m.destinationMark({ items, key: 'gone', here: O, found: new Set(), revealed: new Set() }), []);
  // Before Start there is no walk's destination to keep.
  assert.equal(m.placesSurface(before({ destKey: 'mansion' })).only, null);
});

test('RQ17: the Places note says reading or not available while a ready read runs or failed, never a count', async () => {
  const { layerNotes } = (await import('../../layers/notes')) as unknown as { layerNotes: (s: Record<string, unknown>) => Record<string, string | null> };
  const base = { walkability: 'off', storefrontsReading: false, storefrontsFailed: false, placesRange: '100 m' };
  assert.equal(layerNotes({ ...base, placesRead: 'reading' }).places, 'Reading…');
  assert.equal(layerNotes({ ...base, placesRead: 'failed' }).places, 'Not available now');
  assert.equal(layerNotes({ ...base, placesRead: null }).places, 'Shows places within 100 m. Set in Walk settings.');
  for (const r of ['reading', 'failed', null]) assert.ok(!/\d+ (places|left)/.test(String(layerNotes({ ...base, placesRead: r }).places)));
});

test('RQ11: no copy in ReadyPlaceCard or the ready map\'s wiring says how many, left or nearby to find', () => {
  const card = src('src/components/walk/ReadyPlaceCard.tsx');
  assert.ok(card, 'ReadyPlaceCard exists');
  const copy = [card, src('src/components/walk/useReady.tsx')].join('\n').replace(/\/\/.*$/gm, '');
  assert.ok(!/left to find|still to find|nearby to find|remaining|\{[^}]*\.length\}/i.test(copy), 'no count or left-to-find copy');
  // RQ6: no capture row before Start.
  assert.ok(!/PlaceCaptureRow/.test(card), 'the ready card has no capture row');
});
