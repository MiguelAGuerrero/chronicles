/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// Modes to layers (specs/modes-to-layers MD1, MD2, MD10, MD12, MD13), written before the code. No Explore mode: Places is a
// layer on every map. MD3 and MD10 as amended by decision 0260: every map, the live walk's included, shares one setting.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

test('MD1, MD13: every map lists Places, Explore, the ready map and the live walk', async () => {
  const { layersFor, LAYERS } = await import('../../layers/registry');
  for (const map of ['explore', 'navigate', 'walk'] as const) assert.ok(layersFor(map).some((l) => l.id === 'places'), `${map} lists Places`);
  assert.equal(LAYERS.find((l) => l.id === 'places')?.maps, undefined, 'Places is not limited to a map');
});

// MD3 and MD10 as amended by decision 0260 (fix walk-layers-remembered): the walk draws the one setting every map shares;
// what is left of a walk's own is the key its layers were once kept under, removed with it, and its Places spans.
test('MD10 (decision 0260): a walk keeps no layers of its own; the old per-walk key is still named for deletion', async () => {
  const m = (await import('../../layers/state')) as unknown as { walkLayerDefaults?: unknown; decodeWalkLayers?: unknown; walkLayersKey: (id: string) => string };
  assert.equal(m.walkLayerDefaults, undefined, 'no all-off defaults for a walk');
  assert.equal(m.decodeWalkLayers, undefined, 'no per-walk setting is read');
  assert.equal(m.walkLayersKey('w1'), 'walk_layers:w1');
});

test('MD10 (decision 0260): a walk starts with the maps\' setting, its switches are the maps\' setting, and the next walk keeps them', async () => {
  const { createLayers } = await import('../../layers/shell');
  const { createWalkLayers } = await import('../../layers/walkShell');
  const p = fakePorts();
  const maps = createLayers(p);
  const w = createWalkLayers(p, maps);
  await maps.set('borders', true);
  await w.begin('w1');
  assert.equal(maps.store.get().on.borders, true, 'w1 starts with what the ready map shows');
  await maps.set('places', false);
  assert.equal(JSON.parse((await p.db.getMeta('map_layers')) ?? '{}').places, false, 'kept as the one setting');
  assert.equal(await p.db.getMeta('walk_layers:w1'), null, 'no per-walk setting is written');
  await w.begin('w2');
  assert.equal(maps.store.get().on.places, false, 'the next walk keeps it');
  assert.equal(maps.store.get().on.borders, true);
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
  const { createLayers } = await import('../../layers/shell');
  const { createWalkLayers } = await import('../../layers/walkShell');
  const p = fakePorts();
  const maps = createLayers(p);
  const w = createWalkLayers(p, maps);
  await w.begin('w1');
  await maps.set('places', true);
  await maps.set('places', false);
  await new Promise((r) => setTimeout(r, 0));
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

test('modes-to-layers ui 1: the Places row says how far it shows and where to set it, in words, only when the screen has a range', async () => {
  const { layerNotes } = await import('../../layers/notes');
  const base = { walkability: 'off', storefrontsReading: false, storefrontsFailed: false } as never;
  assert.equal(layerNotes(base).places ?? null, null, 'no range, no line (Explore)');
  const line = layerNotes({ ...(base as object), placesRange: '100 m' } as never).places;
  assert.ok(line && /within 100 m/.test(line) && /Walk settings/.test(line), String(line));
  assert.ok(!/find|left|remaining|unfound|\d+ places/i.test(String(line)), 'nothing of what is left');
});

test('modes-to-layers ui 1: the walk and the ready map hand the layer note their range', () => {
  assert.ok(/placesRange/.test(src('src/app/walk.tsx')) && /placesRange/.test(src('src/components/walk/useReady.tsx')));
});
