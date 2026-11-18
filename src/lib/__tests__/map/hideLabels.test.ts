/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BASE_VECTOR_SOURCE, POI_SOURCE_LAYER, poiLabelLayers } from '../../../components/map/types';

// QC24: the basemap's shop and point-of-interest labels are not drawn near a stop.
const root = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(root, p), 'utf8');

test('QC24: the layers hidden are the style\'s symbol layers of the poi source layer, and nothing else', () => {
  const style = [
    { id: 'background', type: 'background' },
    { id: 'highway_minor', type: 'line', 'source-layer': 'transportation' },
    { id: 'highway_name_other', type: 'symbol', 'source-layer': 'transportation_name' },
    { id: 'place_label_city', type: 'symbol', 'source-layer': 'place' },
    { id: 'poi_r20', type: 'symbol', 'source-layer': 'poi' },
    { id: 'poi_r1', type: 'symbol', 'source-layer': 'poi' },
    { id: 'poi_dots', type: 'circle', 'source-layer': 'poi' },
    { id: 'q-pois', type: 'circle' },
  ];
  assert.deepEqual(poiLabelLayers(style), ['poi_r20', 'poi_r1'], 'street, place and water names stay; so does anything the app draws');
  assert.deepEqual(poiLabelLayers([]), []);
  assert.equal(POI_SOURCE_LAYER, 'poi');
  assert.equal(BASE_VECTOR_SOURCE, 'openmaptiles');
});

test('QC24: the outing\'s page and a walk following an outing ask for no labels; both maps honour it', () => {
  assert.match(src('src/components/outing/OutingPage.tsx'), /<WalkMap[\s\S]*?hideLabels[\s\S]*?\/>/);
  assert.match(src('src/app/walk.tsx'), /hideLabels=\{navigation\.nav\?\.dest\?\.outing === true\}/);
  assert.match(src('src/components/map/WalkMap.web.tsx'), /poiLabelLayers\(/);
  assert.match(src('src/components/map/WalkMap.native.tsx'), /setSourceVisibility\(!hideLabels, BASE_VECTOR_SOURCE, POI_SOURCE_LAYER\)/);
});
