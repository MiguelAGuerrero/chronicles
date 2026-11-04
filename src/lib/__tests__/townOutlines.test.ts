/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { assignAreas, placesRead } from '../areas/assign';
import { outlineTileFrom } from '../areas/divisionTiles';
import {
  coveredBy, hoodAllowed, inOutline, listable, outlineSet, outlineTileKey, outlineTileOf, outlineTilesFor, townAt, withOutlines, withoutOutlines,
  type OutlineSet, type OutlineTile,
} from '../areas/outlines';
import { AREA_REACH_M, AREA_RULES } from '../areas/rules';
import type { BoundarySource, PlaceCandidate, TownOutline } from '../areas/types';
import { distanceM, stepToward } from '../geo';
import type { LngLat, TracePoint } from '../types';
import type { TileFeature } from '../areas/tilePlaces';
import { ATLAS_CODE, nearList, townOf, type AtlasArea } from '../atlas/atlas';
import { areaFor, buildChecklists } from '../explore/explore';

// Town outlines (TO1-TO9), written from specs/town-outlines/spec.md. The real
// cases run against Overture's own divisions tiles (release 2026-10-21.0, cut
// by scripts/fixture-outlines.mjs); the rules run against small squares.

const require = createRequire(import.meta.url);
const fixture = require('./townOutlines.json') as {
  release: string;
  tiles: { x: number; y: number; division_area: TileFeature[]; division: TileFeature[] }[];
};
const realTiles = (only?: string[]): OutlineTile[] =>
  fixture.tiles
    .filter((t) => !only || only.includes(outlineTileKey(t.x, t.y)))
    .map((t) => outlineTileFrom(t.x, t.y, fixture.release, 1, { division_area: t.division_area, division: t.division }));

const GYM: LngLat = [-75.49368, 40.64787]; // Planet Fitness, 2677 MacArthur Rd, Whitehall PA
const CATASAUQUA: LngLat = [-75.4746, 40.6548]; // the borough's label point, 1.8 km from the gym
const WHITEHALL_POINT: LngLat = [-75.507445, 40.657413]; // Overture's own point for Whitehall, in the next tile west
const MIDTOWN: LngLat = [-73.985, 40.758];

const town = (name: string, at: LngLat, reachM: number = AREA_REACH_M.town, kind?: string): PlaceCandidate => ({ level: 'town', name, at, reachM, kind });
const hood = (name: string, at: LngLat): PlaceCandidate => ({ level: 'neighborhood', name, at, reachM: AREA_REACH_M.neighborhood });

// ---- small squares, for the rules

const O: LngLat = [-75.0, 40.6];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const square = (x0: number, y0: number, x1: number, y1: number): LngLat[][][] => [[[at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]]];
/** A tile holding square towns, keyed as the tile around O, so O and its few km are covered. */
function squaresTile(towns: { id: string; name: string; polygons: LngLat[][][]; at?: LngLat }[]): OutlineTile {
  const [x, y] = outlineTileOf(O);
  return {
    key: outlineTileKey(x, y), x, y, release: 'test', read_at: 1,
    pieces: towns.map(({ id, name, polygons }) => ({ id, name, polygons })),
    points: towns.filter((t) => t.at).map((t) => ({ id: t.id, at: t.at! })),
  };
}

test('TO1: the gym at 2677 MacArthur Rd is in Whitehall, not Catasauqua', () => {
  const set = outlineSet(realTiles());
  const labelPoints = [town('Catasauqua', CATASAUQUA)];
  // Before outlines: the nearest label point, Catasauqua.
  assert.equal(townAt(GYM, labelPoints, null)?.c.name, 'Catasauqua');
  const pick = townAt(GYM, withOutlines(labelPoints, set), set);
  assert.equal(pick?.c.name, 'Whitehall');
  assert.equal(pick?.by, 'outline');
  // And Catasauqua's own middle is still Catasauqua, by its outline.
  assert.equal(townAt(CATASAUQUA, withOutlines(labelPoints, set), set)?.c.name, 'Catasauqua');
  assert.equal(townAt(CATASAUQUA, withOutlines(labelPoints, set), set)?.by, 'outline');
});

