import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { piecesFromBuildingsTile, placesFromPlacesTile } from '../../complexes/overtureSource';
import { fixture } from './fixtures';

// CX15: an adapter and no list. The adapter reads the real fixtures' shape; the core never imports it and holds no name.

const CORE = join(__dirname, '..', '..', 'complexes');
const h = fixture('harrisburg');

test('CX15: the adapter keeps named buildings with their polygons as given, and reads a place\'s taxonomy hierarchy', { todo: 'test first' }, () => {
  const t = h.tiles.find((x) => x.x === 4693 && x.y === 6187)!;
  const feats = [
    ...t.buildings.map((b) => ({ geometry: { type: 'MultiPolygon', coordinates: b.polygons }, properties: { id: b.id, '@name': b.name, subtype: b.subtype ?? undefined, class: b.class ?? undefined } })),
    { geometry: { type: 'Polygon', coordinates: t.buildings[0].polygons[0] }, properties: { id: 'unnamed' } },
  ];
  const pieces = piecesFromBuildingsTile(4693, 6187, feats);
  assert.equal(pieces.length, t.buildings.length, 'an unnamed building is not a piece');
  assert.deepEqual(pieces[0].polygons, t.buildings[0].polygons, 'the geometry is as the tile gave it');
  assert.deepEqual(pieces[0].tile, [4693, 6187]);
  const p = placesFromPlacesTile([{ geometry: { type: 'Point', coordinates: [-76.88, 40.26] }, properties: { id: 'p', taxonomy: JSON.stringify({ hierarchy: ['shopping', 'market', 'farmers_market'] }) } }]);
  assert.deepEqual(p, [{ at: [-76.88, 40.26], hierarchy: ['shopping', 'market', 'farmers_market'] }]);
});

test('CX15: the core imports no adapter and holds no place name or coordinate', { todo: 'test first' }, () => {
  for (const f of readdirSync(CORE).filter((x) => x.endsWith('.ts') && x !== 'overtureSource.ts')) {
    const text = readFileSync(join(CORE, f), 'utf8');
    assert.equal(/overtureSource/.test(text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), false, `${f} imports the adapter`);
    assert.equal(/strawberry|lehigh|harrisburg|whitehall/i.test(text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false, `${f} holds a name`);
  }
});
