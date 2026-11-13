/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { BASE_FIRST_LABEL, busyLayerOrder, busyNameLayers, busyNamesGeoJSON, roomCells } from '../../../components/map/types';
import type { LandingView } from '../../landing/view';
import type { LngLat } from '../../types';

// explore-dense-city's audit (decision 0074) and the owner's calls at it: regression tests written before each fix.

const at = (x: number, y: number): LngLat => [-76.615 + x / 86000, 39.29 + y / 111320];
const view: LandingView = {
  pockets: [], graded: [], labels: [],
  strips: [
    { name: 'Level Street', lines: [[at(0, 0), at(300, 0)]], at: at(150, 0), stale: false },
    { name: 'Upright Avenue', lines: [[at(0, 0), at(0, 300)]], at: at(0, 150), stale: false },
    { name: 'Far Street', lines: [[at(2000, 0), at(2300, 0)]], at: at(2150, 0), stale: false },
  ],
};

test('explore-dense-city audit 1: only a near-level name may slide off its point; a turned one stays centred on its street', () => {
  const l = busyNameLayers() as unknown as { layout: Record<string, unknown>; filter: unknown[]; turned: { layout: Record<string, unknown>; filter: unknown[] } };
  assert.deepEqual(l.layout['text-variable-anchor'], ['center', 'left', 'right']);
  assert.equal(l.turned.layout['text-variable-anchor'], undefined, 'a turned name never slides: maplibre would shift it across the street');
  assert.equal(l.turned.layout['text-anchor'], 'center');
  // Each name is in exactly one of the two layers, by its turn.
  const level = (angle: number) => JSON.stringify(l.filter).includes('angle') && Math.abs(angle) <= 15;
  for (const angle of [0, 10, -15]) assert.equal(level(angle), true, `${angle}`);
  assert.ok(JSON.stringify(l.turned.filter).includes('angle'));
});

test('explore-dense-city audit 6: off Explore, native puts the busy lines and then the names under the base labels, names over lines', () => {
  assert.deepEqual(busyLayerOrder(false), { lines: BASE_FIRST_LABEL, names: BASE_FIRST_LABEL });
  assert.deepEqual(busyLayerOrder(true), { lines: BASE_FIRST_LABEL, names: undefined }, 'on Explore the names go over everything');
});

test('explore-dense-city audit 8: with the Busy layer off, no names and no rooms: nothing hides a base label', () => {
  const off = busyNamesGeoJSON(null, { name: 'Mount Hill', at: at(0, 0) }, [at(10, 10)]);
  assert.deepEqual(off.features, []);
});

test('explore-dense-city audit 11: a control\'s rectangle is covered by room points no more than 40 px apart, inside it', () => {
  const rect = { x: 10, y: 20, w: 140, h: 60 };
  const cells = roomCells(rect);
  assert.ok(cells.length >= 4);
  for (const [x, y] of cells) assert.ok(x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h, `${x},${y}`);
  // Every point of the rectangle is within 20 px of a cell along each axis.
  for (let x = rect.x; x <= rect.x + rect.w; x += 5)
    for (let y = rect.y; y <= rect.y + rect.h; y += 5)
      assert.ok(cells.some(([cx, cy]) => Math.abs(cx - x) <= 20 && Math.abs(cy - y) <= 20), `${x},${y} uncovered`);
});

test('explore-dense-city audit 13: the font fixture ships its licence and copyright', () => {
  const dir = path.join(__dirname, '..', '..', '..', '..', 'scripts', 'e2e', 'fixtures', 'fonts');
  const ofl = fs.readFileSync(path.join(dir, 'OFL.txt'), 'utf8');
  assert.match(ofl, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(ofl, /Copyright .*Noto/);
});

test('DC18: off Explore, names only within 800 m of you; the lines are untouched', () => {
  const near = busyNamesGeoJSON(view, null, [], { at: at(0, 0), m: 800 });
  assert.deepEqual(near.features.map((f) => f.properties?.name).sort(), ['Level Street', 'Upright Avenue']);
  assert.equal(busyNamesGeoJSON(view).features.length, 3, 'Explore passes no limit here (EC7 has its own)');
  assert.equal((busyNameLayers() as unknown as { minzoom?: number }).minzoom, 13, 'from zoom 13');
});
