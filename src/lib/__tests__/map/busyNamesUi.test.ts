/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import { BUSY_NAME_STALE_INK, HOTSPOT_INK, busyNameLayers, busyNameRotate, busyNamesGeoJSON } from '../../../components/map/types';
import { alongAngle } from '../../landing/names';
import type { LandingView } from '../../landing/view';
import type { LngLat } from '../../types';

// explore-dense-city's UI review (decision 0145), regression tests written before each fix.

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const lum = (h: string) => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('explore-dense-city ui 1: a stale area\'s names keep 4.5:1 on their halo: a greyer ink at full opacity, never dimmed', () => {
  const at = (x: number): LngLat => [-76.6 + x * 0.001, 39.29];
  const view: LandingView = { pockets: [], graded: [], labels: [], strips: [{ name: 'Charles Street', lines: [[at(0), at(1)]], at: at(0.5), stale: true }] };
  const f = busyNamesGeoJSON(view).features[0];
  assert.equal(f.properties?.opacity, 1, 'never dimmed: opacity takes the halo with it');
  assert.ok(contrast(BUSY_NAME_STALE_INK, '#ffffff') >= 4.5, `stale ink on the halo ${contrast(BUSY_NAME_STALE_INK, '#ffffff').toFixed(2)}:1`);
  assert.deepEqual(busyNameLayers().paint['text-color'], ['case', ['get', 'stale'], BUSY_NAME_STALE_INK, HOTSPOT_INK]);
  assert.equal(f.properties?.stale, true);
});

test('explore-dense-city ui 2: a street within 5 degrees of north-south reads bottom to top, whichever way it leans', () => {
  const m = (x: number, y: number): LngLat => [-76.6 + x / 86000, 39.29 + y / 111320];
  for (const lean of [-4, -1, 0, 1, 4]) {
    const dx = Math.tan((lean * Math.PI) / 180) * 300;
    const a = alongAngle([[m(0, 0), m(dx, 300)]], m(dx / 2, 150));
    assert.ok(a < -80 && a > -100, `leaning ${lean}: ${a}`);
  }
  assert.equal(alongAngle([[m(0, 0), m(0, 300)]], m(0, 150)), -90, 'north-south is -90: the text reads upwards');
});

test('explore-dense-city ui 3: on a turned map every name stays upright on screen', () => {
  for (const bearing of [0, 45, 100, 150, 180, -120, -60]) {
    const expr = createExpression(busyNameRotate(bearing) as never, { type: 'number', 'property-type': 'data-driven', expression: { interpolated: false, parameters: ['zoom', 'feature'] } } as never);
    assert.equal(expr.result, 'success', JSON.stringify(expr));
    for (const angle of [-90, -60, 0, 30, 84]) {
      const r = (expr as unknown as { value: { evaluate(g: unknown, f: unknown): number } }).value.evaluate({ zoom: 15 }, { properties: { angle }, type: 'Point' });
      // On screen a map-aligned name turns by its rotation less the map's bearing; upright is within [-95, 85).
      const s = ((r - bearing) % 360 + 540) % 360 - 180;
      assert.ok(s >= -95 && s < 85, `bearing ${bearing}, angle ${angle}: on screen ${s}`);
      assert.equal(((r - angle) % 180 + 180) % 180, 0, 'only ever turned half round, so it still runs along its street');
    }
  }
  assert.deepEqual(busyNameLayers().layout['text-rotate'], busyNameRotate(0));
});
