import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createRefResolver } from '../../refPlaces/shell';
import { createRefValues } from '../../refValues/shell';
import type { Place } from '../../discovery/types';
import type { LngLat, StreetSegment } from '../../types';
import { fakePorts } from '../fakes';

// Reference keywords (specs/reference-keywords): the resolver and the setting, as shells over fakes.

const FIX: LngLat = [-71.4, 41.8];
const east = (m: number): LngLat => [FIX[0] + m / 83_000, FIX[1]];
const place = (name: string, at: LngLat, extra: Partial<Place> = {}): Place => ({ key: `${name}${at}`, name, category: 'culture', at, generic: false, build: 'b', markable: true, ...extra });
const street = (name: string): StreetSegment => ({ id: name, name, kind_detail: 'residential', length_m: 100, geometry: [[[FIX[0] - 0.001, FIX[1]], [FIX[0] + 0.001, FIX[1]]]], build: 'b' });
const T = Date.UTC(2026, 9, 20, 14, 20);

test('RK4: the moment\'s saved fix wins over the editor\'s when they differ', async () => {
  const p = fakePorts();
  const far: LngLat = [-71.3, 41.8];
  await p.db.putPlaces([place('Science Center', east(10)), place('Old Mill', far)]);
  const r = createRefResolver(p, { offsetOf: () => 0, clockOf: () => '14:20' });
  const names = async (f: { saved: LngLat | null; stamp: LngLat | null }) => (await r.placeEntries(f)).filter((e) => e.key === 'here').map((e) => e.value);
  assert.deepEqual(await names({ saved: FIX, stamp: far }), ['Science Center'], 'the saved fix, not the editor\'s stamp');
  assert.deepEqual(await names({ saved: far, stamp: FIX }), ['Old Mill']);
  assert.deepEqual(await names({ saved: null, stamp: FIX }), ['Science Center'], 'no saved fix: the stamp');
  assert.deepEqual((await r.placeEntries({ saved: null, stamp: null })).map((e) => e.key), ['there'], 'no fix at all: only the picker');
  assert.equal(r.timeEntries(T).find((e) => e.word === 'now')?.value, '14:20');
});

test('RK11: resolving, showing and correcting make no network request; only the local places reader is called', async () => {
  const p = fakePorts();
  await p.db.putPlaces([place('Science Center', east(10)), place('Planetarium', east(200)), place('Hidden gem', east(15), { markable: false })]);
  await p.db.putSegments([street('Main St')]);
  const real = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = (async () => {
    fetched++;
    throw new Error('network');
  }) as typeof fetch;
  try {
    const r = createRefResolver(p, { offsetOf: () => 0 });
    const entries = await r.placeEntries({ saved: FIX, stamp: null });
    const list = await r.nearby({ saved: FIX, stamp: null });
    assert.equal(entries.find((e) => e.key === 'here')?.value, 'Science Center');
    assert.deepEqual(list.map((x) => x.name), ['Science Center', 'Planetarium'], 'a place that is never a mark (S19, S20) is not offered');
  } finally {
    globalThis.fetch = real;
  }
  assert.equal(fetched, 0);
});

test('RK14: the time entries are there at once; place entries arrive when the read does, and a slow or failed read blocks nothing', async () => {
  const p = fakePorts();
  const r = createRefResolver(p, { readMs: 20, offsetOf: () => 0 });
  assert.ok(r.timeEntries(T).length > 5, 'synchronous: nothing awaited');
  // A read that never answers: the palette goes on with "over there" alone.
  const slow = { ...p, db: { ...p.db, placesIn: () => new Promise<Place[]>(() => {}), getSegmentsIn: () => new Promise<StreetSegment[]>(() => {}) } };
  const started = Date.now();
  const keys = (await createRefResolver(slow, { readMs: 20, offsetOf: () => 0 }).placeEntries({ saved: FIX, stamp: null })).map((e) => e.key);
  assert.deepEqual(keys, ['there']);
  assert.ok(Date.now() - started < 1000, 'gave up in about the read\'s own time');
  // A failed read the same.
  const failing = { ...p, db: { ...p.db, placesIn: async (): Promise<Place[]> => { throw new Error('db'); }, getSegmentsIn: async (): Promise<StreetSegment[]> => { throw new Error('db'); } } };
  assert.deepEqual((await createRefResolver(failing, { offsetOf: () => 0 }).placeEntries({ saved: FIX, stamp: null })).map((e) => e.key), ['there']);
  assert.deepEqual(await createRefResolver(failing, { offsetOf: () => 0 }).nearby({ saved: FIX, stamp: null }), []);
});

test('RK15: no location call: the resolver is given a fix and never asks for one', () => {
  const src = readFileSync(new URL('../../refPlaces/shell.ts', import.meta.url), 'utf8') + readFileSync(new URL('../../refKeywords.ts', import.meta.url), 'utf8');
  assert.ok(!/locate|getCurrentPosition|watchPosition|expo-location|geolocation|requestForeground/i.test(src), 'neither module can ask the phone where it is');
  assert.ok(!/from '\.\.\/(locate|recorder|lastFix)/.test(src));
});

test('RK19: the values setting is on by default, is kept, and a bad saved value falls back to on', async () => {
  const p = fakePorts();
  const v = createRefValues(p);
  assert.equal(v.store.get(), true, 'on before anything is read');
  await v.load();
  assert.equal(v.store.get(), true, 'nothing saved: on');
  await v.save(false);
  assert.equal(v.store.get(), false);
  const again = createRefValues(p);
  await again.load();
  assert.equal(again.store.get(), false, 'kept');
  await again.save(true);
  const third = createRefValues(p);
  await third.load();
  assert.equal(third.store.get(), true);
  await p.db.setMeta('ref_values', 'banana');
  const bad = createRefValues(p);
  await bad.load();
  assert.equal(bad.store.get(), true, 'a bad saved value: on');
  // A failed write still leaves it changed on screen.
  const failing = createRefValues(p);
  await failing.load();
  p.db.failNext('setMeta', new Error('disk'));
  await assert.rejects(failing.save(false));
  assert.equal(failing.store.get(), false, 'a failed write leaves it changed on screen');
});
