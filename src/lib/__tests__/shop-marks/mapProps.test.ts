/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';

// Shop marks (specs/shop-marks, SM10, SM11): what the map is given, written before the code.
type Mark = { at: [number, number]; merged: boolean; place?: { type: string; name: string; at: [number, number]; chain: boolean } };
const types = () =>
  import('../../../components/map/types') as Promise<{
    shopMarksGeoJSON?: (m: readonly Mark[] | null | undefined) => { features: { properties: Record<string, unknown>; geometry: { coordinates: unknown } }[] };
    shopMarkLayers?: () => { type: string; paint?: Record<string, unknown> }[];
  }>;
const MARKS: Mark[] = [
  { at: [-75.19, 40.69], merged: false, place: { type: 'books', name: 'Page One', at: [-75.19, 40.69], chain: true } },
  { at: [-75.2, 40.7], merged: true },
];

test('SM11: the map draws shop marks with circle layers only: no symbol layer, so no text can name a shop', async () => {
  const { shopMarkLayers } = await types();
  assert.equal(typeof shopMarkLayers, 'function');
  const layers = shopMarkLayers!();
  assert.ok(layers.length > 0 && layers.every((l) => l.type === 'circle'), layers.map((l) => l.type).join());
});

test('SM11: what the map is given holds positions and nothing that could be drawn as a name or a number', async () => {
  const { shopMarksGeoJSON } = await types();
  const fc = shopMarksGeoJSON!(MARKS);
  for (const f of fc.features) assert.ok(!Object.keys(f.properties).some((k) => /name|text|label|count|n$|chain|type/i.test(k)), Object.keys(f.properties).join());
  assert.equal(fc.features.length, 2);
});

test('SM10: no mark\'s size, colour or opacity depends on a feature property: every mark is drawn alike', async () => {
  const { shopMarkLayers } = await types();
  for (const l of shopMarkLayers!()) for (const v of Object.values(l.paint ?? {})) assert.ok(!JSON.stringify(v).includes('"get"'), `${JSON.stringify(v)} varies with a property`);
});

// The UI review (decision 0145, Nov 16): regression tests written before each fix.
const ui = () =>
  import('../../../components/map/types') as Promise<{
    SHOP_MARK?: { color: string; radius: number };
    shopMarkLayers?: () => { id: string; type: string; paint: Record<string, unknown> }[];
    shopSelectedLayers?: () => { id: string; type: string; source: string; paint: Record<string, unknown> }[];
    shopSelectedGeoJSON?: (at: [number, number] | null | undefined) => { features: unknown[] };
  }>;

test('shop-marks ui 1: a mark is a hollow ring, so its shape and not only its tone tells it from the walker\'s solid dot', async () => {
  const { shopMarkLayers, SHOP_MARK } = await ui();
  const l = shopMarkLayers!()[0];
  assert.equal(l.paint['circle-opacity'], 0, 'no fill');
  assert.ok(Number(l.paint['circle-stroke-width']) >= 2, 'a stroke that reads on the map');
  assert.equal(l.paint['circle-stroke-color'], SHOP_MARK!.color);
});

test('shop-marks ui 2: the shop whose card is open is drawn with a larger ring, and none when no card is open', async () => {
  const { shopSelectedLayers, shopSelectedGeoJSON, SHOP_MARK } = await ui();
  assert.equal(typeof shopSelectedGeoJSON, 'function');
  assert.equal(shopSelectedGeoJSON!(null).features.length, 0);
  assert.equal(shopSelectedGeoJSON!([-75.19, 40.69]).features.length, 1);
  const [l] = shopSelectedLayers!();
  assert.equal(l.type, 'circle');
  assert.ok(Number(l.paint['circle-radius']) > SHOP_MARK!.radius, 'larger than a mark at rest, which keeps one size');
  assert.ok(!JSON.stringify(l.paint).includes('"get"'));
});
