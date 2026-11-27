/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { AREA_MIN_M, areaStretches, casingLines, mergeStretches, stretchLines, type Stretch } from '../../walk/ahead';
import { carGroundOf, insideCarGround } from '../../walk/carGround';
import { cellBounds, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';

// Walkability car ground: the route's casing (CG6, CG8, CG11; walkability-car-ground audits 1 and 3), written from
// specs/walkability-car-ground/spec.md before the code.

const J = 18_600;
const I = -23_800;
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });
const field = (w: number, h: number, pick: (di: number, dj: number) => CellBand): Cell[] => {
  const out: Cell[] = [];
  for (let dj = 0; dj < h; dj++) for (let di = 0; di < w; di++) out.push(cell(I + di, J + dj, pick(di, dj)));
  return out;
};
const M_LAT = 110_540;
const mLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);
const metres = (a: LngLat, b: LngLat) => Math.hypot((a[0] - b[0]) * mLon(a[1]), (a[1] - b[1]) * M_LAT);
/** A route due east along the middle of row `dj`, from cell `from` to cell `to`, with a point every cell. */
const eastward = (dj: number, from: number, to: number): LngLat[] => {
  const lat = (cellBounds(I, J + dj).south + cellBounds(I, J + dj).north) / 2;
  const out: LngLat[] = [];
  for (let di = from; di <= to; di++) out.push([cellBounds(I + di, J + dj).west, lat]);
  return out;
};
/** The distance from a point to the nearest point of a polyline, in metres (sampled each metre). */
const toLine = (p: LngLat, line: readonly LngLat[]) => {
  let best = Infinity;
  for (let k = 1; k < line.length; k++) {
    const L = metres(line[k - 1], line[k]);
    for (let t = 0; t <= L; t += 1) {
      const f = L ? t / L : 0;
      best = Math.min(best, metres(p, [line[k - 1][0] + (line[k][0] - line[k - 1][0]) * f, line[k - 1][1] + (line[k][1] - line[k - 1][1]) * f]));
    }
  }
  return best;
};

test('CG6: a stretch\'s line is the route between its fromM and toM, on the route\'s own points', () => {
  const path = eastward(2, 0, 8);
  const [line] = stretchLines(path, [{ fromM: 300, toM: 1300 }]);
  assert.ok(Math.abs(metres(path[0], line[0]) - 300) < 2, 'it begins 300 m along');
  assert.ok(Math.abs(metres(path[0], line[line.length - 1]) - 1300) < 3, 'and ends 1300 m along');
  const inner = path.filter((p) => metres(path[0], p) > 300 && metres(path[0], p) < 1300);
  for (const p of inner) assert.ok(line.some((q) => q[0] === p[0] && q[1] === p[1]), 'the route\'s own points between');
});

test('CG6: a route through car ground is cased where it crosses the hatch', () => {
  const cells = field(14, 6, (di) => (di >= 5 && di < 10 ? 'car' : 'foot'));
  const path = eastward(3, 1, 13);
  const g = carGroundOf(cells);
  const lines = casingLines(path, areaStretches(path, cells), g);
  assert.equal(lines.length, 1, 'one casing');
  const len = lines[0].slice(1).reduce((s, p, k) => s + metres(lines[0][k], p), 0);
  assert.ok(len > 900 && len < 1300, `about the car ground's width (${len.toFixed(0)} m)`);
});

test('walkability-car-ground audit 1: only runs of car ground are cased: a fast road on plain ground is not, an area run under a fast road still is', () => {
  // A fast road over foot ground is a road stretch the heads-up says, but nothing is cased: no car ground is drawn there.
  const foot = field(14, 6, () => 'foot');
  const path = eastward(3, 1, 13);
  assert.deepEqual(casingLines(path, areaStretches(path, foot), carGroundOf(foot)), [], 'no casing on plain ground');
  // An area run the heads-up folds under a fast road (mergeStretches keeps the road) is still cased.
  const cells = field(14, 6, (di) => (di >= 5 && di < 10 ? 'car' : 'foot'));
  const areas = areaStretches(path, cells);
  const over: Stretch = { key: 'Route 6@r', street: 'Route 6', fromM: areas[0].fromM, toM: areas[0].toM };
  assert.ok(!mergeStretches([over], areas).some((s) => s.kind === 'area'), 'the heads-up says it as the road');
  assert.equal(casingLines(path, areas, carGroundOf(cells)).length, 1, 'the casing still marks the car ground');
});

test('walkability-car-ground audit 3: a casing begins and ends within 25 m of the drawn car ground\'s edge', () => {
  const cells = field(14, 6, (di) => (di >= 5 && di < 10 ? 'car' : 'foot'));
  const path = eastward(3, 1, 13);
  const g = carGroundOf(cells);
  const [line] = casingLines(path, areaStretches(path, cells), g);
  const outline = g.areas.filter((a) => a.fade === 0).flatMap((a) => a.shape);
  for (const end of [line[0], line[line.length - 1]]) {
    const d = Math.min(...outline.map((ring) => toLine(end, ring)));
    assert.ok(d < 25, `a casing's end is ${d.toFixed(1)} m from the hatch's edge`);
  }
});

test('walkability-car-ground audit 3: a crossing of car ground under 300 m is uncased', () => {
  // One car cell across the route: 250 m of car ground, under AREA_MIN_M.
  const cells = field(14, 6, (di, dj) => (di === 6 && dj === 3 ? 'car' : 'foot'));
  const path = eastward(3, 1, 13);
  assert.ok(AREA_MIN_M === 300);
  assert.deepEqual(areaStretches(path, cells), [], 'the heads-up says nothing');
  assert.deepEqual(casingLines(path, areaStretches(path, cells), carGroundOf(cells)), [], 'and nothing is cased');
});

test('CG8: the casing adds no point the route does not have between its cuts', () => {
  const cells = field(14, 6, (di) => (di >= 5 && di < 10 ? 'car' : 'foot'));
  const path = eastward(3, 1, 13);
  for (const line of casingLines(path, areaStretches(path, cells), carGroundOf(cells))) for (const p of line) assert.ok(toLine(p, path) < 0.5, 'every point lies on the route');
});

test('CG11: no stretch, no casing; no drawn ground, no casing', () => {
  const path = eastward(3, 1, 13);
  assert.deepEqual(casingLines(path, [], carGroundOf(field(14, 6, () => 'car'))), []);
  assert.deepEqual(insideCarGround(stretchLines(path, [{ fromM: 0, toM: 900 }]), null), []);
});