test('TO2: Midtown is in Manhattan, the smaller of two nested outlines', () => {
  const set = outlineSet(realTiles());
  const nyc = town('New York', [-74.006, 40.7128], AREA_REACH_M.city, 'city');
  const manhattan = town('Manhattan', [-73.9712, 40.7831], AREA_REACH_M.city, 'borough');
  const ny = set.towns.find((t) => t.name === 'New York')!;
  const mh = set.towns.find((t) => t.name === 'Manhattan')!;
  assert.ok(inOutline(MIDTOWN, ny) && inOutline(MIDTOWN, mh), 'both outlines hold Midtown');
  assert.equal(townAt(MIDTOWN, withOutlines([nyc, manhattan], set), set)?.c.name, 'Manhattan');
  // With no borough point in the tiles, Manhattan's outline still stands for it.
  assert.equal(townAt(MIDTOWN, withOutlines([nyc], set), set)?.c.name, 'Manhattan');
  // Synthetic nesting: a village inside a township is the town.
  const s = outlineSet([squaresTile([
    { id: 'tw', name: 'Township', polygons: square(-20, -20, 20, 20) },
    { id: 'vi', name: 'Village', polygons: square(-3, -3, 3, 3) },
  ])]);
  assert.equal(townAt(at(1, 1), withOutlines([], s), s)?.c.name, 'Village');
  assert.equal(townAt(at(10, 10), withOutlines([], s), s)?.c.name, 'Township');
});

test('TO3: no outline read: the nearest point; a read outline that misses never wins by its point', () => {
  // A's point is nearest, but A's border stops short of the point; B has no outline.
  const a = town('A', at(5, 0));
  const b = town('B', at(-15, 0));
  const s = outlineSet([squaresTile([{ id: 'a', name: 'A', polygons: square(3, -5, 13, 5) }])]);
  const p = at(0, 0);
  assert.equal(townAt(p, [a, b], null)?.c.name, 'A', 'no outlines: as before');
  const pick = townAt(p, withOutlines([a, b], s), s);
  assert.equal(pick?.c.name, 'B');
  assert.equal(pick?.by, 'point');
  // Where the outlines were not read at the point, every point counts, A's too.
  const far = at(0, 0);
  const elsewhere: OutlineSet = { tiles: new Set(['0/0']), towns: s.towns };
  assert.equal(coveredBy(elsewhere, far), false);
  assert.equal(townAt(far, withOutlines([a, b], elsewhere), elsewhere)?.c.name, 'A');
  // Nothing within reach and no outline: no town.
  assert.equal(townAt(at(0, 0), withOutlines([], s), s), null);
});

