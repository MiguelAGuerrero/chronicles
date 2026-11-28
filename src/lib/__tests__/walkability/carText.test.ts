/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { LngLat } from '../../types';
import { CAR_LABEL, carGroundOf, carTextOf, walkDrawingOf, type CarGround } from '../../walk/carGround';
import { cellBounds, cellIndexOf, cellsFor, type Cell } from '../../walk/cells';
import type { CellBand } from '../../walk/form';
import type { WayFacts } from '../../walk/types';
import { bandWords } from '../../walk/bandWords';
import { metersPerPixel } from '../../pins';
import { LAYERS } from '../../layers/registry';
import { MAP_LABEL_SIZE, WALK_SLATE, WALK_STYLE, WALK_TEXT, walkabilityGeoJSON, walkKind } from '../../../components/map/types';

// T68 (the owner's yes, in person, 2026-11-27: "T67-T69 walkability"): a screen wholly inside car ground had no edge in
// view to say what the hatch is. One quiet name, the legend's "Built around cars", in slate at the map's own label size,
// inside each car area larger than the screen at walking zoom, placed by the map as a polygon's name; none on a small
// area, never a number. Written before the code.

const ORIGIN: LngLat = [-71.4, 42.07]; // about Providence
const cell = (i: number, j: number, band: CellBand): Cell => ({ i, j, ...cellBounds(i, j), band });
/**
 * Read cells `w` by `h`, 250 m apart from `origin` east and north (each the cell a point lies in, so a column of them runs
 * north whatever the row's own width), `band` where `pick` says, else none.
 */
