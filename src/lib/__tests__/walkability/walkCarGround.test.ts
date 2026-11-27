/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import type { LngLat } from '../../types';
import { GROUND_FADE_M, carGroundOf, type CarGround } from '../../walk/carGround';
import { cellBounds, cellsFor, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';
import type { WayFacts } from '../../walk/types';

// Walkability car ground (CG1, CG3, CG4, CG11; walkability-car-ground audit 2), written from
// specs/walkability-car-ground/spec.md before the code.

const J = 18_600;
const I = -23_800;
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });
/** A field of read cells, `band` where `pick` says, else foot. */
const field = (w: number, h: number, pick: (di: number, dj: number) => CellBand, i0 = I, j0 = J): Cell[] => {
  const out: Cell[] = [];
  for (let dj = 0; dj < h; dj++) for (let di = 0; di < w; di++) out.push(cell(i0 + di, j0 + dj, pick(di, dj)));
  return out;
};
const centre = (c: Cell): LngLat => [(c.west + c.east) / 2, (c.south + c.north) / 2];
const M_LAT = 110_540;
const mLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);
const metres = (a: LngLat, b: LngLat) => Math.hypot((a[0] - b[0]) * mLon(a[1]), (a[1] - b[1]) * M_LAT);

function inside(p: LngLat, ring: readonly LngLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** Whether a point lies in the drawn car ground, any fade step. */
const drawn = (g: CarGround, p: LngLat) => g.areas.some((a) => inside(p, a.shape[0]) && !a.shape.slice(1).some((h) => inside(p, h)));
const whole = (g: CarGround) => g.areas.filter((a) => a.fade === 0);
const vertices = (g: CarGround) => g.areas.flatMap((a) => a.shape.flat());

test('CG1: only car cells are drawn: foot, neither and empty cells draw nothing', () => {
  for (const band of ['foot', 'neither', 'empty'] as CellBand[]) {
    const g = carGroundOf(field(8, 8, () => band));
    assert.deepEqual([g.areas.length, g.edges.length], [0, 0], `${band} draws nothing`);
  }
  // A block of car cells in a wide field of foot: the block is drawn, the foot ground around it is the plain map.
  const cells = field(12, 12, (di, dj) => (di >= 4 && di < 8 && dj >= 4 && dj < 8 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  for (const c of cells.filter((x) => x.band === 'car' && x.i - I >= 5 && x.i - I <= 6 && x.j - J >= 5 && x.j - J <= 6)) assert.ok(drawn(g, centre(c)), 'the car block is drawn');
  for (const c of cells.filter((x) => x.band === 'foot' && (x.i - I < 2 || x.i - I > 9 || x.j - J < 2 || x.j - J > 9))) assert.ok(!drawn(g, centre(c)), 'foot ground is not');
});

test('CG3: neighbouring car cells are one area', () => {
  const g = carGroundOf(field(12, 12, (di, dj) => (di >= 5 && di < 7 && dj >= 5 && dj < 7 ? 'car' : 'foot')));
  assert.equal(whole(g).length, 1, 'four car cells side by side are one shape');
  assert.equal(whole(g)[0].shape.length, 1, 'with no hole');
});

test('CG3: a stair of cells is drawn as one slope, no 250 m step', () => {
  // Car below a diagonal: in row dj, the cells left of 4 + dj. The edge between car and foot is a stair of 250 m steps.
  const cells = field(16, 12, (di, dj) => (di < 2 + dj ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  // The edge's points in the middle rows, away from the field's own edge.
  const lo = cellBounds(I, J + 3).south;
  const hi = cellBounds(I, J + 8).north;
  const pts = g.edges.flatMap((e) => e.shape).filter((p) => p[1] > lo && p[1] < hi);
  assert.ok(pts.length > 10, `the stair has an edge (${pts.length} points)`);
  // Fit a line lon = a + b * lat through them; a stair of 250 m steps strays about 60 m from it, a slope much less.
  const n = pts.length;
  const [my, mx] = [pts.reduce((s, p) => s + p[1], 0) / n, pts.reduce((s, p) => s + p[0], 0) / n];
  const b = pts.reduce((s, p) => s + (p[1] - my) * (p[0] - mx), 0) / pts.reduce((s, p) => s + (p[1] - my) ** 2, 0);
  const worst = Math.max(...pts.map((p) => Math.abs(p[0] - (mx + b * (p[1] - my))) * mLon(p[1])));
  assert.ok(worst < 30, `the edge strays at most 30 m east or west of one slope (${worst.toFixed(1)} m)`);
});

test('CG3: corners round', () => {
  const cells = field(12, 12, (di, dj) => (di >= 4 && di < 8 && dj >= 4 && dj < 8 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  const sw = cellBounds(I + 4, J + 4);
  const corner: LngLat = [sw.west, sw.south];
  const nearest = Math.min(...vertices(g).map((p) => metres(p, corner)));
  assert.ok(nearest > 40, `the drawn corner keeps more than 40 m inside the cells' square corner (${nearest.toFixed(1)} m)`);
  // Halfway along a side, the outline stays near the cells' own edge.
  const mid: LngLat = [(sw.west + cellBounds(I + 7, J + 4).east) / 2, sw.south];
  const side = Math.min(...vertices(g).map((p) => metres(p, mid)));
  assert.ok(side < 30, `mid-side, within 30 m of the cells' edge (${side.toFixed(1)} m)`);
});

test('CG3: deterministic: the same cells in any order, or read with more ground around them, draw the same', () => {
  const cells = field(12, 12, (di, dj) => (di >= 4 && di < 8 && dj >= 4 && dj < 9 ? 'car' : 'foot'));
  const a = carGroundOf(cells);
  const b = carGroundOf([...cells].reverse());
  assert.deepEqual(b, a, 'order does not matter');
  // Another car block 3 km east, read with it: the first block's shape does not move.
  const more = [...cells, ...field(6, 6, () => 'car', I + 20, J + 3)];
  const c = carGroundOf(more);
  const near = (g: CarGround) => g.areas.filter((x) => x.shape[0].every((p) => p[0] < cellBounds(I + 12, J).west)).map((x) => x.shape);
  const [na, nc] = [near(a), near(c)];
  assert.equal(nc.length, na.length);
  nc.forEach((s, k) => s.forEach((ring, r) => ring.forEach((p, v) => assert.ok(metres(p, na[k][r][v]) < 0.01, 'the same point'))));
});

test('CG3: the cost grows with the cells, not their square', () => {
  const time = (n: number) => {
    const cells = field(n, n, (di, dj) => ((di * 7 + dj * 3) % 5 < 2 ? 'car' : 'foot'));
    const runs: number[] = [];
    for (let k = 0; k < 3; k++) {
      const t0 = performance.now();
      carGroundOf(cells);
      runs.push(performance.now() - t0);
    }
    return runs.sort((x, y) => x - y)[1];
  };
  time(6);
  const [small, large] = [time(8), time(16)];
  // Four times the cells: a linear cost is about four times; a quadratic one sixteen.
  assert.ok(large / small < 10, `four times the cells cost ${(large / small).toFixed(1)} times as much`);
});

test('CG4: the edge is drawn where car ground meets read ground, never along the read\'s edge', () => {
  // Car in the top rows of what was read: its north side is the read's edge; its south side meets foot ground.
  const cells = field(12, 10, (di, dj) => (dj >= 5 && di >= 2 && di < 10 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  const top = cellBounds(I, J + 9).north;
  const southSide = cellBounds(I, J + 5).south;
  assert.ok(g.edges.length > 0, 'an edge is drawn');
  const pts = g.edges.flatMap((e) => e.shape);
  assert.ok(pts.every((p) => (top - p[1]) * M_LAT > 20), 'no edge runs along the read\'s north edge');
  assert.ok(pts.some((p) => Math.abs(p[1] - southSide) * M_LAT < 40), 'the edge runs where car ground meets foot ground');
});

test('walkability-car-ground audit 2: toward the read\'s edge the hatch fades over 100 m in steps, never a straight cut', () => {
  const cells = field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  const top = cellBounds(I, J + 9).north;
  const fromEdge = (p: LngLat) => (top - p[1]) * M_LAT;
  // The whole hatch keeps its distance from the read's edge; the fainter steps fill the last 100 m.
  for (const a of whole(g)) for (const p of a.shape[0]) assert.ok(fromEdge(p) > GROUND_FADE_M - 30, `whole hatch ${fromEdge(p).toFixed(0)} m from the read's edge`);
  const fades = new Set(g.areas.map((a) => a.fade));
  assert.ok(fades.size >= 4, `the fade is in steps (${[...fades].sort().join(',')})`);
  const faintest = Math.max(...fades);
  const nearEdge = g.areas.filter((a) => a.fade === faintest).flatMap((a) => a.shape[0]);
  assert.ok(nearEdge.some((p) => fromEdge(p) < 15), 'the faintest step reaches the read\'s edge');
  // Each step is fainter than the one inside it: the step's distance from the edge falls as its fade rises.
  const meanFrom = (f: number) => {
    const pts = g.areas.filter((a) => a.fade === f).flatMap((a) => a.shape[0]).map(fromEdge);
    return pts.reduce((s, x) => s + x, 0) / pts.length;
  };
  const steps = [...fades].filter((f) => f > 0).sort();
  for (let k = 1; k < steps.length; k++) assert.ok(meanFrom(steps[k]) < meanFrom(steps[k - 1]), `step ${steps[k]} lies nearer the edge than step ${steps[k - 1]}`);
});

test('CG11: no car cell draws nothing', () => {
  const g = carGroundOf([]);
  assert.deepEqual([g.areas, g.edges], [[], []]);
  assert.equal(g.key, carGroundOf(field(4, 4, () => 'foot')).key, 'one key for nothing drawn');
});

// The real places (Overture's own tiles, walkFixtures.json): the mall reads car and is drawn; the old town reads foot and is not.
const require = createRequire(import.meta.url);
type Fx = { places: Record<string, { at: LngLat; tiles: Record<string, { ways: WayFacts[]; junctions: LngLat[] }> }> };
const FX = require('./walkFixtures.json') as Fx;
const real = (key: string) => {
  const p = FX.places[key];
  const ways = new Map<string, WayFacts[]>();
  const junctions = new Map<string, LngLat[]>();
  for (const [k, t] of Object.entries(p.tiles)) {
    ways.set(k, t.ways);
    junctions.set(k, t.junctions);
  }
  return { g: carGroundOf(cellsFor(ways, junctions)), at: p.at };
};

test('CG1: real places: the Lehigh Valley Mall is drawn as car ground; Zurich\'s old town draws nothing', () => {
  const mall = real('lvMall');
  assert.ok(drawn(mall.g, mall.at), 'the mall is inside the drawn car ground');
  const zurich = real('zurich');
  assert.deepEqual([zurich.g.areas.length, zurich.g.edges.length], [0, 0]);
});

test('CG9, UF12: the map is handed areas and edges with a kind and nothing else: no number', async () => {
  const { walkabilityGeoJSON } = await import('../../../components/map/types');
  const fc = walkabilityGeoJSON(carGroundOf(field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot'))));
  assert.ok(fc.features.length > 0);
  for (const f of fc.features) {
    assert.deepEqual(Object.keys(f.properties!), ['kind']);
    assert.match(String(f.properties!.kind), /^(area|edge)(-[1-9])?$/, 'a kind, and its fade step in the name only');
  }
  assert.equal(walkabilityGeoJSON(null).features.length, 0);
});

test('walkability-car-ground audit 7: the fade\'s pieces tile the car ground: every point in it lies in exactly one piece', { todo: 'test first' }, () => {
  const cells = field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot'));
  const g = carGroundOf(cells);
  const inPiece = (shape: LngLat[][], p: LngLat) => inside(p, shape[0]) && !shape.slice(1).some((h) => inside(p, h));
  const [w, e] = [cellBounds(I + 3, J + 5).west, cellBounds(I + 8, J + 5).east];
  const [s, n] = [cellBounds(I, J + 4).south, cellBounds(I, J + 9).north];
  let checked = 0;
  for (let k = 0; k < 400; k++) {
    const p: LngLat = [w + ((e - w) * ((k * 37) % 400)) / 400, s + ((n - s) * ((k * 91) % 397)) / 397];
    if ((cellBounds(I, J + 9).north - p[1]) * M_LAT < 2) continue;
    const hits = g.areas.filter((a) => inPiece(a.shape, p)).length;
    if (!drawn(g, p)) continue;
    checked++;
    assert.equal(hits, 1, `a point of the car ground lies in ${hits} pieces`);
  }
  assert.ok(checked > 100, `${checked} points checked`);
  // The fade's bands meet without a gap: points just either side of each band's inner edge are both drawn.
  for (let y = n - 120 / M_LAT; y < n - 2 / M_LAT; y += 1 / M_LAT) assert.ok(drawn(g, [(w + e) / 2, y]), `drawn ${((n - y) * M_LAT).toFixed(0)} m from the read's edge`);
});
