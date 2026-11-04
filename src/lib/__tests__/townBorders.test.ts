/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { bordersGeoJSON } from '../../components/map/types';
import { BORDER_RULES, bordersFor, outlineIdHere, outlineIdsOf, outlineOf, simplifyRing, townPlaces } from '../areas/borders';
import { outlineTileFrom } from '../areas/divisionTiles';
import { BORDER_ZOOM, outlineSet, outlineTileKey, outlineTileOf, type OutlineTile } from '../areas/outlines';
import type { TileFeature } from '../areas/tilePlaces';
import { distanceM } from '../geo';
import type { LngLat } from '../types';

// Town borders (TB1-TB9), written from specs/town-borders/spec.md before the code. The real cases
// run on Overture's own divisions (release 2026-10-21.0): z10 to draw (townBorders.json), z12 to
// decide (townOutlines.json), both cut by scripts/fixture-outlines.mjs.

const require = createRequire(import.meta.url);
type Fixture = { release: string; z: number; tiles: { x: number; y: number; division_area: TileFeature[]; division: TileFeature[] }[] };
const tilesOf = (f: Fixture): OutlineTile[] => f.tiles.map((t) => outlineTileFrom(t.x, t.y, f.release, 1, t, f.z));
const z10 = outlineSet(tilesOf(require('./townBorders.json') as Fixture));
const z12 = outlineSet(tilesOf({ z: 12, ...(require('./townOutlines.json') as Omit<Fixture, 'z'>) }));

const GYM: LngLat = [-75.49368, 40.64787];
const CATASAUQUA: LngLat = [-75.4746, 40.6548];
const roleOf = (v: ReturnType<typeof bordersFor>, name: string) => v?.shapes.find((s) => s.name === name)?.role ?? null;

test('TB1: the town you\'re in is tinted, the others lined; a town decided by its point tints nothing', () => {
  const here = outlineIdHere(GYM, 'Whitehall', z12);
  assert.ok(here, 'the title\'s Whitehall is an outline');
  const v = bordersFor(z10, { tinted: [here!], near: GYM });
  assert.equal(roleOf(v, 'Whitehall'), 'tinted');
  for (const n of ['Catasauqua', 'Coplay', 'North Catasauqua']) assert.equal(roleOf(v, n), 'lined', n);
  // The same outline the title was decided by: Whitehall's id at z10 is its id at z12.
  assert.equal(v!.shapes.find((s) => s.role === 'tinted')!.id, here);
  // A title from a label point (the gym is not inside Catasauqua): nothing tinted, nothing invented.
  assert.equal(outlineIdHere(GYM, 'Catasauqua', z12), null);
  const none = bordersFor(z10, { tinted: [], near: GYM });
  assert.ok(none!.shapes.every((s) => s.role === 'lined'));
  // No outlines at all: no borders.
  assert.equal(bordersFor(null, { tinted: [here!] }), null);
});

test('TB2: a town\'s page tints that town, by its name and point', () => {
  const cat = outlineOf({ name: 'Catasauqua', at: CATASAUQUA }, z10);
  assert.equal(cat?.name, 'Catasauqua');
  const v = bordersFor(z10, { tinted: [cat!.id], near: CATASAUQUA });
  assert.equal(roleOf(v, 'Catasauqua'), 'tinted');
  assert.equal(roleOf(v, 'Whitehall'), 'lined');
  // A same-named point far from any outline is not that town.
  assert.equal(outlineOf({ name: 'Catasauqua', at: [-75.0, 40.0] }, z10), null);
});

test('TB3: walked towns are one tint, whatever their metres, and nothing else is drawn', () => {
  const ids = ['Whitehall', 'Catasauqua'].map((n) => outlineOf({ name: n, at: n === 'Whitehall' ? GYM : CATASAUQUA }, z10)!.id);
  const v = bordersFor(z10, { tinted: ids, lined: false });
  assert.deepEqual(v!.shapes.map((s) => s.name).sort(), ['Catasauqua', 'Whitehall']);
  const props = bordersGeoJSON(v).features.map((f) => f.properties);
  // Nothing in a shape says how much it was walked: only its role, id and name.
  for (const p of props) assert.deepEqual(Object.keys(p ?? {}).sort(), ['id', 'name', 'role']);
  assert.ok(props.every((p) => p?.role === 'tinted'));
});

test('TB3, TB5: a walk\'s town areas become its tinted outlines, each once; neighborhoods and states are not towns', () => {
  const areas = [
    { level: 'state', name: 'Pennsylvania', lon: -77.6, lat: 40.9 },
    { level: 'town', name: 'Whitehall', lon: -75.507445, lat: 40.657413 },
    { level: 'town', name: 'Whitehall', lon: -75.5, lat: 40.65 },
    { level: 'neighborhood', name: 'Fullerton', lon: -75.479, lat: 40.632 },
    { level: 'town', name: 'Nowhere', lon: -75.49, lat: 40.64 },
  ];
  const ids = outlineIdsOf(townPlaces(areas), z10);
  assert.equal(ids.length, 1);
  assert.equal(z10.towns.find((t) => t.id === ids[0])!.name, 'Whitehall');
});

