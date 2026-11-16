/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { LAYERS, legendRows } from '../../layers/registry';
import { decodeLayers, layerDefaults } from '../../layers/state';

// Shop marks (specs/shop-marks, SM1-SM3, SM9, SM13): the marks live inside main's one Storefronts layer (decision 0180), not in a layer of their own.
const layer = () => LAYERS.find((l) => l.id === 'storefronts')!;

test('SM1: there is no layer of its own for shop marks: the layers are still Walkability, Storefronts and Town borders', () => {
  assert.deepEqual(LAYERS.map((l) => l.id), ['walkability', 'storefronts', 'borders']);
});

test('SM1, SM3: the Storefronts layer has a second legend row, "Shop marks", with a swatch of its own and a tip that names the source and no types', () => {
  const row = layer().legend.find((r) => r.key === 'shops');
  assert.ok(row, 'a shops row');
  assert.equal(row!.text, 'Shop marks');
  assert.equal(row!.swatch, 'shop-mark');
  assert.match(row!.tip ?? '', /OpenStreetMap/);
  for (const t of [row!.text, row!.tip ?? '']) {
    assert.ok(!/thrift|antique|books|records|worth|errand|best|busy/i.test(t), t);
    assert.ok(!/\d|%/.test(t), t);
  }
});

test('SM2: the "Shop marks" row is listed only where a shop pack\'s address is set; the street shading\'s row always is', () => {
  const without = legendRows(layer(), { shopMarksBase: '' }).map((r) => r.key);
  const withBase = legendRows(layer(), { shopMarksBase: 'https://data.example/shops/' }).map((r) => r.key);
  assert.deepEqual(without, ['places']);
  assert.deepEqual(withBase, ['places', 'shops']);
});

test('SM2: the layer is off by default, a stored setting is read as it was and the marks add no setting of their own', () => {
  assert.equal(layerDefaults().storefronts, false);
  assert.deepEqual(Object.keys(layerDefaults()).sort(), ['borders', 'storefronts', 'walkability']);
  assert.equal(decodeLayers(JSON.stringify({ storefronts: true }), null).storefronts, true, 'once chosen, it stays chosen');
});

test('SM3: the setting is one for every map: switching Storefronts on in one is on in a fresh load, and it brings the marks with it', async () => {
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
