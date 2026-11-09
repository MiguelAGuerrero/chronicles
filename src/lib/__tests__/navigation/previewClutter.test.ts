import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forPreview, type ClutterLayers } from '../../nav/previewView';

// fix preview-clutter: with a route preview open, the map showed the walked trace, the faint gap stretches, the fog, the busy streets'
// shading, the town borders and the walkability tint under the blue routes. Only the routes are drawn while choosing one.

const some = (): ClutterLayers => ({
  trace: [[[1, 1], [2, 2]]],
  rides: [[[1, 1], [2, 2]]],
  walked: [{ id: 'w', name: null, kind_detail: 'residential', length_m: 10, geometry: [[[1, 1], [2, 2]]], build: 'b' }],
  fog: [{ id: 'f', name: null, kind_detail: 'residential', length_m: 10, geometry: [[[1, 1], [2, 2]]], build: 'b' }],
  faint: [[[1, 1], [2, 2]]],
  gapLinks: [[[1, 1], [2, 2]]],
  landing: { pockets: [], strips: [] } as unknown as ClutterLayers['landing'],
  borders: { yours: [], others: [] } as unknown as ClutterLayers['borders'],
  walkability: { foot: [], car: [] } as unknown as ClutterLayers['walkability'],
});

test('fix preview-clutter 1: with a preview open, no trace, ride, gap stretch, fog, walked street, hotspot, border or walkability tint is drawn', () => {
  const r = forPreview(true, some());
  assert.deepEqual(r.trace, []);
  assert.deepEqual(r.rides, []);
  assert.deepEqual(r.walked, []);
  assert.deepEqual(r.fog, []);
  assert.deepEqual(r.faint, []);
  assert.deepEqual(r.gapLinks, []);
  assert.equal(r.landing, null);
  assert.equal(r.borders, null);
  assert.equal(r.walkability, null);
});

test('fix preview-clutter 2: without a preview, every layer is drawn as it was', () => {
  const layers = some();
  assert.equal(forPreview(false, layers), layers, 'the same layers, untouched');
});
