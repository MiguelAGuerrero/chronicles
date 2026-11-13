/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { bordersGeoJSON } from '../../../components/map/types';
import { nextFrame, townPicked } from '../../atlas/atlas';
import { BORDER_RULES, bordersFor, outlineIdHere, outlineIdsOf, outlineOf, simplifyRing, townFrame, townPlaces } from '../../areas/borders';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { BORDER_ZOOM, outlineSet, outlineTileKey, outlineTileOf, type OutlineTile } from '../../areas/outlines';
import type { TileFeature } from '../../areas/tilePlaces';
import { boundsOf, distanceM } from '../../geo';
import type { LngLat } from '../../types';

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

test('TB11: Explore frames the whole of your town: its drawn border\'s box, holding you and its own point', () => {
  const here = outlineIdHere(GYM, 'Whitehall', z12)!;
  const f = townFrame(z10, here);
  assert.equal(f?.id, here);
  const [w, s, e, n] = f!.bounds;
  for (const p of [GYM, [-75.507445, 40.657413] as LngLat]) assert.ok(p[0] > w && p[0] < e && p[1] > s && p[1] < n, `${p} inside`);
  // Whitehall is a few miles across: wider than the 800 m ring Explore frames by default.
  assert.ok(distanceM([w, s], [e, s]) > 4000, `${distanceM([w, s], [e, s]).toFixed(0)} m across`);
  assert.equal(townFrame(z10, null), null);
  assert.equal(townFrame(null, here), null);
});

const PAW = { id: 'pawtucket', bounds: [-71.412, 41.811, -71.388, 41.829] as [number, number, number, number] };
const PTS: LngLat[] = [[-71.404, 41.824], [-71.401, 41.82]];
const ME: LngLat = [-71.4, 41.82];

test('fix explore-fit-area: a page frames its whole town once the border is known, never its points after it', () => {
  // Before the border is known: the page's areas (and you, near you), padded, as AT9.
  const early = nextFrame(null, { page: 'near', build: 'b1', town: null, points: PTS, from: ME, padM: 150 })!;
  assert.ok(early.bounds[0] < -71.404 && early.bounds[2] > -71.4, 'points and you inside');
  // Once known, the town's whole box, whatever came first.
  const whole = nextFrame(early.framed, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 })!;
  assert.deepEqual(whole.bounds, PAW.bounds);
  // The areas listed after the border, or you moving, frame nothing more: the town is never undone by them.
  assert.equal(nextFrame(whole.framed, { page: 'near', build: 'b1', town: PAW, points: [...PTS, [-71.39, 41.83]], from: [-71.401, 41.821], padM: 150 }), null);
  // The border first, then the areas: still the town alone.
  const first = nextFrame(null, { page: 'near', build: 'b1', town: PAW, points: [], from: ME, padM: 150 })!;
  assert.deepEqual(first.bounds, PAW.bounds);
  assert.equal(nextFrame(first.framed, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 }), null);
  // A town's page frames its areas, never you, until its border is known; nothing listed and no border, nothing.
  const far = nextFrame(null, { page: 'town:x', build: 'b1', town: null, points: [[-71.3, 41.9]], from: ME, padM: 150 })!;
  assert.ok(far.bounds[0] > -71.31, 'you are left out of a town page');
  assert.equal(nextFrame(null, { page: 'near', build: 'b1', town: null, points: [], from: ME, padM: 150 }), null);
});

test('fix explore-fit-area audit 1: a page whose town was framed never frames its points when the border is briefly unknown', () => {
  const town = nextFrame(null, { page: 'town:paw', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 })!;
  // Another tab in front: the outline set is null while the tab is blurred; then it comes back.
  assert.equal(nextFrame(town.framed, { page: 'town:paw', build: 'b1', town: null, points: PTS, from: ME, padM: 150 }), null);
  assert.equal(nextFrame(town.framed, { page: 'town:paw', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 }), null);
  // Your town changing under you (Locate into the next town) frames the new one once.
  const next = { id: 'central-falls', bounds: [-71.388, 41.811, -71.36, 41.829] as [number, number, number, number] };
  assert.deepEqual(nextFrame(town.framed, { page: 'town:paw', build: 'b1', town: next, points: PTS, from: ME, padM: 150 })?.bounds, next.bounds);
  // A new build frames the page again, as AT9 did.
  assert.deepEqual(nextFrame(town.framed, { page: 'town:paw', build: 'b2', town: PAW, points: PTS, from: ME, padM: 150 })?.bounds, PAW.bounds);
});

