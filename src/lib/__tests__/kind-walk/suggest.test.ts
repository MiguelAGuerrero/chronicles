import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Place } from '../../discovery/types';
import { distanceM } from '../../geo';
import { createKindWalk, type KindWalkDeps } from '../../kindWalk/suggest';
import { createKindWalkPrefs } from '../../kindWalk/prefs';
import type { Reach } from '../../kindWalk/words';
import type { LngLat, StreetSegment } from '../../types';
import { fakePorts } from '../fakes';

const A: LngLat = [8.54, 47.37];
const at = (eastM: number, northM: number): LngLat => [A[0] + eastM / (111320 * Math.cos((A[1] * Math.PI) / 180)), A[1] + northM / 111320];
const place = (e: number, n: number, category: Place['category'] = 'parks', extra: Partial<Place> = {}): Place => ({
  key: `${category}${e},${n}`, name: `P${e}`, category, at: at(e, n), generic: false, build: 'b', ...extra,
});
// A street along the equator-ish line of the area, 3 km long, in pieces.
const street = (id: string, a: number, b: number): StreetSegment => ({ id, name: 'Elm St', kind_detail: 'residential', length_m: b - a, geometry: [[at(a, 0), at(b, 0)]], build: 'b' });
const grid = [street('s1', -500, 500), street('s2', 500, 1500), street('s3', 1500, 2500)];
const parks = [place(10, 120), place(40, 130), place(900, 110), place(1400, 120), place(1420, 140)];
const prefs = { budgetM: 1200, pref: 'warn' as const };
const area = { at: A, reachM: 3000 };

function deps(over: Omit<Partial<KindWalkDeps>, 'reach' | 'read'> & { read?: null; places?: Place[]; segs?: StreetSegment[]; reach?: Reach } = {}) {
  const calls: string[] = [];
  const d: KindWalkDeps = {
    read: async () => (calls.push('read'), over.read === null ? null : { places: over.places ?? parks, segments: over.segs ?? grid }),
    reach: over.reach ? async () => (calls.push('reach'), over.reach!) : async () => (calls.push('reach'), { cars: [], unknown: false }),
  };
  return { d, calls };
}

test('KW4 KW5 KW8: one way through the dense cells, near the budget, on the streets', async () => {
  const { d } = deps();
  const r = await createKindWalk(d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.equal(r.state, 'walk');
  if (r.state !== 'walk') return;
  assert.ok(r.walk.lengthM >= 900 && r.walk.lengthM <= 1500, String(r.walk.lengthM));
  assert.equal(r.dest.suggested, true);
  assert.equal(r.dest.kind, 'point');
  assert.deepEqual(r.dest.via?.length, r.walk.stops.length - 1);
});

test('KW6 KW5b: the destination names no place, and a find leaves the way unchanged', async () => {
  const a = await createKindWalk(deps({ places: parks }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  const b = await createKindWalk(deps({ places: parks.map((p) => ({ ...p, found: true }) as Place) }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.deepEqual(a, b);
  if (a.state !== 'walk') return;
  assert.equal(a.dest.label, 'Through green');
  for (const p of parks) assert.ok(!a.dest.label.includes(p.name));
  for (const s of [...a.walk.stops]) assert.ok(parks.every((p) => distanceM(p.at, s) > 1), 'a stop is a cell centre, not a place');
});

test('KW2: a kind with nothing, or one cell, is said, not made into a walk', async () => {
  const none = await createKindWalk(deps({ places: [place(0, 0, 'history')] }).d).suggest({ kind: 'parks', area, from: null, prefs });
  assert.equal(none.state, 'none');
  const few = await createKindWalk(deps({ places: [place(0, 0), place(10, 10)] }).d).suggest({ kind: 'parks', area, from: null, prefs });
  assert.equal(few.state, 'few');
});

test('KW3: with no streets to route on there is no walk and it says so', async () => {
  const r = await createKindWalk(deps({ segs: [] }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.equal(r.state, 'noRoute');
});

test('KW3: a read that fails is a way not found, and nothing is guessed', async () => {
  const r = await createKindWalk(deps({ read: null }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.equal(r.state, 'noRoute');
});

test('KW9b: a walker far from the start is not offered a walk', async () => {
  const r = await createKindWalk(deps().d).suggest({ kind: 'parks', area, from: at(-9000, 0), prefs });
  assert.equal(r.state, 'far');
});

test('KW10 KW11: warn offers the walk with the stretch named; don\'t suggest offers none', async () => {
  const cars: Reach = { cars: ['Elm St'], unknown: false };
  const warn = await createKindWalk(deps({ reach: cars }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.equal(warn.state, 'walk');
  if (warn.state === 'walk') assert.deepEqual(warn.reach.cars, ['Elm St']);
  const skip = await createKindWalk(deps({ reach: cars }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs: { ...prefs, pref: 'skip' } });
  assert.equal(skip.state, 'skipped');
});

test('KW10: nothing could be read says it is not known, and is still offered under warn', async () => {
  const r = await createKindWalk(deps({ reach: { cars: [], unknown: true } }).d).suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.ok(r.state === 'walk' && r.reach.unknown);
});

test('KW11b: with don\'t-suggest the planner reads one chain; it is not re-planned around the stretch', async () => {
  const { d, calls } = deps({ reach: { cars: ['Elm St'], unknown: false } });
  await createKindWalk(d).suggest({ kind: 'parks', area, from: at(0, 0), prefs: { ...prefs, pref: 'skip' } });
  assert.equal(calls.filter((c) => c === 'reach').length, 1);
  assert.equal(calls.filter((c) => c === 'read').length, 1);
});

test('KW14: nothing is read until asked, and asking writes nothing', async () => {
  const p = fakePorts();
  const { d, calls } = deps();
  const kw = createKindWalk(d);
  assert.deepEqual(calls, []);
  await kw.suggest({ kind: 'parks', area, from: at(0, 0), prefs });
  assert.ok(calls.length > 0);
  const metaKeys = (p as unknown as { db: { getMeta: (k: string) => Promise<string | null> } }).db;
  assert.equal(await metaKeys.getMeta('nav'), null, 'no destination is saved by suggesting');
});

test('KW8 KW11 KW14: the two settings are the only things written, and they load back', async () => {
  const p = fakePorts();
  const set = p.db.setMeta.bind(p.db);
  const wrote: string[] = [];
  p.db.setMeta = async (k: string, v: string) => (wrote.push(k), set(k, v));
  const prefsStore = createKindWalkPrefs(p);
  await prefsStore.load();
  assert.deepEqual(prefsStore.store.get(), { budgetM: 2000, pref: 'warn' });
  await prefsStore.setBudget(3000);
  await prefsStore.setPref('skip');
  assert.deepEqual(wrote.sort(), ['kindwalk_budget', 'kindwalk_pref']);
  const again = createKindWalkPrefs(p);
  await again.load();
  assert.deepEqual(again.store.get(), { budgetM: 3000, pref: 'skip' });
});
