/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { createLayers } from '../../layers/shell';
import { createWalkLayers } from '../../layers/walkShell';

// fix walk-layers-remembered (decision 0260, amends 0234's MD3 and MD10): the layers chosen on the ready map are the walk's
// too, and a switch on the walk is remembered for every map and the next walk. One setting, `map_layers`, for every map.
// The walk keeps only the spans Places was on (`places_spans:<walk>`, MD9), whichever map switched it.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const spansOf = async (p: ReturnType<typeof fakePorts>, id: string) => JSON.parse((await p.db.getMeta(`places_spans:${id}`)) ?? '[]') as [number, number | null][];
const make = () => {
  const p = fakePorts({ now: 1000 });
  const maps = createLayers(p);
  // Typed loosely so the test reads before the fix (the factory took only its ports).
  const walk = (createWalkLayers as unknown as (ports: unknown, maps: unknown) => { begin(id: string | null): Promise<void> })(p, maps);
  return { p, maps, walk };
};

test('fix walk-layers-remembered: the walk screen draws the layers the ready map shows, never a setting of its own', () => {
  const hook = src('src/lib/layers/useWalkLayers.ts');
  assert.ok(/useLayers\(\)/.test(hook), 'useWalkLayers returns the maps\' layers (useLayers)');
  assert.ok(!/walkLayers\.store/.test(hook), 'no per-walk store is read');
});

test('fix walk-layers-remembered: a walk started with Storefronts and Places on keeps them on, and writes no per-walk setting', async () => {
  const { p, maps, walk } = make();
  await maps.set('storefronts', true);
  await maps.set('places', true);
  await walk.begin('w1');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(maps.store.get().on.storefronts, true);
  assert.equal(maps.store.get().on.places, true);
  assert.equal(await p.db.getMeta('walk_layers:w1'), null, 'no walk_layers is written');
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, null]], 'Places on from the walk\'s start: a span opens for the replay (MD9)');
});

test('fix walk-layers-remembered: a switch during the walk is the maps\' setting, kept for the next walk, and its spans are the walk\'s', async () => {
  const { p, maps, walk } = make();
  await maps.set('places', false);
  await walk.begin('w1');
  assert.deepEqual(await spansOf(p, 'w1'), [], 'Places off: no span');
  p.clock.advance(500);
  await maps.set('places', true);
  await new Promise((r) => setTimeout(r, 0));
  p.clock.advance(500);
  await maps.set('places', false);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(await spansOf(p, 'w1'), [[1500, 2000]], 'the span Places was on during the walk');
  await maps.set('storefronts', true);
  assert.equal(JSON.parse((await p.db.getMeta('map_layers')) ?? '{}').storefronts, true, 'kept as the one setting');
  // The walk ends: a switch after it adds no span (MD9); the next walk starts with what was chosen.
  await walk.begin(null);
  await maps.set('places', true);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(await spansOf(p, 'w1'), [[1500, 2000]], 'nothing after the walk ended');
  await walk.begin('w2');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(maps.store.get().on.storefronts, true, 'the next walk keeps Storefronts');
  assert.equal((await spansOf(p, 'w2')).length, 1, 'and Places, with its span');
});

test('fix walk-layers-remembered: a resumed walk with Places still on keeps its open span; switched off meanwhile, the span closes', async () => {
  const { p, maps, walk } = make();
  await maps.set('places', true);
  await walk.begin('w1');
  await walk.begin(null);
  await walk.begin('w1');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, null]], 'one open span, not two');
  await walk.begin(null);
  await maps.set('places', false);
  p.clock.advance(300);
  await walk.begin('w1');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(await spansOf(p, 'w1'), [[1000, 1300]], 'closed as the walk is opened again with Places off');
});
