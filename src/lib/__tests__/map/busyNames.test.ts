/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { BASE_FIRST_LABEL, BUSY_NAME_FONT, BUSY_NAME_STALE_INK, HOTSPOT_INK, busyNameLayers, busyNamesGeoJSON } from '../../../components/map/types';
import type { LandingView } from '../../landing/view';
import type { LngLat } from '../../types';

// Explore in a dense city (DC2, DC4, DC6, DC14), written from specs/explore-dense-city/spec.md before the code.

const at = (x: number, y: number): LngLat => [-76.615 + x * 0.001, 39.29 + y * 0.001];
const view = (stale = false): LandingView => ({
  pockets: [],
  graded: [],
  // Heaviest first, as landingView lists them (DC4).
  strips: [
    { name: 'Charles Street', lines: [[at(0, 0), at(1, 0)]], at: at(0.5, 0), stale },
    { name: 'Lexington Street', lines: [[at(0, 1), at(1, 1)]], at: at(0.5, 1), stale },
  ],
  labels: [{ name: 'Mount Vernon', at: at(2, 2), stale }],
});

test('DC1: the font is one the base style\'s glyphs serve (a copy of Positron\'s font list)', () => {
  const style = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'positron-fonts.json'), 'utf8')) as { fonts: string[]; firstLabel: string };
  for (const f of BUSY_NAME_FONT) assert.ok(style.fonts.includes(f), f);
  assert.equal(BASE_FIRST_LABEL, style.firstLabel, 'native puts busy names under the base style\'s first label layer (DC16)');
  assert.deepEqual(busyNameLayers().layout['text-font'], BUSY_NAME_FONT);
});

test('DC2: the names\' layers never overlap each other or ignore the base map\'s labels', () => {
  const { layout } = busyNameLayers();
  assert.equal(layout['text-allow-overlap'], false);
  assert.equal(layout['text-ignore-placement'], false);
  assert.equal(layout['symbol-placement'], 'point', 'one name per street, at one point, never repeated along it');
});

test('DC4: a heavier street sorts first where names compete', () => {
  const names = busyNamesGeoJSON(view());
  const sort = (n: string) => names.features.find((f) => f.properties?.name === n)?.properties?.sort as number;
  assert.ok(sort('Charles Street') < sort('Lexington Street'), 'the lower key is placed first');
  assert.deepEqual(busyNameLayers().layout['symbol-sort-key'], ['get', 'sort']);
});

test('DC4: a label is the street\'s name and nothing more, and every name looks the same whatever its grade', () => {
  const names = busyNamesGeoJSON(view());
  assert.deepEqual(names.features.map((f) => f.properties?.name).sort(), ['Charles Street', 'Lexington Street', 'Mount Vernon']);
  const l = busyNameLayers();
  assert.deepEqual(l.layout['text-field'], ['get', 'name']);
  for (const k of ['text-size', 'text-color', 'text-halo-color', 'text-halo-width', 'text-font']) {
    const v = JSON.stringify(l.layout[k] ?? l.paint[k] ?? '');
    assert.ok(!/weight|grade|sort/.test(v), `${k} never follows a weight, grade or order (${v})`);
  }
  // Only the reserved room (DC14) has its own size: every busy name is the same.
  assert.ok(names.features.every((f) => f.properties?.reserve === false));
});

test('DC6: a stale area\'s names are told apart as its lines are (a greyer ink, explore-dense-city ui 1)', () => {
  assert.ok(busyNamesGeoJSON(view(true)).features.every((f) => f.properties?.stale === true && f.properties?.opacity === 1));
  assert.ok(busyNamesGeoJSON(view(false)).features.every((f) => f.properties?.stale === false && f.properties?.opacity === 1));
  assert.deepEqual(busyNameLayers().paint['text-color'], ['case', ['get', 'stale'], BUSY_NAME_STALE_INK, HOTSPOT_INK]);
});

test('DC14: the selected area\'s name is in the names\' source, invisible, placed first', () => {
  const names = busyNamesGeoJSON(view(), { name: 'Mount Hill', at: at(5, 5) });
  const reserve = names.features.find((f) => f.properties?.reserve);
  assert.equal(reserve?.properties?.name, 'Mount Hill');
  assert.equal(reserve?.properties?.opacity, 0);
  assert.ok(names.features.every((f) => f === reserve || (f.properties?.sort as number) > (reserve?.properties?.sort as number)));
});