test('TO4: an outline-only town is a place, at Overture\'s point, else the middle of what was read', () => {
  // Both tiles: Whitehall's own point is in the western one.
  const both = outlineSet(realTiles());
  const wh = withOutlines([town('Catasauqua', CATASAUQUA)], both).filter((c) => c.name === 'Whitehall');
  assert.equal(wh.length, 1);
  assert.equal(wh[0].kind, 'outline');
  assert.deepEqual(wh[0].at, both.towns.find((t) => t.name === 'Whitehall')!.at);
  assert.ok(distanceM(wh[0].at, WHITEHALL_POINT) < 5, `at Overture's point, got ${wh[0].at}`);
  // Only the gym's tile: no point of its own, so the middle of the pieces read, inside its box.
  const [gx, gy] = outlineTileOf(GYM);
  const one = outlineSet(realTiles([outlineTileKey(gx, gy)]));
  const t = one.towns.find((x) => x.name === 'Whitehall')!;
  assert.equal(t.at, null);
  const c = withOutlines([], one).find((x) => x.name === 'Whitehall')!;
  assert.ok(c.at[0] >= t.bbox[0] && c.at[0] <= t.bbox[2] && c.at[1] >= t.bbox[1] && c.at[1] <= t.bbox[3]);
  // Listed on the Explore tab: one with its own point, or the one holding you; never one placed at a guessed middle.
  assert.equal(listable(wh[0], GYM), true);
  assert.equal(listable(c, GYM), true, 'it holds the gym');
  assert.equal(listable(c, [-75.3, 40.7]), false);
  assert.equal(listable(town('Catasauqua', CATASAUQUA), [-75.3, 40.7]), true, 'a label point always is');
  // The decoder keeps localities on land only.
  const tile = outlineTileFrom(0, 0, 'r', 1, {
    division_area: [
      { geometry: { type: 'Polygon', coordinates: square(0, 0, 1, 1)[0] }, properties: { subtype: 'county', '@name': 'C', division_id: 'c' } },
      { geometry: { type: 'Polygon', coordinates: square(0, 0, 1, 1)[0] }, properties: { subtype: 'locality', class: 'maritime', '@name': 'M', division_id: 'm' } },
      { geometry: { type: 'Polygon', coordinates: square(0, 0, 1, 1)[0] }, properties: { subtype: 'locality', class: 'land', '@name': 'L', division_id: 'l' } },
    ],
  });
  assert.deepEqual(tile.pieces.map((p) => p.name), ['L']);
});

test('TO5: a label point inside its own outline is one candidate, at the label point', () => {
  const set = outlineSet(realTiles());
  const out = withOutlines([town('Catasauqua', CATASAUQUA)], set);
  const cat = out.filter((c) => c.name === 'Catasauqua');
  assert.equal(cat.length, 1);
  assert.deepEqual(cat[0].at, CATASAUQUA);
  assert.ok(cat[0].outline, 'carries its outline');
  // A label point beyond the tiles read, near the outline, is joined too (not a second town).
  const [gx, gy] = outlineTileOf(GYM);
  const one = outlineSet(realTiles([outlineTileKey(gx, gy)]));
  const wh = withOutlines([town('Whitehall', WHITEHALL_POINT)], one).filter((c) => c.name === 'Whitehall');
  assert.equal(wh.length, 1);
  assert.deepEqual(wh[0].at, WHITEHALL_POINT);
  // Stored with a read, candidates leave their outlines out.
  assert.equal(withoutOutlines(out).some((c) => c.outline), false);
});

test('TO6: a neighborhood point across the town\'s border does not count', () => {
  const s = outlineSet([squaresTile([
    { id: 'a', name: 'A', polygons: square(-10, -10, 0, 10) },
    { id: 'b', name: 'B', polygons: square(0, -10, 10, 10) },
  ])]);
  const cands = withOutlines([], s);
  const p = at(-1, 0);
  const pick = townAt(p, cands, s);
  assert.equal(pick?.c.name, 'A');
  assert.equal(hoodAllowed(hood('Across', at(2, 0)), pick, s), false);
  assert.equal(hoodAllowed(hood('Inside', at(-3, 0)), pick, s), true);
  // A town found by its point keeps every neighborhood within reach, as before.
  assert.equal(hoodAllowed(hood('Across', at(2, 0)), { c: town('P', at(0, 0)), by: 'point' }, s), true);
  // In a walk: the nearer point across the border loses to the one inside.
  const across = hood('Across', at(1, 0));
  const inside = hood('Inside', at(-6, 0));
  const r = assignAreas('w', walk([at(-2, 0), at(-1, 0)]), [], [across, inside], testBoundaries, null, [], [], s);
  const names = r.rows.map((x) => r.areas.get(x.area_key)!).filter((a) => a.level === 'neighborhood').map((a) => a.name);
  assert.deepEqual(names, ['Inside']);
});

// ---- walks