const field = (w: number, h: number, pick: (di: number, dj: number) => CellBand | null, origin: LngLat = ORIGIN): Cell[] => {
  const out = new Map<string, Cell>();
  for (let dj = 0; dj < h; dj++) for (let di = 0; di < w; di++) {
    const b = pick(di, dj);
    const { i, j } = cellIndexOf(offset(origin, di * 250 + 125, dj * 250 + 125));
    if (b) out.set(`${i},${j}`, cell(i, j, b));
  }
  return [...out.values()];
};
/** The middle of the cell `di` east and `dj` north of the origin. */
const at = (di: number, dj: number, origin: LngLat = ORIGIN): LngLat => offset(origin, di * 250 + 125, dj * 250 + 125);
const M_LAT = 110_540;
const mLon = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);
const offset = (p: LngLat, eastM: number, northM: number): LngLat => [p[0] + eastM / mLon(p[1]), p[1] + northM / M_LAT];
function inside(p: LngLat, ring: readonly LngLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const inPolygon = (p: LngLat, poly: readonly LngLat[][]) => inside(p, poly[0]) && !poly.slice(1).some((h) => inside(p, h));
/** Whether a point lies in the whole hatch (not a fade step toward the read's edge). */
const inWhole = (g: CarGround, p: LngLat) => g.areas.some((a) => a.fade === 0 && inPolygon(p, a.shape));
/** Whether a point lies in a car cell. */
const carAt = (cells: readonly Cell[]) => {
  const ids = new Set(cells.filter((c) => c.band === 'car').map((c) => `${c.i},${c.j}`));
  return (p: LngLat) => {
    const { i, j } = cellIndexOf(p);
    return ids.has(`${i},${j}`);
  };
};
/** Every point `m` metres round `p`, in sixteen directions, is car ground. */
const roomRound = (cells: readonly Cell[], p: LngLat, m: number) => {
  const car = carAt(cells);
  return [...Array(16).keys()].every((k) => car(offset(p, m * Math.cos((k * Math.PI) / 8), m * Math.sin((k * Math.PI) / 8))));
};
/** The room the words need, in metres, at walking zoom where `cells` lie. */
const roomM = (cells: readonly Cell[]) => CAR_LABEL.roomPx * metersPerPixel(CAR_LABEL.zoom, cells[0].south);

/** Pixels between two points at walking zoom (Mercator: a north-south metre is more pixels toward the poles). */
const pxApart = (a: LngLat, b: LngLat) => {
  const m = metersPerPixel(CAR_LABEL.zoom, (a[1] + b[1]) / 2);
  return Math.hypot((a[0] - b[0]) * mLon(a[1]), (a[1] - b[1]) * M_LAT) / m;
};

test('tend walkability T68: a car area larger than the screen at walking zoom is named inside its whole hatch, with room round each name', () => {
  // Car ground 2 km square (8 x 8 cells) in a read of 4 km: far wider than a phone's screen at zoom 16 (about 350 m here).
  const cells = field(16, 16, (di, dj) => (di >= 4 && di < 12 && dj >= 4 && dj < 12 ? 'car' : 'foot'));
  const g = walkDrawingOf(cells);
  const text = g.text ?? [];
  assert.ok(text.length >= 1, 'named');
  const room = roomM(cells);
  for (const p of text) {
    assert.ok(inWhole(g, p), 'each name lies in the whole hatch');
    assert.ok(roomRound(cells, p, room - 30), `with the words' room round it (${room.toFixed(0)} m)`);
  }
});

test('tend walkability T68: about once a screen: names a grid\'s step apart at walking zoom, and no room a screen from one', () => {
  const cells = field(16, 16, (di, dj) => (di >= 4 && di < 12 && dj >= 4 && dj < 12 ? 'car' : 'foot'));
  const text = carTextOf(cells);
  // 2 km of car ground, about 1.6 km across with the room at its edges taken off: some 4 or 5 names a side (a screen is
  // about 350 m wide here), not one for each of its 64 cells and not one for the whole.
  assert.ok(text.length >= 9 && text.length <= 36, `${text.length} names`);
  for (let a = 0; a < text.length; a++) for (let b = a + 1; b < text.length; b++) {
    assert.ok(pxApart(text[a], text[b]) >= CAR_LABEL.everyPx * 0.85, `${pxApart(text[a], text[b]).toFixed(0)} px apart`);
  }
  // Any point of the area with the words' room round it has a name within a screen's width.
  const room = roomM(cells);
  for (let y = 4; y < 12; y += 0.5) for (let x = 4; x < 12; x += 0.5) {
    const p = at(x, y);
    if (!roomRound(cells, p, room)) continue;
    assert.ok(text.some((t) => pxApart(p, t) <= CAR_LABEL.screenPx), `a name within a screen of ${x}, ${y}`);
  }
  // Fixed on the global lattice: a wider read around the same ground writes the same names where it reaches as far.
  const wider = field(20, 20, (di, dj) => (di >= 6 && di < 14 && dj >= 6 && dj < 14 ? 'car' : 'foot'), offset(ORIGIN, -500, -500));
  const again = carTextOf(wider);
  for (const p of text) assert.ok(again.some((q) => pxApart(p, q) < 1), 'the same places');
});

test('tend walkability T68: no name on a car area smaller than the screen, whatever its length', () => {
  // One car cell (250 m, about 280 px at zoom 16 here), and a strip one cell wide and 2 km long: narrower than the screen.
  const one = field(9, 9, (di, dj) => (di === 4 && dj === 4 ? 'car' : 'foot'));
  assert.ok(carGroundOf(one).areas.length > 0, 'the cell is drawn as car ground');
  assert.deepEqual(carTextOf(one), [], 'but not named');
  const strip = field(9, 12, (di, dj) => (di === 4 && dj >= 2 && dj < 10 ? 'car' : 'foot'));
  assert.deepEqual(carTextOf(strip), [], 'a long narrow strip is not named');
  // Two cells wide (500 m, about 560 px here) is wider than the screen: named.
  const wide = field(10, 12, (di, dj) => (di >= 4 && di < 6 && dj >= 2 && dj < 10 ? 'car' : 'foot'));
  assert.ok(carTextOf(wide).length >= 1, 'two cells wide is named');
});

test('tend walkability T68: "larger than the screen" is measured in the screen\'s pixels at walking zoom, so it follows the latitude', () => {
  // The same one car cell: 280 px wide at zoom 16 at 42° N, smaller than the screen; 420 px wide at 62° N, larger.
  const south = field(9, 9, (di, dj) => (di === 4 && dj === 4 ? 'car' : 'foot'), [-71.4, 42]);
  const north = field(9, 9, (di, dj) => (di === 4 && dj === 4 ? 'car' : 'foot'), [10, 62]);
  const px = (cells: Cell[]) => 250 / metersPerPixel(CAR_LABEL.zoom, cells[0].south);
  assert.ok(px(south) < CAR_LABEL.screenPx && px(north) > CAR_LABEL.screenPx, `${px(south).toFixed(0)} px and ${px(north).toFixed(0)} px`);
  assert.deepEqual(carTextOf(south), [], 'smaller than the screen: no name');
  assert.equal(carTextOf(north).length, 1, 'larger than the screen: named, once, at its deepest point');
  // At 50° N the cell is 330 px wide: room enough for the words in its middle, but just smaller than the screen: no name.
  const mid = field(9, 9, (di, dj) => (di === 4 && dj === 4 ? 'car' : 'foot'), [5, 50]);
  assert.ok(px(mid) > 2 * CAR_LABEL.roomPx && px(mid) < CAR_LABEL.screenPx, `${px(mid).toFixed(0)} px`);
  assert.deepEqual(carTextOf(mid), [], 'just smaller than the screen: no name, though the words would fit');
});

test('tend walkability T68: two large areas side by side are each named', () => {
  // Two car areas 1 km square, a column of foot ground 250 m wide between them.
  const cells = field(14, 8, (di, dj) => (dj >= 2 && dj < 6 && ((di >= 1 && di < 6) || (di >= 7 && di < 12)) ? 'car' : 'foot'));
  const text = carTextOf(cells);
  const g = walkDrawingOf(cells);
  // Each area's whole hatch is its own polygon; each holds a name, and every name is in one of them.
  const west = g.areas.filter((a) => a.fade === 0 && inPolygon(at(3, 4), a.shape));
  const east = g.areas.filter((a) => a.fade === 0 && inPolygon(at(9, 4), a.shape));
  assert.ok(west.length === 1 && east.length === 1 && west[0] !== east[0], 'two areas drawn');
  assert.ok(text.some((t) => inPolygon(t, west[0].shape)), 'the west area is named');
  assert.ok(text.some((t) => inPolygon(t, east[0].shape)), 'the east area is named');
  assert.ok(text.every((t) => inPolygon(t, west[0].shape) || inPolygon(t, east[0].shape)), 'and nothing between');
});

test('tend walkability T68: a car area cut by the read\'s edge keeps the name\'s room from the edge, as from any other', () => {
  // Car ground to the read's north and east edges: what lies past them is not known, so the room keeps clear of them.
  const cells = field(12, 12, (di, dj) => (di >= 4 && dj >= 4 ? 'car' : 'foot'));
  const text = carTextOf(cells);
  assert.ok(text.length >= 1);
  const room = roomM(cells);
  // Every name has the words' room of read car cells round it: the cells past the read's edge are not read.
  for (const p of text) assert.ok(roomRound(cells, p, room - 30), 'clear of the read\'s edge');
  // Cut to a strip narrower than the screen by the edge, it is not named.
  assert.deepEqual(carTextOf(field(12, 12, (di, dj) => (di >= 4 && dj >= 11 ? 'car' : 'foot'))), [], 'a strip along the read\'s edge');
});

test('tend walkability T68: no car ground, no name; the drawing is otherwise unchanged and keyed as before', () => {
  assert.deepEqual(carTextOf([]), []);
  assert.deepEqual(walkDrawingOf(field(8, 8, () => 'foot')).text, []);
  const cells = field(16, 16, (di, dj) => (di >= 4 && di < 12 && dj >= 4 && dj < 12 ? 'car' : 'foot'));
  const g = walkDrawingOf(cells);
  const car = carGroundOf(cells);
  assert.deepEqual([g.areas, g.edges], [car.areas, car.edges], 'the car ground is unchanged');
  assert.equal(car.text, undefined, 'carGroundOf names nothing');
  assert.deepEqual(walkDrawingOf([...cells].reverse()).text, g.text, 'the same cells in any order, the same names');
});

// The real places (Overture's own tiles, walkFixtures.json): the mall's car ground is larger than a screen and named; the
// old town has no car ground and no name.
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
  return { g: walkDrawingOf(cellsFor(ways, junctions)), at: p.at };
};

