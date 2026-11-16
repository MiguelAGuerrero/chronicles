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
const tileOf = (polygons: LngLat[][][]): OutlineTile => {
  const [x, y] = outlineTileOf(O);
  return { key: outlineTileKey(x, y), z: 12, x, y, release: 'test', read_at: 1, pieces: [{ id: 'c', name: 'Bigtown', polygons }], points: [] };
};
const tile = () => tileOf(square(0, 0, 80, 80));

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

test('fix carousel-duplicates audit 1: a label 1.5 km outside a covered outline is not a second town', () => {
  const set = outlineSet([tileOf(square(0, 0, 100, 100))]);
  const label: PlaceCandidate = { level: 'town', name: 'Bigtown', at: at(-15, 50), reachM: AREA_REACH_M.town };
  const cands = withOutlines([label], set).filter((c) => c.name === 'Bigtown');
  assert.equal(cands.length, 1);
  assert.equal(newRows([], cands, 'b1', 1).length, 1);
});

test('fix carousel-duplicates audit 2: a same-named label in the empty corner of an L-shaped outline is not joined while the outline has its own', () => {
  const L: LngLat[][][] = [[[at(-20, -20), at(5, -20), at(5, -15), at(-15, -15), at(-15, 50), at(-20, 50), at(-20, -20)]]];
  const set = outlineSet([tileOf(L)]);
  const own: PlaceCandidate = { level: 'town', name: 'Bigtown', at: at(-18, 20), reachM: AREA_REACH_M.town };
  const other: PlaceCandidate = { level: 'town', name: 'Bigtown', at: at(0, 40), reachM: AREA_REACH_M.town };
  const out = withOutlines([own, other], set).filter((c) => c.name === 'Bigtown');
  assert.equal(out.length, 2);
  assert.ok(out.find((c) => c.at[0] === own.at[0])?.outline, 'its own label holds the outline');
  assert.equal(out.find((c) => c.at[0] === other.at[0])?.outline, undefined, 'the other town keeps none');
});

test('fix carousel-duplicates audit 3: a label inside outline A keeps A when a smaller same-named outline lies within 1 km', () => {
  const [x, y] = outlineTileOf(O);
  const t: OutlineTile = { key: outlineTileKey(x, y), z: 12, x, y, release: 'test', read_at: 1, points: [], pieces: [
    { id: 'a', name: 'Bigtown', polygons: square(0, 0, 40, 40) }, { id: 'b', name: 'Bigtown', polygons: square(45, 0, 50, 5) },
  ] };
  const set = outlineSet([t]);
  const label: PlaceCandidate = { level: 'town', name: 'Bigtown', at: at(20, 20), reachM: AREA_REACH_M.town };
  const c = withOutlines([label], set).find((x) => x.at[0] === label.at[0])!;
  assert.equal(c.outline?.id, 'a');
});
