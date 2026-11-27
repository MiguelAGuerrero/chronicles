/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { walkabilityGeoJSON } from '../../../components/map/types';
import { carGroundOf } from '../../walk/carGround';
import { cellBounds, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';

// Urban form, what shows (UF9, UF12), written from specs/walkability-urban-form/spec.md before the code; since G5
// (specs/walkability-car-ground, decision 0232) only the car ground is drawn, as one area with no seam.

const J = 18_600;
const I = -23_800;
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });
const field = (pick: (di: number, dj: number) => CellBand): Cell[] => {
  const out: Cell[] = [];
  for (let dj = 0; dj < 10; dj++) for (let di = 0; di < 10; di++) out.push(cell(I + di, J + dj, pick(di, dj)));
  return out;
};

test('UF1, UF9: car cells are drawn and foot, neither and empty are not; a row of car cells is one shape with no seams', () => {
  const g = carGroundOf(field((di, dj) => (dj === 5 && di >= 3 && di < 7 ? 'car' : di === 1 ? 'neither' : di === 8 ? 'empty' : 'foot')));
  assert.equal(g.areas.filter((a) => a.fade === 0).length, 1, 'four car cells in a row are one shape');
  assert.deepEqual(carGroundOf(field(() => 'foot')).areas, [], 'foot ground is the plain map');
  assert.deepEqual(carGroundOf([cell(1, 1, 'neither'), cell(2, 1, 'empty')]), carGroundOf([]));
});

test('UF9: the key changes only when the picture does, including over different ground with equal counts', () => {
  const a = carGroundOf([cell(100, J, 'foot'), cell(101, J, 'car')]);
  const same = carGroundOf([cell(100, J, 'foot'), cell(101, J, 'car')]);
  const elsewhere = carGroundOf([cell(300, J, 'foot'), cell(301, J, 'car')]);
  assert.equal(a.key, same.key);
  assert.notEqual(a.key, elsewhere.key);
});

test('UF12: what the map is handed carries a kind and nothing else: no number, score or count', () => {
  const fc = walkabilityGeoJSON(carGroundOf(field((di, dj) => (dj >= 4 && dj < 7 && di >= 3 && di < 7 ? 'car' : 'foot'))));
  assert.ok(fc.features.length >= 2);
  for (const f of fc.features) {
    assert.deepEqual(Object.keys(f.properties!), ['kind']);
    assert.ok(['Polygon', 'LineString'].includes(f.geometry.type));
  }
  assert.equal(walkabilityGeoJSON(null).features.length, 0);
});
