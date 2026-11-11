import assert from 'node:assert/strict';
import test from 'node:test';
import { BORDER, COLORS, FOG_BOLD, HOTSPOT, HOTSPOT_INK, RING_COLOR } from '../../../components/map/types';
import { COMPLEX_STYLE, complexMap, inArea } from '../../complexes/mapLayer';
import { COMPLEX_CODE, type Complex } from '../../complexes/types';
import type { LngLat } from '../../types';

// CX9: quiet outlines for the selected area's complexes: no fill, their own hue, no heavier than the area's border, named at close zoom.

const mk = (id: string, name: string, at: LngLat): Complex => ({ id, name, kind: 'shopping', polygons: [[[at, [at[0] + 0.001, at[1]], [at[0] + 0.001, at[1] + 0.001], at]]], at, bbox: [at[0], at[1], at[0] + 0.001, at[1] + 0.001], release: 'r', code: COMPLEX_CODE });
const near = mk('n', 'Strawberry Square', [-76.8826, 40.2599]);
const far = mk('f', 'Lehigh Valley Mall', [-75.4839, 40.6342]);

test('CX9: no fill, a hue no other layer uses, no heavier than the selected border; names only at close zoom', () => {
  const others = [...Object.values(COLORS), HOTSPOT, HOTSPOT_INK, BORDER.color, BORDER.lined, RING_COLOR, FOG_BOLD].map((c) => c.toLowerCase());
  assert.equal(others.includes(COMPLEX_STYLE.color.toLowerCase()), false, 'a hue of its own');
  assert.ok(COMPLEX_STYLE.width > 0 && COMPLEX_STYLE.width <= BORDER.firmWidth);
  assert.ok(COMPLEX_STYLE.opacity > 0 && COMPLEX_STYLE.opacity <= BORDER.firmOpacity);
  assert.equal(Object.keys(COMPLEX_STYLE).some((k) => /fill/i.test(k)), false, 'no fill');
  const far0 = complexMap([near], COMPLEX_STYLE.labelMinZoom - 1);
  assert.deepEqual(far0.labels, [], 'no label until close zoom');
  const close = complexMap([near], COMPLEX_STYLE.labelMinZoom);
  assert.deepEqual(close.labels.map((l) => l.text), ['Strawberry Square · Shopping']);
  assert.equal(close.lines.features.length, 1);
  assert.equal(close.lines.features[0].geometry.type, 'LineString');
  assert.deepEqual(Object.keys(close.lines.features[0].properties).sort(), ['id', 'name', 'word'], 'name and kind word only, no summary or count');
  assert.deepEqual(Object.keys(close).sort(), ['labels', 'lines'], 'the layer adds no summary of its own');
});

test('CX9: only the selected area\'s complexes are drawn, never every area in view', () => {
  assert.deepEqual(inArea([near, far], { at: [-76.88, 40.26], reachM: 1500 }).map((c) => c.id), ['n']);
  assert.deepEqual(inArea([near, far], { at: [-75.48, 40.63], reachM: 1500 }).map((c) => c.id), ['f']);
  assert.deepEqual(inArea([near, far], { at: [-70, 40], reachM: 1500 }), []);
});
