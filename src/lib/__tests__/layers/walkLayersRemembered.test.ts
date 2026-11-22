/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import type { Walk } from '../../types';
import { createLayers } from '../../layers/shell';
import { createWalkLayers } from '../../layers/walkShell';

// fix walk-layers-remembered (decision 0260, amends 0234's MD3 and MD10): the layers chosen on the ready map are the walk's
// too, and a switch on the walk is remembered for every map and the next walk. One setting, `map_layers`, for every map.
// The walk keeps only the spans Places was on (`places_spans:<walk>`, MD9), whichever map switched it.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const spansOf = async (p: ReturnType<typeof fakePorts>, id: string) => JSON.parse((await p.db.getMeta(`places_spans:${id}`)) ?? '[]') as [number, number | null][];
const openWalk = (id: string): Walk => ({ id, started_at: 1000, ended_at: null, title: null, epilogue: null, area: null, open: true, snapped_build: null }) as unknown as Walk;
const make = async (ids: string[] = ['w1', 'w2']) => {
  const p = fakePorts({ now: 1000 });
  for (const id of ids) await p.db.createWalk(openWalk(id));
  const maps = createLayers(p);
  // Typed loosely so the test reads before the fix (the factory took only its ports).
  const walk = (createWalkLayers as unknown as (ports: unknown, maps: unknown, passM: () => Promise<number>) => { begin(id: string | null): Promise<void> })(p, maps, async () => 12);
  return { p, maps, walk };
};
const settle = () => new Promise((r) => setTimeout(r, 0));

/** The walk screen's hook returns the maps' layers whole: nothing of its own laid over them. */
const returnsMapsLayers = (hook: string): boolean => /return useLayers\(\);/.test(hook) && !/walkLayers\.store|\.\.\.useLayers\(\)/.test(hook);

test('fix walk-layers-remembered: the walk screen draws the layers the ready map shows, never a setting of its own', () => {
  assert.ok(returnsMapsLayers(src('src/lib/layers/useWalkLayers.ts')), 'useWalkLayers returns useLayers() as it is');
});

test('fix walk-layers-remembered audit 1: the hook scan fails on a hook that lays its own layers over the maps\'', () => {
  assert.equal(returnsMapsLayers('const own = useStore(walkLayers.store, (s) => s.on);\n  return { ...useLayers(), on: own };'), false);
  assert.equal(returnsMapsLayers('return { ...useLayers(), on: walkLayerDefaults() };'), false);
  assert.equal(returnsMapsLayers('const on = useStore(walkLayers.store, (s) => s.on);\n  return useLayers();'), false);
  assert.equal(returnsMapsLayers('useEffect(() => void walkLayers.begin(walkId), [walkId]);\n  return useLayers();'), true);
});

test('fix walk-layers-remembered: a walk started with Storefronts and Places on keeps them on, and writes no per-walk setting', async () => {
  const { p, maps, walk } = await make();
  await maps.set('storefronts', true);
  await maps.set('places', true);
  await walk.begin('w1');
  await settle();
  assert.equal(await p.db.getMeta('walk_layers:w1'), null, 'no walk_layers is written');
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, null]], 'Places on from the walk\'s start: a span opens for the replay (MD9)');
});

test('fix walk-layers-remembered: a switch during the walk is the maps\' setting, kept for the next walk, and its spans are the walk\'s', async () => {
  const { p, maps, walk } = await make();
  await maps.set('places', false);
  await walk.begin('w1');
  assert.deepEqual(await spansOf(p, 'w1'), [], 'Places off: no span');
  p.clock.advance(500);
  await maps.set('places', true);
  await settle();
  p.clock.advance(500);
  await maps.set('places', false);
  await settle();
  assert.deepEqual(await spansOf(p, 'w1'), [[1500, 2000]], 'the span Places was on during the walk');
  await maps.set('storefronts', true);
  assert.equal(JSON.parse((await p.db.getMeta('map_layers')) ?? '{}').storefronts, true, 'kept as the one setting');
  // The walk ends: a switch after it adds no span (MD9); the next walk starts with what was chosen.
  await walk.begin(null);
  await maps.set('places', true);
  await settle();
  assert.deepEqual(await spansOf(p, 'w1'), [[1500, 2000]], 'nothing after the walk ended');
  await walk.begin('w2');
  await settle();
  assert.equal(maps.store.get().on.storefronts, true, 'the next walk keeps Storefronts');
  assert.equal((await spansOf(p, 'w2')).length, 1, 'and Places, with its span');
});

test('fix walk-layers-remembered: a resumed walk with Places still on keeps its open span; switched off meanwhile, the span closes', async () => {
  const { p, maps, walk } = await make();
  await maps.set('places', true);
  await walk.begin('w1');
  await walk.begin(null);
  await walk.begin('w1');
  await settle();
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, null]], 'one open span, not two');
  await walk.begin(null);
  await maps.set('places', false);
  p.clock.advance(300);
  await walk.begin('w1');
  await settle();
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, 1300]], 'closed as the walk is opened again with Places off');
});

test('fix walk-layers-remembered audit 2: a Places switch after the walk ended, or once it is deleted, writes nothing for it', async () => {
  const { p, maps, walk } = await make();
  await maps.set('places', false);
  await walk.begin('w1');
  // Stop: the walk ends, the walk screen goes to the replay, and nothing tells the shell (no begin(null)).
  await p.db.updateWalk('w1', { ended_at: 2000, open: false } as never);
  await maps.set('places', true);
  await settle();
  assert.equal(await p.db.getMeta('places_spans:w1'), null, 'no span after the walk ended');
  assert.equal(await p.db.getMeta('walk_pass:w1'), null);
  // A walk dropped or deleted while it is open: nothing comes back for it.
  await walk.begin('w2');
  await settle();
  await p.db.deleteWalk('w2');
  p.clock.advance(60_000);
  await maps.set('places', false);
  await maps.set('places', true);
  await settle();
  assert.equal(await p.db.getMeta('places_spans:w2'), null, 'nothing outlives the deleted walk');
});

test('fix walk-layers-remembered audit 3: Places turned on outside the walk screen keeps the walk\'s pass distance (TC9)', async () => {
  const { p, maps, walk } = await make();
  await maps.set('places', false);
  await walk.begin('w1');
  await settle();
  assert.equal(await p.db.getMeta('walk_pass:w1'), null, 'Places off: no pass distance yet');
  await maps.set('places', true);
  await settle();
  assert.equal(await p.db.getMeta('walk_pass:w1'), '12', 'kept as the span opens, from the saved setting');
});
