/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { areaStretches, mergeStretches, STRETCH_MIN_M, warningLine, type Stretch } from '../../walk/ahead';
import { cellBounds, cellIndexOf, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';

// Urban form, the heads-up's second reason (UF15), written from specs/walkability-urban-form/spec.md before the code.

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
/** Cells along the route east: each of the given bands for `len` metres. */
function strip(bands: [CellBand, number][]): Cell[] {
  const cells: Cell[] = [];
  let x = 0;
  for (const [band, len] of bands) {
    for (let m = x; m < x + len; m += 20) {
      const { i, j } = cellIndexOf(at(m + 10));
      if (!cells.some((c) => c.i === i && c.j === j)) cells.push({ i, j, ...cellBounds(i, j), band });
    }
    x += len;
  }
  return cells;
}
const route = [at(0), at(2000)];

test('UF15: a run of car cells of 300 m or more along the route is a stretch, with no street name and no number', () => {
  assert.equal(STRETCH_MIN_M, 100);
  const found = areaStretches(route, strip([['foot', 600], ['car', 600], ['foot', 800]]));
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'area');
  assert.equal(found[0].street, null);
  // Cells are 250 m, so a run's ends fall on cell edges, up to a cell either side of the ground.
  assert.ok(found[0].fromM > 400 && found[0].fromM < 750 && found[0].toM > 1050 && found[0].toM < 1500, JSON.stringify(found[0]));
  assert.equal(warningLine(found[0]), 'Next: an area built around cars');
  assert.ok(!/\d/.test(warningLine(found[0])));
  assert.deepEqual(areaStretches(route, strip([['foot', 900], ['car', 200], ['foot', 900]])), [], 'under 300 m');
  assert.deepEqual(areaStretches(route, strip([['foot', 2000]])), []);
  assert.deepEqual(areaStretches(route, strip([['neither', 2000]])), [], 'only car cells');
});

test('UF15: a run is said once, keyed by where it is, so a reroute over it is the same run', () => {
  const cells = strip([['foot', 600], ['car', 600], ['foot', 800]]);
  const [a] = areaStretches(route, cells);
  const [b] = areaStretches([at(300), at(2000)], cells);
  assert.equal(a.key, b.key);
});

test('UF15: a run that overlaps a fast-road stretch is said once, as the road', () => {
  const road: Stretch = { key: 'Route 22@b', street: 'Route 22', fromM: 700, toM: 1000 };
  const area: Stretch = { key: 'area@x', street: null, kind: 'area', fromM: 600, toM: 1200 };
  const apart: Stretch = { key: 'area@y', street: null, kind: 'area', fromM: 1500, toM: 1900 };
  const merged = mergeStretches([road], [area, apart]);
  assert.deepEqual(merged.map((s) => s.key), ['Route 22@b', 'area@y']);
  assert.deepEqual(mergeStretches([], []), []);
});
