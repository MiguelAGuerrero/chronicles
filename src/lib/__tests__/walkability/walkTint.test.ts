/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { walkabilityGeoJSON } from '../../../components/map/types';
import { cellBounds, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';
import { tintOf } from '../../walk/tint';

// Urban form, what shows (UF9, UF12), written from specs/walkability-urban-form/spec.md before the code.

const J = 5000;
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });

test('UF9: foot and car cells are drawn, neither and empty are not; a row of one reading is one shape with no seams', () => {
  const cells = [cell(100, J, 'foot'), cell(101, J, 'foot'), cell(102, J, 'foot'), cell(103, J, 'car'), cell(104, J, 'neither'), cell(105, J, 'empty'), cell(106, J, 'car'), cell(100, J + 1, 'foot')];
  const t = tintOf(cells);
  assert.equal(t.foot.length, 2, 'three in a row are one shape; the cell in the next row is another');
  assert.equal(t.car.length, 2, 'a gap splits a run');
  const ring = t.foot.find((r) => r.length === 5 && Math.abs(r[2][0] - cellBounds(102, J).east) < 1e-9)!;
  assert.ok(ring, 'the merged shape runs from the first cell\'s west edge to the last cell\'s east edge');
  assert.equal(ring[0][0], cellBounds(100, J).west);
  assert.deepEqual(ring[0], ring[4], 'a closed ring');
  assert.deepEqual(tintOf([cell(1, 1, 'neither'), cell(2, 1, 'empty')]), { foot: [], car: [], key: tintOf([]).key });
});

test('UF9: the key changes only when the picture does, including over different ground with equal counts', () => {
  const a = tintOf([cell(100, J, 'foot'), cell(101, J, 'car')]);
  const same = tintOf([cell(100, J, 'foot'), cell(101, J, 'car')]);
  const elsewhere = tintOf([cell(300, J, 'foot'), cell(301, J, 'car')]);
  assert.equal(a.key, same.key);
  assert.notEqual(a.key, elsewhere.key);
});

test('UF12: what the map is handed carries a band and nothing else: no number, score or count', () => {
  const fc = walkabilityGeoJSON(tintOf([cell(100, J, 'foot'), cell(101, J, 'foot'), cell(103, J, 'car')]));
  assert.equal(fc.features.length, 2);
  for (const f of fc.features) {
    assert.deepEqual(Object.keys(f.properties!), ['band']);
    assert.ok(f.properties!.band === 'foot' || f.properties!.band === 'car');
    assert.equal(f.geometry.type, 'Polygon');
  }
  assert.equal(walkabilityGeoJSON(null).features.length, 0);
});
