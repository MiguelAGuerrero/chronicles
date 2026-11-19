/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// Modes to layers (specs/modes-to-layers MD1, MD2, MD10, MD12, MD13), written before the code. No Explore mode: Places is a
// layer on every map; the live walk's layers belong to that walk and start off every time; the two saved settings are apart.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

test('MD1, MD13: every map lists Places, Explore, the ready map and the live walk', async () => {
  const { layersFor, LAYERS } = await import('../../layers/registry');
  for (const map of ['explore', 'navigate', 'walk'] as const) assert.ok(layersFor(map).some((l) => l.id === 'places'), `${map} lists Places`);
  assert.equal(LAYERS.find((l) => l.id === 'places')?.maps, undefined, 'Places is not limited to a map');
});

test('MD10: the live walk\'s layers all start off, Places included; the key is per walk', async () => {
  const m = (await import('../../layers/state')) as unknown as { walkLayerDefaults?: () => Record<string, boolean>; walkLayersKey?: (id: string) => string; decodeWalkLayers?: (raw: string | null) => Record<string, boolean> };
  assert.ok(m.walkLayerDefaults && m.walkLayersKey && m.decodeWalkLayers, 'the walk-layers helpers exist');
  assert.ok(Object.values(m.walkLayerDefaults()).every((v) => v === false), 'every layer off');
  assert.equal(m.walkLayersKey('w1'), 'walk_layers:w1');
  assert.equal(m.decodeWalkLayers(null).places, false);
  assert.equal(m.decodeWalkLayers(JSON.stringify({ places: true })).places, true);
  assert.equal(m.decodeWalkLayers('{not json').places, false);
});

test('MD10: a walk\'s layers start off for every walk, survive a resume, never reach the next, and leave the map setting alone', async () => {
  const mod = (await import('../../layers/walkShell')) as { createWalkLayers?: (p: unknown) => { store: { get(): { on: Record<string, boolean> } }; begin(id: string): Promise<void>; set(id: string, on: boolean): Promise<void> } };
  assert.ok(mod.createWalkLayers, 'createWalkLayers exists');
  const p = fakePorts();
  const w = mod.createWalkLayers(p);
  await w.begin('w1');
  assert.ok(Object.values(w.store.get().on).every((v) => v === false), 'w1 starts all off');
  await w.set('places', true);
  assert.equal(JSON.parse((await p.db.getMeta('walk_layers:w1')) ?? '{}').places, true);
  assert.equal(await p.db.getMeta('map_layers'), null, 'the map setting is not written');
  await w.begin('w2');
  assert.equal(w.store.get().on.places, false, 'the next walk starts off');
  await w.begin('w1');
  assert.equal(w.store.get().on.places, true, 'a resumed walk keeps its own');
});

test('MD10: deleteWalk removes the walk\'s layers and spans; the three stores delete them', async () => {
  const p = fakePorts();
  await p.db.setMeta('walk_layers:w1', '{"places":true}');
  await p.db.setMeta('places_spans:w1', '[[1,null]]');
  const walk = await p.db.createWalk?.({ id: 'w1', started_at: 1 } as never).catch(() => null);
  void walk;
  for (const f of ['src/lib/db/sqliteStore.ts', 'src/lib/db/index.web.ts', 'src/lib/__tests__/fakes/memoryDb.ts']) {
    assert.ok(/walk_layers|walkLayersKey/.test(src(f)) && /places_spans|placesSpansKey/.test(src(f)), `${f} deletes both families`);
  }
});

test('MD2, MD12: no mode control, no Explore switch, no mode meta in the views, the start plan or the ready shell', () => {
  for (const f of ['src/components/StartSettings.tsx', 'src/app/walk.tsx', 'src/components/walk/useReady.tsx', 'src/lib/ready/shell.ts', 'src/lib/useStartWalk.ts', 'src/lib/startPlan.ts']) {
    assert.ok(!/START_MODE_KEY|parseStartMode|EXPLORE_KEY|testID="explore-walk"|mode-quiet|mode-explore|StartMode/.test(src(f)), `${f} has no mode`);
  }
  const words = ['src/components/StartSettings.tsx', 'src/app/walk.tsx'].map(src).join('\n');
  assert.ok(!/The walk, exploring|Quiet: the way|a quiet walk|Off: a quiet walk/i.test(words), 'no copy says quiet or exploring');
});

test('MD14: the layers write only meta: no walk, trace point, capture or find is touched, and a walk\'s layers go only with the walk', async () => {
  const { createWalkLayers } = await import('../../layers/walkShell');
  const p = fakePorts();
  const w = createWalkLayers(p);
  await w.begin('w1');
  await w.set('places', true);
  await w.set('places', false);
  const calls = p.log.calls('db.');
  assert.ok(calls.length > 0, 'the shell wrote something');
  assert.ok(calls.every((c: string) => /^db\.(getMeta|setMeta)\b/.test(c)), `only meta is read or written (${[...new Set(calls)].join(', ')})`);
});

test('MD15: nothing on the walk, the ready map or the settings counts places or says what is left, and the "?" are never named', () => {
  const copy = ['src/app/walk.tsx', 'src/components/walk/useReady.tsx', 'src/components/StartSettings.tsx', 'src/components/LayersControl.tsx'].map(src).join('\n').replace(/\/\/.*$/gm, '');
  assert.ok(!/left to find|still to find|nearby to find|remaining|\d+ (places|waiting)/i.test(copy));
  const reg = src('src/lib/layers/registry.ts');
  assert.ok(!/waiting to be found|to find|\bleft\b/i.test(reg.slice(reg.indexOf("id: 'places'"))), 'the Places layer\'s name and legend say nothing of what is left');
});
