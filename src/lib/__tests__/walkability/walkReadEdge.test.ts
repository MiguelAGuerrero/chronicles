/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { LngLat } from '../../types';
import { carGroundOf, readEdgeOf, walkDrawingOf } from '../../walk/carGround';
import { cellBounds, cellIndexOf, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';
import { LAYERS } from '../../layers/registry';
import { BORDER, WALK_READ, WALK_STYLE, walkabilityGeoJSON, walkKind } from '../../../components/map/types';
import { contrast } from '../map/colourSight';

// T67 (the owner's yes, in person, 2026-11-27: "T67-T69 walkability"): ground nobody read looked the same as plain
// ground. A thin dashed line in the map's neutral grey runs along the edge of what was read, the end of the 1.5 km read
// and a tile that could not be read alike, drawn only while the layer is on; the hatch keeps its fade inside it; the
// layer's note says what it is. Written before the code.

const J = 18_600;
const I = -23_800;
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });
const field = (w: number, h: number, pick: (di: number, dj: number) => CellBand | null, i0 = I, j0 = J): Cell[] => {
  const out: Cell[] = [];
  for (let dj = 0; dj < h; dj++) for (let di = 0; di < w; di++) {
    const b = pick(di, dj);
    if (b) out.push(cell(i0 + di, j0 + dj, b));
  }
  return out;
};
const M_LAT = 110_540;
const mLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);
const offset = (p: LngLat, eastM: number, northM: number): LngLat => [p[0] + eastM / mLon(p[1]), p[1] + northM / M_LAT];
/** Whether a point lies in a judged cell. */
const judged = (cells: readonly Cell[]) => {
  const ids = new Set(cells.map((c) => `${c.i},${c.j}`));
  return (p: LngLat) => {
    const { i, j } = cellIndexOf(p);
    return ids.has(`${i},${j}`);
  };
};
/** Whether a point lies within `m` metres of the edge of what was read: read ground and unread ground both that near. */
const nearEdge = (cells: readonly Cell[], m: number) => {
  const has = judged(cells);
  return (p: LngLat) => {
    const around = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => offset(p, m * Math.cos((d * Math.PI) / 180), m * Math.sin((d * Math.PI) / 180)));
    return around.some(has) && around.some((q) => !has(q));
  };
};
function inside(p: LngLat, ring: readonly LngLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
/** Metres from a point to a line. */
function toLine(p: LngLat, line: readonly LngLat[]): number {
  const k = mLon(p[1]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay, bx, by] = [(line[i - 1][0] - p[0]) * k, (line[i - 1][1] - p[1]) * M_LAT, (line[i][0] - p[0]) * k, (line[i][1] - p[1]) * M_LAT];
    const [dx, dy] = [bx - ax, by - ay];
    const L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(ax + dx * t, ay + dy * t));
  }
  return best;
}
const closed = (l: readonly LngLat[]) => l.length >= 4 && l[0][0] === l[l.length - 1][0] && l[0][1] === l[l.length - 1][1];

test('tend walkability T67: the edge of what was read is one closed line along it, with or without car ground', () => {
  for (const band of ['foot', 'neither', 'empty', 'car'] as CellBand[]) {
    const cells = field(12, 10, () => band);
    const lines = readEdgeOf(cells).lines;
    assert.equal(lines.length, 1, `${band}: one line round the read`);
    assert.ok(closed(lines[0]), `${band}: the line closes on itself`);
    const near = nearEdge(cells, 30);
    assert.ok(lines[0].every(near), `${band}: every point of it lies within 30 m of the read's edge`);
  }
  assert.deepEqual(readEdgeOf([]).lines, [], 'nothing read, no line');
});

