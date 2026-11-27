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
function insideRing(p: LngLat, ring: readonly LngLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
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
  // A route crossing a car block on a slant, measured along the route against where the hatch is drawn (the auditor: a
  // right-angle crossing could not fail).
  const cells = field(14, 8, (di, dj) => (di >= 5 && di < 10 && dj >= 2 && dj < 7 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  const a: LngLat = [cellBounds(I + 1, J + 2).west, cellBounds(I, J + 2).south + 30 / M_LAT];
  const b: LngLat = [cellBounds(I + 13, J + 6).west, cellBounds(I, J + 6).south];
  const path: LngLat[] = [a, b];
  const lines = casingLines(path, areaStretches(path, cells), g);
  assert.ok(lines.length >= 1, 'cased');
  const L = metres(a, b);
  const at = (m: number): LngLat => [a[0] + ((b[0] - a[0]) * m) / L, a[1] + ((b[1] - a[1]) * m) / L];
  let [first, last] = [Infinity, -Infinity];
  for (let m = 0; m <= L; m += 1) if (g.areas.some((x) => insideRing(at(m), x.shape[0]) && !x.shape.slice(1).some((h) => insideRing(at(m), h)))) [first, last] = [Math.min(first, m), m];
  const ends = lines.flat().map((p) => metres(a, p));
  assert.ok(Math.abs(Math.min(...ends) - first) < 25, `the casing begins ${Math.min(...ends).toFixed(0)} m along, the hatch ${first} m`);
  assert.ok(Math.abs(Math.max(...ends) - last) < 25, `the casing ends ${Math.max(...ends).toFixed(0)} m along, the hatch ${last} m`);
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

// The diff review's round (the owner's answers of Nov 27, the coordinator's rulings), written before the code.

test('CG6: a small slate dot marks where each casing starts, and nothing else is said', async () => {
  const { carRouteGeoJSON } = await import('../../../components/map/types');
  const cells = field(14, 6, (di) => (di >= 5 && di < 10 ? 'car' : 'foot'));
  const path = eastward(3, 1, 13);
  const lines = casingLines(path, areaStretches(path, cells), carGroundOf(cells));
  const fc = carRouteGeoJSON(lines);
  const starts = fc.features.filter((f) => f.geometry.type === 'Point');
  assert.equal(starts.length, lines.length, 'one start a casing');
  assert.deepEqual((starts[0].geometry as GeoJSON.Point).coordinates, lines[0][0], 'at the casing\'s first point, in the route\'s direction');
  for (const f of fc.features) assert.deepEqual(Object.keys(f.properties ?? {}), ['kind'], 'a kind and nothing else: no number, no words');
});

test('walkability-car-ground audit 9: the casing ends where it ends: no round cap reaches past the hatch\'s edge', async () => {
  const { ROUTE_CAR_LAYOUT } = await import('../../../components/map/types');
  assert.equal(ROUTE_CAR_LAYOUT['line-cap'], 'butt');
});

// The auditor's findings (the diff review's round, Nov 27), written before the code.

test('walkability-car-ground audit 13: at a concave corner the casing runs as far as the drawn hatch along the route', () => {
  // Car ground everywhere but a foot quadrant (columns 7 on, rows 7 on); the route runs east 10 m inside the quadrant's
  // southern edge, where the smoothed car ground bulges past the cells.
  const cells = field(14, 14, (di, dj) => (di >= 7 && dj >= 7 ? 'foot' : 'car'));
  const lat = cellBounds(I, J + 7).south + 10 / M_LAT;
  const path: LngLat[] = [];
  for (let di = 1; di <= 13; di++) path.push([cellBounds(I + di, J + 7).west, lat]);
  const g = carGroundOf(cells);
  const lines = casingLines(path, areaStretches(path, cells), g);
  const along = (p: LngLat) => metres(path[0], [p[0], path[0][1]]);
  const drawnTo = (() => {
    let last = 0;
    for (let m = 0; m <= along(path[path.length - 1]); m += 1) {
      const p: LngLat = [path[0][0] + m / mLon(lat), lat];
      if (g.areas.some((a) => insideRing(p, a.shape[0]))) last = m;
    }
    return last;
  })();
  const casedTo = Math.max(...lines.flat().map(along));
  assert.ok(Math.abs(casedTo - drawnTo) < 25, `the casing ends ${casedTo.toFixed(0)} m along, the hatch ${drawnTo} m`);
});

test('walkability-car-ground audit 16: a route\'s casing never takes another route\'s runs', async () => {
  const { createAheadWatch } = await import('../../walk/aheadWatch');
  const { fakePorts } = await import('../fakes');
  const { casingRunsFor } = await import('../../walk/ahead');
  const w = createAheadWatch(fakePorts());
  const run = { key: 'area@1,1', kind: 'area' as const, street: null, fromM: 100, toM: 600 };
  w.stretches('route-a', [run], [run]);
  assert.deepEqual(casingRunsFor('route-a', w.store.get()), [run]);
  assert.deepEqual(casingRunsFor('route-b', w.store.get()), [], 'a new route, before its own runs are read, has none');
});