test('TB4: the walk screen\'s borders are lines only, the town you\'re in firmer', () => {
  const here = outlineIdHere(GYM, 'Whitehall', z12)!;
  const v = bordersFor(z10, { firm: [here], near: GYM });
  assert.equal(roleOf(v, 'Whitehall'), 'firm');
  assert.ok(!v!.shapes.some((s) => s.role === 'tinted'), 'no fill on the walk screen');
});

test('TB5: a walk\'s towns are tinted, the rest of the tile lined', () => {
  const walked = [outlineOf({ name: 'Whitehall', at: [-75.507445, 40.657413] }, z10)!.id];
  const v = bordersFor(z10, { tinted: walked, near: GYM });
  assert.equal(roleOf(v, 'Whitehall'), 'tinted');
  assert.equal(roleOf(v, 'Coplay'), 'lined');
});

test('TB6: a border is drawn whole: Whitehall at z10 reaches past the z12 tile that decides; two tiles make one border', () => {
  const drawn = z10.towns.find((t) => t.name === 'Whitehall')!;
  // What decided at the gym: its own z12 tile, cut at the tile's edge.
  const gymTile = outlineTileKey(...outlineTileOf(GYM));
  const decided = outlineSet(tilesOf({ z: 12, ...(require('./townOutlines.json') as Omit<Fixture, 'z'>) }).filter((t) => t.key === gymTile)).towns.find((t) => t.name === 'Whitehall')!;
  assert.ok(drawn.bbox[0] < decided.bbox[0] - 0.005 || drawn.bbox[3] > decided.bbox[3] + 0.005,
    `the drawn border goes beyond the z12 piece (drawn ${drawn.bbox.map((n) => n.toFixed(3))}, decided ${decided.bbox.map((n) => n.toFixed(3))})`);
  // A town cut by two z10 tiles is one shape, from both.
  const [x, y] = outlineTileOf(GYM, BORDER_ZOOM);
  const piece = (dx: number, ring: LngLat[]): OutlineTile => ({
    key: outlineTileKey(x + dx, y, BORDER_ZOOM), z: BORDER_ZOOM, x: x + dx, y, release: 'r', read_at: 1,
    pieces: [{ id: 'two', name: 'Two', polygons: [[ring]] }], points: [],
  });
  const sq = (x0: number, x1: number): LngLat[] => [[x0, 40.6], [x1, 40.6], [x1, 40.7], [x0, 40.7], [x0, 40.6]];
  const two = outlineSet([piece(0, sq(-75.6, -75.5)), piece(1, sq(-75.5, -75.4))]);
  const v = bordersFor(two, { tinted: ['two'] });
  assert.equal(v!.shapes.length, 1);
  assert.equal(v!.shapes[0].polygons.length, 2);
});

test('TB9: shapes are simplified to about 10 m and capped at 40 towns, yours kept and the nearest first', () => {
  // A wiggly line along a square's edge: points 1 m apart, wandering 2 m, simplify to its corners.
  const ring: LngLat[] = [];
  const k = 1 / 111320;
  for (let i = 0; i <= 1000; i++) ring.push([-75 + i * k * 1.3, 40 + (i % 2 ? 2 : 0) * k]);
  ring.push([-75 + 1000 * k * 1.3, 40.01], [-75, 40.01], [-75, 40]);
  const s = simplifyRing(ring, BORDER_RULES.simplifyM);
  assert.ok(s.length < 12, `kept ${s.length} of ${ring.length}`);
  assert.deepEqual(s[0], s[s.length - 1], 'still closed');
  // Every dropped point is within 10 m of the simplified line's vertices' path (checked on the wiggles).
  assert.ok(ring.slice(0, 1000).every((p) => Math.abs(p[1] - 40) / k <= BORDER_RULES.simplifyM));
  // 50 towns in a row: 40 drawn, the tinted one among them though it is the farthest, then the nearest.
  const tiles: OutlineTile[] = [{
    key: 'k', z: BORDER_ZOOM, x: 0, y: 0, release: 'r', read_at: 1, points: [],
    pieces: Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, polygons: [[[[i, 0], [i + 0.5, 0], [i + 0.5, 0.5], [i, 0.5], [i, 0]] as LngLat[]]] })),
  }];
  const v = bordersFor(outlineSet(tiles), { tinted: ['t49'], near: [0, 0] });
  assert.equal(v!.shapes.length, BORDER_RULES.cap);
  assert.ok(v!.shapes.some((x) => x.id === 't49'));
  assert.ok(v!.shapes.some((x) => x.id === 't0') && !v!.shapes.some((x) => x.id === 't45'));
  // The key changes with the towns and roles, never with anything else: a memo key for the screens.
  assert.equal(bordersFor(outlineSet(tiles), { tinted: ['t49'], near: [0, 0] })!.key, v!.key);
  assert.notEqual(bordersFor(outlineSet(tiles), { tinted: ['t48'], near: [0, 0] })!.key, v!.key);
  void distanceM;
});