test('tend walkability T67: a tile that could not be read inside the read is ringed too', () => {
  // A 12 x 12 read with a hole of 4 x 4 cells in it: what a tile that failed leaves (its cells and their neighbours unjudged).
  const cells = field(12, 12, (di, dj) => (di >= 4 && di < 8 && dj >= 4 && dj < 8 ? null : 'foot'));
  const lines = readEdgeOf(cells).lines;
  assert.equal(lines.length, 2, 'the read\'s outer edge and the hole\'s');
  const near = nearEdge(cells, 30);
  for (const l of lines) assert.ok(closed(l) && l.every(near), 'each closed, each along an edge of what was read');
  // One line holds every unread cell's middle and no read cell's: it rings the hole, close round it.
  const mid = (i: number, j: number): LngLat => {
    const b = cellBounds(i, j);
    return [(b.west + b.east) / 2, (b.south + b.north) / 2];
  };
  const unread: LngLat[] = [];
  for (let dj = 4; dj < 8; dj++) for (let di = 4; di < 8; di++) unread.push(mid(I + di, J + dj));
  const read = cells.map((c) => mid(c.i, c.j));
  const ringsHole = (l: readonly LngLat[]) => unread.every((p) => inside(p, l)) && !read.some((p) => inside(p, l));
  assert.equal(lines.filter(ringsHole).length, 1, 'one of them rings the hole, close round it');
});

test('tend walkability T67: the hatch keeps its fade inside the line', () => {
  // G5's scene: car ground running up to the read's north edge, so the hatch fades toward it.
  const cells = field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot'));
  const g = walkDrawingOf(cells);
  assert.ok(g.areas.some((a) => a.fade > 0), 'the hatch fades toward the read\'s edge');
  const [ring] = g.read ?? [];
  assert.ok(ring, 'the read\'s edge is drawn');
  for (const a of g.areas) for (const p of a.shape.flat()) assert.ok(inside(p, ring) || toLine(p, ring) < 2, `a hatch point ${toLine(p, ring).toFixed(1)} m outside the line`);
  // The faintest step reaches the line: the hatch fades to it, not short of it.
  const faintest = g.areas.filter((a) => a.fade === Math.max(...g.areas.map((x) => x.fade))).flatMap((a) => a.shape.flat());
  assert.ok(Math.min(...faintest.map((p) => toLine(p, ring))) < 2, 'the faintest step meets the line');
});

test('tend walkability T67: the drawing is the car ground as before with the read\'s edge beside it, keyed on both', () => {
  const cells = field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot'));
  const g = walkDrawingOf(cells);
  const car = carGroundOf(cells);
  assert.deepEqual([g.areas, g.edges], [car.areas, car.edges], 'the car ground is unchanged');
  assert.deepEqual(g.read, readEdgeOf(cells).lines);
  // No car cell: no area and no edge (CG11), and still the read's edge, so plain ground is told from ground nobody read.
  const plain = walkDrawingOf(field(8, 8, () => 'foot'));
  assert.deepEqual([plain.areas.length, plain.edges.length, plain.read?.length], [0, 0, 1]);
  // The key follows the read as well as the car ground, so the map is sent a new line when the read moves, and not the order.
  assert.notEqual(walkDrawingOf(field(8, 8, () => 'foot')).key, walkDrawingOf(field(9, 8, () => 'foot')).key, 'a wider read, a new key');
  const some = field(8, 8, (di) => (di < 2 ? 'car' : 'foot'));
  assert.equal(walkDrawingOf([...some].reverse()).key, walkDrawingOf(some).key, 'the same cells in any order, one key');
  assert.notEqual(walkDrawingOf([]).key, walkDrawingOf(field(4, 4, () => 'foot')).key, 'nothing read is not a read with no car ground');
});