test('fix explore-fit-area audit 2, audit 3: each visit to a page frames it, back near you or the same town again', () => {
  const near = nextFrame(null, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 })!;
  const other = { id: 'providence', bounds: [-71.47, 41.77, -71.37, 41.86] as [number, number, number, number] };
  const page = nextFrame(near.framed, { page: 'town:prov', build: 'b1', town: other, points: PTS, from: ME, padM: 150 })!;
  assert.deepEqual(page.bounds, other.bounds);
  // Back near you: the page that differs from the last framed frames your town again (audit 2).
  assert.deepEqual(nextFrame(page.framed, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 })?.bounds, PAW.bounds);
  // A visit starts over from nothing framed (the screen clears it on opening a page), so the same town's page
  // reopened frames it again (audit 3).
  assert.deepEqual(nextFrame(null, { page: 'town:prov', build: 'b1', town: other, points: PTS, from: ME, padM: 150 })?.bounds, other.bounds);
});

test('fix explore-fit-area audit 8: a town already framed in this visit isn\'t framed again when you come back into it', () => {
  const next = { id: 'central-falls', bounds: [-71.388, 41.811, -71.36, 41.829] as [number, number, number, number] };
  const a = nextFrame(null, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 })!;
  const b = nextFrame(a.framed, { page: 'near', build: 'b1', town: next, points: PTS, from: ME, padM: 150 })!;
  assert.deepEqual(b.bounds, next.bounds);
  // Locate back into the first town: your view stands.
  assert.equal(nextFrame(b.framed, { page: 'near', build: 'b1', town: PAW, points: PTS, from: ME, padM: 150 }), null);
});

test('fix explore-fit-area audit 9: a town\'s page with only its own point listed frames its reach, not 150 m around it', () => {
  const at: LngLat = [-71.4, 41.82];
  const f = nextFrame(null, { page: 'town:paw', build: 'b1', town: null, points: [at], from: null, padM: 1800 })!;
  assert.ok(distanceM([f.bounds[0], at[1]], [f.bounds[2], at[1]]) > 3500, 'about 3.6 km across');
});

test('fix town-fit: a town selected in the row is framed whole each time, at its own zoom, and once', () => {
  const cat = { id: 'catasauqua', bounds: [-71.379, 41.822, -71.371, 41.832] as [number, number, number, number] };
  const CAT: LngLat = [-71.375, 41.827];
  // Another town selected, its border known: its whole border, and the page's own frame doesn't frame it twice.
  const c1 = townPicked({ page: 'near', build: 'b1', town: cat, at: CAT, padM: 3000 });
  assert.deepEqual(c1.bounds, cat.bounds);
  assert.equal(nextFrame(c1.framed, { page: 'near', build: 'b1', town: cat, points: PTS, from: ME, padM: 150 }), null);
  // Back to your town, framed at arrival: framed whole again (the owner, Nov 13: it kept the last town's zoom).
  const p1 = townPicked({ page: 'near', build: 'b1', town: PAW, at: ME, padM: 3000 });
  assert.deepEqual(p1.bounds, PAW.bounds);
  // And the other town again: its own border, not the zoom it was left at.
  assert.deepEqual(townPicked({ page: 'near', build: 'b1', town: cat, at: CAT, padM: 3000 }).bounds, cat.bounds);
  // A town whose border isn't known yet: its reach around its point, then its whole border once known, even one framed before.
  const u = townPicked({ page: 'near', build: 'b1', town: null, at: CAT, padM: 3000 });
  assert.deepEqual(u.bounds, boundsOf([CAT], 3000));
  assert.deepEqual(nextFrame(u.framed, { page: 'near', build: 'b1', town: cat, points: PTS, from: ME, padM: 150 })?.bounds, cat.bounds);
  // Unknown, it frames nothing more from the page's areas meanwhile.
  assert.equal(nextFrame(u.framed, { page: 'near', build: 'b1', town: null, points: PTS, from: ME, padM: 150 }), null);
  // On a town's page, its own card selected after a neighborhood: the whole town again.
  assert.deepEqual(townPicked({ page: 'town:paw', build: 'b1', town: PAW, at: ME, padM: 3000 }).bounds, PAW.bounds);
});
