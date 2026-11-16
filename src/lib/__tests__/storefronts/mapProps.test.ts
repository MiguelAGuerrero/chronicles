/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';

// Storefronts (specs/storefronts, SF10, SF11): what the map is given, written before the code.
type Mark = { at: [number, number]; merged: boolean; place?: { type: string; name: string; at: [number, number]; chain: boolean } };
const types = () =>
  import('../../../components/map/types') as Promise<{
    storefrontsGeoJSON?: (m: readonly Mark[] | null | undefined) => { features: { properties: Record<string, unknown>; geometry: { coordinates: unknown } }[] };
    storefrontLayers?: () => { type: string; paint?: Record<string, unknown> }[];
  }>;
const MARKS: Mark[] = [
  { at: [-75.19, 40.69], merged: false, place: { type: 'books', name: 'Page One', at: [-75.19, 40.69], chain: true } },
  { at: [-75.2, 40.7], merged: true },
];

test('SF11: the map draws storefronts with circle layers only: no symbol layer, so no text can name a shop', { todo: 'test first' }, async () => {
  const { storefrontLayers } = await types();
  assert.equal(typeof storefrontLayers, 'function');
  const layers = storefrontLayers!();
  assert.ok(layers.length > 0 && layers.every((l) => l.type === 'circle'), layers.map((l) => l.type).join());
});

test('SF11: what the map is given holds positions and nothing that could be drawn as a name or a number', { todo: 'test first' }, async () => {
  const { storefrontsGeoJSON } = await types();
  const fc = storefrontsGeoJSON!(MARKS);
  for (const f of fc.features) assert.ok(!Object.keys(f.properties).some((k) => /name|text|label|count|n$|chain|type/i.test(k)), Object.keys(f.properties).join());
  assert.equal(fc.features.length, 2);
});

test('SF10: no mark\'s size, colour or opacity depends on a feature property: every mark is drawn alike', { todo: 'test first' }, async () => {
  const { storefrontLayers } = await types();
  for (const l of storefrontLayers!()) for (const v of Object.values(l.paint ?? {})) assert.ok(!JSON.stringify(v).includes('"get"'), `${JSON.stringify(v)} varies with a property`);
});
