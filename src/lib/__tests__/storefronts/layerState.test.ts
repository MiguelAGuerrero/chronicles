/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { LAYERS } from '../../layers/registry';
import { decodeLayers, layerDefaults } from '../../layers/state';

// Storefronts (specs/storefronts, SF1-SF3, SF13): the layer in the registry and the state, written before the code.
const entry = () => LAYERS.find((l) => l.id === 'storefronts');
const registry = () => import('../../layers/registry') as Promise<{ offeredLayers?: (o: { storefrontsBase: string }) => readonly { id: string }[] }>;

test('SF1: Storefronts is a layer of its own, named for what it is, with an icon and words that are not Busy streets\'', { todo: 'test first' }, () => {
  const s = entry();
  assert.ok(s, 'the registry has a storefronts entry');
  const busy = LAYERS.find((l) => l.id === 'busy')!;
  assert.equal(s!.name, 'Storefronts');
  assert.notEqual(s!.icon, busy.icon);
  assert.ok(!/busy|streets/i.test(`${s!.name} ${s!.note ?? ''}`));
});

test('SF1, SF3: the meaning is in the panel\'s one note and one legend row for the drawers; neither names a list of types', { todo: 'test first' }, () => {
  const s = entry();
  assert.ok(s);
  assert.equal(s!.legend.length, 1);
  assert.ok((s!.note ?? '').length > 0 && /OpenStreetMap/.test(s!.note!));
  for (const t of [s!.note ?? '', ...s!.legend.flatMap((r) => [r.text, r.tip ?? ''])]) assert.ok(!/thrift|antique|books|records|worth|errand|best/i.test(t), t);
});

test('SF2: it is off by default, and a stored setting from before it reads it off', { todo: 'test first' }, () => {
  assert.equal(entry()?.defaultOn, false);
  assert.equal(layerDefaults().storefronts, false);
  assert.equal(decodeLayers(JSON.stringify({ walkability: true, busy: true, borders: false }), null).storefronts, false);
  assert.equal(decodeLayers(JSON.stringify({ storefronts: true }), null).storefronts, true, 'once chosen, it stays chosen');
});

test('SF2: with no storefront address the row is not offered; with one it is', { todo: 'test first' }, async () => {
  const { offeredLayers } = await registry();
  assert.equal(typeof offeredLayers, 'function', 'offeredLayers exists');
  assert.ok(!offeredLayers!({ storefrontsBase: '' }).some((l) => l.id === 'storefronts'));
  assert.ok(offeredLayers!({ storefrontsBase: 'https://data.example/storefronts/' }).some((l) => l.id === 'storefronts'));
  assert.deepEqual(offeredLayers!({ storefrontsBase: '' }).map((l) => l.id), ['walkability', 'busy', 'borders']);
});

test('SF3: the setting is one for every map: switching it on in one is on in a fresh load', { todo: 'test first' }, async () => {
  const { createLayers } = await import('../../layers/shell');
  const { fakePorts } = await import('../fakes');
  const p = fakePorts();
  const a = createLayers(p);
  await a.load();
  await a.set('storefronts', true);
  const b = createLayers(p);
  await b.load();
  assert.equal(b.store.get().on.storefronts, true);
});
