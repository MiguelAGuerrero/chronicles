/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { BUSY_NAME_FONT, HOTSPOT_GRADES, busyNameLayers, busyNamesGeoJSON } from '../../../components/map/types';
import type { LandingView } from '../../landing/view';
import type { LngLat } from '../../types';

// Explore in a dense city (DC2, DC4, DC6, DC14), written from specs/explore-dense-city/spec.md before the code.

const at = (x: number, y: number): LngLat => [-76.615 + x * 0.001, 39.29 + y * 0.001];
const view = (stale = false): LandingView => ({
  pockets: [],
  graded: [],
  strips: [
    { name: 'Lexington Street', lines: [[at(0, 1), at(1, 1)]], at: at(0.5, 1), stale, weight: 12 },
    { name: 'Charles Street', lines: [[at(0, 0), at(1, 0)]], at: at(0.5, 0), stale, weight: 30 },
  ],
  labels: [{ name: 'Mount Vernon', at: at(2, 2), weight: 9 }],
} as unknown as LandingView);

test('DC1: the font is one the base style\'s glyphs serve (a copy of Positron\'s font list)', { todo: 'test first' }, () => {
  const style = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'positron-fonts.json'), 'utf8')) as { fonts: string[] };
  for (const f of BUSY_NAME_FONT) assert.ok(style.fonts.includes(f), f);
  const { line, point } = busyNameLayers();
  assert.deepEqual(line.layout['text-font'], BUSY_NAME_FONT);
  assert.deepEqual(point.layout['text-font'], BUSY_NAME_FONT);
});

test('DC2: the names\' layers never overlap each other or ignore the base map\'s labels', { todo: 'test first' }, () => {
  const { line, point } = busyNameLayers();
  for (const l of [line, point]) {
    assert.equal(l.layout['text-allow-overlap'], false);
    assert.equal(l.layout['text-ignore-placement'], false);
  }
  assert.equal(line.layout['symbol-placement'], 'line-center', 'one name per street, never repeated along it');
});

test('DC4: a heavier street sorts first where names compete', { todo: 'test first' }, () => {
  const { lines } = busyNamesGeoJSON(view());
  const sort = (n: string) => lines.features.find((f) => f.properties?.name === n)?.properties?.sort as number;
  assert.ok(sort('Charles Street') < sort('Lexington Street'), 'the lower key is placed first');
  assert.deepEqual(busyNameLayers().line.layout['symbol-sort-key'], ['get', 'sort']);
});

test('DC4: a label is the street\'s name and nothing more, and every name looks the same whatever its grade', { todo: 'test first' }, () => {
  const { lines, points } = busyNamesGeoJSON(view());
  assert.deepEqual([...lines.features, ...points.features].map((f) => f.properties?.name).sort(), ['Charles Street', 'Lexington Street', 'Mount Vernon']);
  const { line, point } = busyNameLayers();
  for (const l of [line, point]) {
    assert.deepEqual(l.layout['text-field'], ['get', 'name']);
    for (const k of ['text-size', 'text-color', 'text-halo-color', 'text-halo-width'])
      assert.ok(!JSON.stringify(l.layout[k] ?? l.paint[k] ?? '').includes('weight') && !JSON.stringify(l.layout[k] ?? l.paint[k] ?? '').includes('grade'), `${k} never follows a weight or grade`);
  }
});

test('DC6: a stale area\'s names are dimmed as its lines are', { todo: 'test first' }, () => {
  const { lines } = busyNamesGeoJSON(view(true));
  assert.ok(lines.features.every((f) => f.properties?.opacity === HOTSPOT_GRADES.staleOpacity));
  assert.ok(busyNamesGeoJSON(view(false)).lines.features.every((f) => f.properties?.opacity === 1));
  assert.deepEqual(busyNameLayers().line.paint['text-opacity'], ['get', 'opacity']);
});

test('DC14: the selected area\'s name is in the names\' source, invisible, placed first', { todo: 'test first' }, () => {
  const { points } = busyNamesGeoJSON(view(), { name: 'Mount Hill', at: at(5, 5) });
  const reserve = points.features.find((f) => f.properties?.reserve);
  assert.equal(reserve?.properties?.name, 'Mount Hill');
  assert.equal(reserve?.properties?.opacity, 0);
  assert.ok(points.features.every((f) => f === reserve || (f.properties?.sort as number) > (reserve?.properties?.sort as number)));
});