test('tend walkability T68: real places: the Lehigh Valley Mall\'s car ground is named; Zurich\'s old town is not', () => {
  const mall = real('lvMall');
  assert.ok((mall.g.text?.length ?? 0) >= 1, 'the mall\'s car ground has room for its name');
  for (const p of mall.g.text!) assert.ok(inWhole(mall.g, p), 'inside its whole hatch');
  assert.deepEqual(real('zurich').g.text, []);
});

test('tend walkability T68: the map is handed the names\' places as points of kind "text", with nothing else: no number', () => {
  const g = walkDrawingOf(field(16, 16, (di, dj) => (di >= 4 && di < 12 && dj >= 4 && dj < 12 ? 'car' : 'foot')));
  const fc = walkabilityGeoJSON(g);
  const text = fc.features.filter((f) => f.properties?.kind === 'text');
  assert.equal(text.length, g.text?.length);
  assert.ok(text.length >= 1);
  for (const f of text) {
    assert.equal(f.geometry.type, 'Point');
    assert.deepEqual(Object.keys(f.properties!), ['kind'], 'a kind and nothing else');
  }
  assert.equal(fc.features.length, g.areas.length + g.edges.length + (g.read?.length ?? 0) + text.length, 'nothing else');
  assert.deepEqual(walkKind('text'), ['==', ['slice', ['get', 'kind'], 0, 4], 'text']);
});