function walk(path: LngLat[], t0 = 0): TracePoint[] {
  const pts: TracePoint[] = [{ walk_id: 'w', t: t0, lon: path[0][0], lat: path[0][1], accuracy_m: 8, speed: 1.4, course: null }];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 7);
      t += 5000;
      pts.push({ walk_id: 'w', t, lon: pos[0], lat: pos[1], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}

const testBoundaries: BoundarySource = {
  id: 'test-boundaries',
  containing: () => ({ country: { name: 'United States', code: 'US', at: [-98, 39] }, state: { name: 'Pennsylvania', code: 'US-PA', at: [-77.6, 40.9] } }),
};

test('TO7: a walk across the Whitehall-Catasauqua border counts metres in both, titled by the larger', () => {
  const set = outlineSet(realTiles());
  const cat = set.towns.find((t) => t.name === 'Catasauqua')!;
  // From the gym toward Catasauqua's middle, stopping 300 m past its border.
  const path: LngLat[] = [GYM];
  let p = GYM;
  let inside = 0;
  while (inside < 40 && distanceM(p, CATASAUQUA) > 10) {
    p = stepToward(p, CATASAUQUA, 10);
    if (inOutline(p, cat)) inside++;
  }
  path.push(p);
  const r = assignAreas('w', walk(path), [], [town('Catasauqua', CATASAUQUA)], testBoundaries, null, [], [], set);
  const towns = r.rows.filter((x) => r.areas.get(x.area_key)!.level === 'town');
  const m = (name: string) => towns.find((x) => r.areas.get(x.area_key)!.name === name)?.metres ?? 0;
  assert.ok(m('Whitehall') > 0 && m('Catasauqua') > 0, `both: Whitehall ${m('Whitehall')}, Catasauqua ${m('Catasauqua')}`);
  assert.ok(Math.abs(m('Catasauqua') - 400) <= 100, `about 400 m in Catasauqua, got ${m('Catasauqua')}`);
  assert.equal(r.title, m('Whitehall') > m('Catasauqua') ? 'Whitehall' : 'Catasauqua');
  // Without outlines, the whole walk was Catasauqua's (the bug).
  const before = assignAreas('w', walk(path), [], [town('Catasauqua', CATASAUQUA)], testBoundaries);
  assert.equal(before.title, 'Catasauqua');
  assert.equal(before.rows.filter((x) => before.areas.get(x.area_key)!.level === 'town').length, 1);
});

test('TO8: places are read only when the outlines were too; an unread outline means the walk is tried again', () => {
  assert.equal(placesRead({ needed: false, placed: false, outlinesRead: false }), true, 'nothing to place');
  assert.equal(placesRead({ needed: true, placed: false, outlinesRead: true }), false, 'the place points failed');
  assert.equal(placesRead({ needed: true, placed: true, outlinesRead: false }), false, 'placed by points: tried again');
  assert.equal(placesRead({ needed: true, placed: true, outlinesRead: true }), true);
});

test('TO9: the rules tag changes with AREA_RULES, not with the Overture release', () => {
  assert.equal(AREA_RULES, '2');
  const tiles = realTiles();
  const other = tiles.map((t) => ({ ...t, release: '2027-01-01.0' }));
  const path = walk([GYM, stepToward(GYM, CATASAUQUA, 200)]);
  const a = assignAreas('w', path, [], [], testBoundaries, null, [], [], outlineSet(tiles));
  const b = assignAreas('w', path, [], [], testBoundaries, null, [], [], outlineSet(other));
  assert.deepEqual([...a.areas.values()], [...b.areas.values()]);
  assert.ok([...a.areas.values()].every((x) => x.rules === `${AREA_RULES}/test-boundaries`));
});

test('TO12: a read asks for the tiles under its points, at most twelve', () => {
  assert.deepEqual(outlineTilesFor([GYM, CATASAUQUA]), [outlineTileOf(GYM)]);
  assert.equal(outlineTilesFor([GYM, WHITEHALL_POINT])!.length, 2);
  const many = Array.from({ length: 13 }, (_, i): LngLat => [-75 + i * 0.1, 40.6]);
  assert.equal(outlineTilesFor(many), null);
});

// Keep the TownOutline type in use for the type check of the fixture's shape.
export type { TownOutline };

// ---- the Explore tab and its checklists

const atlasRow = (name: string, at: LngLat, o: Partial<AtlasArea> = {}): AtlasArea => ({
  key: name, level: 'town', name, at, reachM: AREA_REACH_M.town, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null, ...o,
});

/** Two points 10 m apart, either side of Catasauqua's western border, on the way from the gym. */
function acrossBorder(set: OutlineSet): { out: LngLat; inside: LngLat } {
  const cat = set.towns.find((t) => t.name === 'Catasauqua')!;
  let prev = GYM;
  let p = GYM;
  while (!inOutline(p, cat)) {
    prev = p;
    p = stepToward(p, CATASAUQUA, 10);
  }
  return { out: prev, inside: p };
}

test('TO10: here is the town whose outline you are in, at once across a border', () => {
  const set = outlineSet(realTiles());
  const rows = [atlasRow('Catasauqua', CATASAUQUA), atlasRow('Whitehall', WHITEHALL_POINT)];
  const here = (from: LngLat, s: OutlineSet | null, rs = rows) => nearList(rs, from, 'town', 'b1', s).find((l) => l.here)?.area.name ?? null;
  assert.equal(here(GYM, set), 'Whitehall');
  const { out, inside } = acrossBorder(set);
  assert.ok(distanceM(out, inside) <= 11);
  assert.equal(here(out, set), 'Whitehall');
  assert.equal(here(inside, set), 'Catasauqua');
  // Not listed yet (its row comes with the next near read): nobody is here, never Catasauqua.
  assert.equal(here(GYM, set, [atlasRow('Catasauqua', CATASAUQUA)]), null);
  // No outlines kept: the nearest point within reach, as before.
  assert.equal(here(GYM, null, [atlasRow('Catasauqua', CATASAUQUA)]), 'Catasauqua');
  // A town's neighborhoods belong to it by its outline too.
  const hoodRow = atlasRow('Hokendauqua', stepToward(inside, CATASAUQUA, -200), { level: 'neighborhood', reachM: AREA_REACH_M.neighborhood });
  assert.equal(townOf(hoodRow, rows, set)?.name, 'Whitehall');
  assert.equal(townOf(hoodRow, rows)?.name, 'Catasauqua', 'by points, as before');
});

test('TO11: a checklist place belongs to the town whose outline holds it, and to none across the border', () => {
  const set = outlineSet(realTiles());
  const cands = [town('Catasauqua', CATASAUQUA)];
  // 300 m inside Whitehall, 700 m from Catasauqua's point: before outlines, Catasauqua's.
  const { out, inside } = acrossBorder(set);
  const block = stepToward(out, GYM, 300);
  assert.equal(areaFor(block, cands)?.name, 'Catasauqua');
  // With them: Whitehall's, or no list where Whitehall's (1.5 km from its point) doesn't reach; never Catasauqua's.
  const got = areaFor(block, cands, set);
  assert.ok(got === null || got.name === 'Whitehall', `got ${got?.name}`);
  assert.equal(areaFor(GYM, cands, set), null, 'the gym is past both lists');
  const nearWhitehall = stepToward(WHITEHALL_POINT, GYM, 300);
  assert.equal(areaFor(nearWhitehall, cands, set)?.name, 'Whitehall');
  assert.equal(areaFor(inside, cands, set)?.name, 'Catasauqua');
  assert.notEqual(areaFor(out, cands, set)?.name, 'Catasauqua');
  // A read built around Whitehall's point lists it, and the place inside it goes on its list.
  const museum = { key: 'm', name: 'Museum', category: 'culture' as const, at: nearWhitehall, generic: false, build: 'b1', markable: true, kind: 'museums' as const };
  const built = buildChecklists({ places: [museum], candidates: cands, centre: WHITEHALL_POINT, build: 'b1', now: 1, outlines: set });
  const wh = built.areas.find((a) => a.name === 'Whitehall');
  assert.ok(wh, 'Whitehall gets a list');
  assert.equal(built.items[0].area_key, wh!.key);
});