test('tend walkability T67: a 12-tile read\'s edge is drawn quickly, in a bounded number of points', () => {
  // Twelve z14 tiles at Zurich's latitude: about 7 by 5.5 km, 30 by 22 cells, with two tiles that failed.
  const j0 = Math.floor(47.37 / (250 / 110540));
  const i0 = Math.floor(8.54 / (250 / (111320 * Math.cos((47.37 * Math.PI) / 180))));
  const cells = field(30, 22, (a, b) => ((a > 8 && a < 14 && b > 6 && b < 12) || (a > 18 && a < 24 && b > 3 && b < 9) ? null : (a * 7 + b * 3) % 5 < 2 ? 'car' : 'foot'), i0, j0);
  const t0 = performance.now();
  const lines = readEdgeOf(cells).lines;
  const ms = performance.now() - t0;
  assert.equal(lines.length, 3, 'the outer edge and the two holes');
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`);
  const points = lines.reduce((s, l) => s + l.length, 0);
  assert.ok(points <= 1500, `${points} points`);
});

test('tend walkability T67: a read across the antimeridian draws its edge near the world, never a line round it', () => {
  const j = Math.floor(-16.8 / (250 / 110540));
  const dl = 250 / (111320 * Math.cos(((j + 0.5) * (250 / 110540) * Math.PI) / 180));
  const east = Math.floor(179.995 / dl);
  const west = Math.floor(-179.995 / dl);
  const cells: Cell[] = [];
  for (let dj = -3; dj <= 3; dj++) {
    for (let k = -4; k <= 0; k++) cells.push(cell(east + k, j + dj, 'foot'));
    for (let k = 0; k <= 4; k++) cells.push(cell(west + k, j + dj, 'foot'));
  }
  const lines = readEdgeOf(cells).lines;
  assert.ok(lines.length >= 1);
  for (const l of lines) {
    for (const p of l) assert.ok(p[0] >= -540 && p[0] <= 540, 'longitudes stay near the world');
    for (let k = 1; k < l.length; k++) assert.ok(Math.abs(l[k][0] - l[k - 1][0]) < 1, 'no stretch of the line crosses the world');
  }
});

test('tend walkability T67: the map is handed the read\'s edge as lines of kind "read", with nothing else', () => {
  const g = walkDrawingOf(field(12, 10, (di, dj) => (dj >= 3 && di >= 2 && di < 10 ? 'car' : 'foot')));
  const fc = walkabilityGeoJSON(g);
  const read = fc.features.filter((f) => f.properties?.kind === 'read');
  assert.equal(read.length, g.read?.length);
  for (const f of read) {
    assert.equal(f.geometry.type, 'LineString');
    assert.deepEqual(Object.keys(f.properties!), ['kind'], 'a kind and nothing else: no number');
  }
  assert.equal(fc.features.length, g.areas.length + g.edges.length + read.length, 'the car ground\'s features as before');
  assert.deepEqual(walkKind('read'), ['==', ['slice', ['get', 'kind'], 0, 4], 'read']);
});

test('tend walkability T67: the line is thin, dashed, in the map\'s neutral grey, 3:1 on the land, no new colour', () => {
  assert.equal(WALK_READ.color, BORDER.lined, 'the grey the map already draws its quiet lines in');
  for (const land of ['#f2f3f0', '#e4e3e2']) assert.ok(contrast(WALK_READ.color, land) >= 3, `${contrast(WALK_READ.color, land).toFixed(2)} on ${land}`);
  assert.equal(WALK_READ.widthPx, WALK_STYLE.car.lineWidthPx, 'as thin as the hatch\'s own lines');
  assert.equal(WALK_READ.dash.length, 2);
  // Its dash and gap make one hatch spacing, in line widths.
  assert.ok(Math.abs((WALK_READ.dash[0] + WALK_READ.dash[1]) * WALK_READ.widthPx - WALK_STYLE.car.spacingPx) < 1e-9);
});

test('tend walkability T67: both maps draw the line from the walkability source, dashed, under the base map\'s labels', () => {
  const MAP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'components', 'map');
  const native = readFileSync(join(MAP, 'WalkMap.native.tsx'), 'utf8');
  const at = native.indexOf('<Layer id="walk-read"');
  assert.ok(at > 0 && at < native.indexOf('</GeoJSONSource>', native.indexOf('<GeoJSONSource id="walkability"')) && at > native.indexOf('<GeoJSONSource id="walkability"'), 'native: in the walkability source');
  const tag = native.slice(at, native.indexOf('/>', at));
  assert.match(tag, /beforeId=\{WALK_BELOW\}/);
  assert.match(tag, /walkKind\('read'\)/);
  assert.match(tag, /'line-dasharray': \[\.\.\.WALK_READ\.dash\]/);
  const web = readFileSync(join(MAP, 'WalkMap.web.tsx'), 'utf8');
  const w = web.indexOf("id: 'walk-read'");
  assert.ok(w > 0, 'web: a walk-read layer');
  const add = web.slice(w, web.indexOf(');', w));
  assert.match(add, /source: 'walkability'/);
  assert.match(add, /walkKind\('read'\)/);
  assert.match(add, /'line-dasharray': \[\.\.\.WALK_READ\.dash\]/);
  assert.match(add, /\}, firstSymbol$/);
});

test('tend walkability T67: the layer\'s note says the dashed line is as far as it has read', () => {
  const note = LAYERS.find((l) => l.id === 'walkability')?.note ?? '';
  assert.equal(note, 'From OpenStreetMap and Overture. Judged from how the ground is built, so an area can read differently from how it feels; the dashed line is as far as it has read.');
});