test('tend walkability T68: the name is the legend\'s words, in the hatch\'s slate, at the map\'s own label size, in a face the base style serves', () => {
  const row = LAYERS.find((l) => l.id === 'walkability')?.legend?.[0];
  assert.equal(WALK_TEXT.layout['text-field'], row?.text, 'the legend row\'s words');
  assert.equal(WALK_TEXT.layout['text-field'], bandWords('car'));
  assert.equal(WALK_TEXT.layout['text-field'], 'Built around cars');
  assert.doesNotMatch(String(WALK_TEXT.layout['text-field']), /\d/, 'never a number');
  assert.equal(WALK_TEXT.paint['text-color'], WALK_SLATE, 'slate');
  assert.equal(WALK_TEXT.paint['text-color'], WALK_STYLE.car.color, 'the hatch\'s own');
  assert.equal(WALK_TEXT.layout['text-size'], MAP_LABEL_SIZE, 'the map\'s own label size');
  assert.equal(MAP_LABEL_SIZE, 13, 'Positron\'s street names from zoom 14');
  const style = require('../map/fixtures/positron-fonts.json') as { fonts: string[] };
  for (const f of WALK_TEXT.layout['text-font']) assert.ok(style.fonts.includes(f), `${f} is one of the base style's fonts`);
  assert.equal(WALK_TEXT.layout['text-allow-overlap'], false, 'it gives way, never overlaps');
  assert.equal(WALK_TEXT.minzoom, CAR_LABEL.zoom - 1, 'from a zoom below walking zoom');
  // At its lowest zoom the room is half what it is at walking zoom, and still holds the words' half width (17 letters at
  // about 0.6 of the size each, and the halo).
  const halfWidth = (17 * 0.6 * MAP_LABEL_SIZE) / 2 + WALK_TEXT.paint['text-halo-width'];
  assert.ok(CAR_LABEL.roomPx / 2 ** (CAR_LABEL.zoom - WALK_TEXT.minzoom) >= halfWidth, `${CAR_LABEL.roomPx / 2} px of room for ${halfWidth.toFixed(0)} px`);
  assert.ok(CAR_LABEL.roomPx < CAR_LABEL.screenPx / 2, 'a large area always has room');
});

test('tend walkability T68: both maps place the name from the walkability source, under the base map\'s labels', () => {
  const MAP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'components', 'map');
  const native = readFileSync(join(MAP, 'WalkMap.native.tsx'), 'utf8');
  const src = native.indexOf('<GeoJSONSource id="walkability"');
  const at = native.indexOf('<Layer id="walk-text"');
  assert.ok(at > src && src > 0 && at < native.indexOf('</GeoJSONSource>', src), 'native: in the walkability source');
  const tag = native.slice(at, native.indexOf('/>', at));
  assert.match(tag, /type="symbol"/);
  assert.match(tag, /beforeId=\{WALK_BELOW\}/);
  assert.match(tag, /minzoom=\{WALK_TEXT\.minzoom\}/);
  assert.match(tag, /walkKind\('text'\)/);
  assert.match(tag, /layout=\{WALK_TEXT\.layout as never\}/);
  assert.match(tag, /paint=\{WALK_TEXT\.paint as never\}/);
  const web = readFileSync(join(MAP, 'WalkMap.web.tsx'), 'utf8');
  const w = web.indexOf("id: 'walk-text'");
  assert.ok(w > 0, 'web: a walk-text layer');
  const add = web.slice(w, web.indexOf(');', w));
  assert.match(add, /type: 'symbol'/);
  assert.match(add, /source: 'walkability'/);
  assert.match(add, /minzoom: WALK_TEXT\.minzoom/);
  assert.match(add, /walkKind\('text'\)/);
  assert.match(add, /WALK_TEXT\.layout/);
  assert.match(add, /paint: WALK_TEXT\.paint/);
  assert.match(add, /\}, firstSymbol$/);
});
