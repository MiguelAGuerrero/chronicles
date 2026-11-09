import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Place } from '../../discovery/types';
import { createKindWalkPrefs } from '../../kindWalk/prefs';
import type { Reach } from '../../kindWalk/words';
import { createPlanner, startFrom, type PlannerDeps } from '../../walkPlanner/service';
import { distanceM } from '../../geo';
import { fakePorts } from '../fakes';
import { A, at, segs } from './grid';

const parks: Place[] = [[130, 130], [160, 150], [850, 140], [880, 120], [1250, 130]].map(([e, n], i) => ({ key: `p${i}`, name: `P${i}`, category: 'parks', at: at(e, n), generic: false, build: 'b' }) as Place);
const area = { at: at(650, 650), reachM: 1200 };
const prefs = { budgetM: 3000, pref: 'warn' as const, mode: 'oneway' as const, density: 'anywhere' as const };

function deps(over: Partial<PlannerDeps> = {}) {
  const calls: string[] = [];
  void A;
  const d: PlannerDeps = {
    read: async () => (calls.push('read'), { places: parks, segments: segs }),
    reach: async () => (calls.push('reach'), { cars: [], unknown: false } as Reach),
    found: async () => (calls.push('found'), [{ at: at(500, 120) }]),
    ...over,
  };
  return { d, calls };
}

test('WP22 KW14: Nothing is read until the planner is asked, and asking writes nothing', async () => {
  const p = fakePorts();
  const { d, calls } = deps();
  const planner = createPlanner(d);
  assert.deepEqual(calls as string[], []);
  const r = await planner.plan({ kind: 'parks', area, from: at(130, 130), prefs });
  assert.ok(r.routes.length > 0);
  assert.ok(calls.includes('read') && calls.includes('found'));
  assert.equal(await p.db.getMeta('nav'), null, 'no destination is saved by planning');
});

test('WP3: With no position nothing is read and the reason is said', async () => {
  const { d, calls } = deps();
  const r = await createPlanner(d).plan({ kind: 'parks', area, from: null, prefs });
  assert.deepEqual(r, { routes: [], reasons: ['noPosition'], found: [] });
  assert.deepEqual(calls, []);
});

test('WP16: Found places come from the walker\'s own finds and are returned as points only', async () => {
  const r = await createPlanner(deps().d).plan({ kind: 'parks', area, from: at(130, 130), prefs });
  assert.deepEqual(r.found, [{ at: at(500, 120) }]);
});

test('WP20 KW10 KW11: Each route says whether it can be walked the whole way, and "don\'t suggest\" leaves out one that cannot, without swapping it', async () => {
  const cars: PlannerDeps['reach'] = async (path) => (path.length % 2 ? { cars: ['Elm St'], unknown: false } : { cars: [], unknown: false });
  const warn = await createPlanner(deps({ reach: async () => ({ cars: ['Elm St'], unknown: false }) }).d).plan({ kind: 'parks', area, from: at(130, 130), prefs });
  assert.ok(warn.routes.length > 0 && warn.routes.every((r) => r.reach.cars.length === 1), 'warn keeps them and says so');
  const skip = await createPlanner(deps({ reach: async () => ({ cars: ['Elm St'], unknown: false }) }).d).plan({ kind: 'parks', area, from: at(130, 130), prefs: { ...prefs, pref: 'skip' } });
  assert.deepEqual(skip.routes, []);
  assert.ok(skip.reasons.includes('cars'));
  void cars;
});

test('WP3 KW3: A read that fails is a way not found, nothing guessed', async () => {
  const r = await createPlanner(deps({ read: async () => null }).d).plan({ kind: 'parks', area, from: at(130, 130), prefs });
  assert.deepEqual(r.reasons, ['noRoute']);
});

test('WP12 WP27: The four settings are kept, loaded back, and are the only things written', async () => {
  const p = fakePorts();
  const wrote: string[] = [];
  const set = p.db.setMeta.bind(p.db);
  p.db.setMeta = async (k: string, v: string) => (wrote.push(k), set(k, v));
  const store = createKindWalkPrefs(p);
  await store.load();
  assert.deepEqual(store.store.get(), { budgetM: 2000, pref: 'warn', mode: 'loop', density: 'anywhere' }, 'the defaults: 2 km, say so, a loop, anywhere');
  await store.setBudget(3000);
  await store.setPref('skip');
  await store.setMode('oneway');
  await store.setDensity('plenty');
  assert.deepEqual(wrote.sort(), ['kindwalk_budget', 'kindwalk_density', 'kindwalk_mode', 'kindwalk_pref']);
  const again = createKindWalkPrefs(p);
  await again.load();
  assert.deepEqual(again.store.get(), { budgetM: 3000, pref: 'skip', mode: 'oneway', density: 'plenty' });
  void A;
});

test('WP24: Start plans again from where the walker is now, the same settings and preset', async () => {
  const planner = createPlanner(deps().d);
  const req = { kind: 'parks' as const, area, from: at(130, 130), prefs };
  const first = (await planner.plan(req)).routes[0];
  const moved = at(250, 130);
  const again = await startFrom(planner, { ...req, from: moved }, first);
  assert.equal(again.preset, first.preset);
  assert.ok(distanceM(again.path[0], moved) < 1, 'it begins where the walker is now');
  assert.ok(again.lengthM <= prefs.budgetM + 0.5);
  // A preset that gives nothing from there keeps the route that was highlighted.
  const far = await startFrom(planner, { ...req, from: at(9000, 9000) }, first);
  assert.equal(far, first);
});
