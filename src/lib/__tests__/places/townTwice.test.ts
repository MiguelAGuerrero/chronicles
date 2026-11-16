/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outlineSet, outlineTileKey, outlineTileOf, withOutlines, type OutlineTile } from '../../areas/outlines';
import { AREA_REACH_M } from '../../areas/rules';
import type { PlaceCandidate } from '../../areas/types';
import type { LngLat } from '../../types';
import { ATLAS_CODE, newRows, nearList } from '../../atlas/atlas';

// fix carousel-duplicates: a town's label point just outside its own outline is one town, not two.

const O: LngLat = [-75.0, 40.6];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const square = (x0: number, y0: number, x1: number, y1: number): LngLat[][][] => [[[at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]]];
const tile = (): OutlineTile => {
  const [x, y] = outlineTileOf(O);
  return { key: outlineTileKey(x, y), z: 12, x, y, release: 'test', read_at: 1, pieces: [{ id: 'c', name: 'Bigtown', polygons: square(0, 0, 80, 80) }], points: [] };
};

test('fix carousel-duplicates: a label point a little outside its outline is listed once', () => {
  const set = outlineSet([tile()]);
  const label: PlaceCandidate = { level: 'town', name: 'Bigtown', at: at(-1, 40), reachM: AREA_REACH_M.town };
  const cands = withOutlines([label], set).filter((c) => c.name === 'Bigtown');
  const rows = newRows([], cands, 'b1', 1);
  const list = nearList(rows, at(40, 40), 'town', 'b1');
  assert.equal(rows.length, 1, 'one row');
  assert.equal(list.length, 1, 'one card');
  assert.equal(rows[0].code, ATLAS_CODE);
});
