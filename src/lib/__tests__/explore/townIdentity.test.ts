/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../../components/map/types';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { inOutline, outlineSet, outlineTileKey, outlineTileOf, withOutlines, type OutlineSet, type OutlineTile } from '../../areas/outlines';
import { AREA_REACH_M, AREA_RULES } from '../../areas/rules';
import type { Area, PlaceCandidate, WalkArea } from '../../areas/types';
import { ATLAS_CODE, familiarity, nearList, rowCurrent, type AtlasArea, type AtlasProfile, type Listed } from '../../atlas/atlas';
import { createAtlasRead, type AtlasReadIo } from '../../atlas/readShell';
import { distanceM } from '../../geo';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';

// Town identity (specs/town-identity, TI1-TI10): one town is one card on Explore's row however it was read. From /fix
// duplicate-city (the owner, Nov 20: "Philadelphia got listed twice"): the town read joined a label in a tile it had not
// read to a border only within 3 km of the piece read, so Philadelphia's City Hall label and its border were two cards.

const BUILD = 'b1';
const URL_ = 'https://tiles.test/{z}/{x}/{y}.pbf';
const PROFILE = { steps: {}, strips: [], stripAt: null, marks: [], sketch: { paths: [] }, overture: null } as unknown as AtlasProfile;

/** A world of border tiles; `read` and `known` give the tiles under the points asked for (a tile with nothing in it counts as read). */
function world(tiles: OutlineTile[]) {
  const byKey = new Map(tiles.map((t) => [t.key, t]));
  const calls: LngLat[][] = [];
  const under = (points: LngLat[]): OutlineSet => {
    const keys = new Map<string, [number, number]>();
    for (const p of points) {
      const [x, y] = outlineTileOf(p);
      keys.set(outlineTileKey(x, y), [x, y]);
    }
    return outlineSet([...keys].map(([k, [x, y]]) => byKey.get(k) ?? { key: k, z: 12, x, y, release: 'test', read_at: 1, pieces: [], points: [] }));
  };
  const outlines = {
    read: async (points: LngLat[]) => {
      calls.push(points);
      return { set: under(points), complete: true, tooMany: false };
    },
    known: async (points: LngLat[]) => under(points),
    borders: async (points: LngLat[]) => ({ set: under(points), complete: true, tooMany: false }),
  } as unknown as AtlasReadIo['outlines'];
  return { outlines, calls, under };
}

/** The z11 place points the town read fetches: each a label of a class. */
const labels = (ls: { name: string; at: LngLat; cls: string }[]): CollectedFeatures =>
  ({ roads: [], places: ls.map((l) => ({ geometry: { type: 'Point', coordinates: l.at }, properties: { class: l.cls, name: l.name } })) }) as unknown as CollectedFeatures;

function reader(w: ReturnType<typeof world>, places: () => CollectedFeatures) {
  const p = fakePorts();
  const io: AtlasReadIo = {
    outlines: w.outlines,
    fetchTiles: (async () => places()) as unknown as AtlasReadIo['fetchTiles'],
    fetchTileBodies: async () => [],
    readOverture: async () => null,
    archive: { read: async () => null },
    ring: async () => ({ profile: PROFILE, extent: null }),
    exploreBusy: () => false,
  };
  return { p, read: createAtlasRead({ ...p, io }) };
}

/** The row near you after a town read at `at`: the cards, as `useAtlas` lists them with the borders kept under you. */
async function rowAt(w: ReturnType<typeof world>, at: LngLat, places: () => CollectedFeatures, r = reader(w, places)): Promise<{ cards: Listed[]; rows: AtlasArea[] }> {
  await r.p.db.setMeta('tile_url', URL_);
  assert.equal(await r.read.readNear(at, 'town', BUILD, 12_000, () => false), true);
  const rows = (await r.p.db.listAtlasAreas()).filter((x) => x.level === 'town');
  return { cards: nearList(rows, at, 'town', BUILD, w.under([at])), rows };
}

// A synthetic world near Providence: `km(x, y)` is x km east and y km north of HERE.
const HERE: LngLat = [-71.4, 41.82];
const dLat = 1000 / 111320;
const dLon = 1000 / (111320 * Math.cos((HERE[1] * Math.PI) / 180));
const km = (x: number, y: number): LngLat => [HERE[0] + x * dLon, HERE[1] + y * dLat];
const square = (c: LngLat, r: number): LngLat[][][] => {
  const [x, y] = [(c[0] - HERE[0]) / dLon, (c[1] - HERE[1]) / dLat];
  return [[[km(x - r, y - r), km(x + r, y - r), km(x + r, y + r), km(x - r, y + r), km(x - r, y - r)]]];
};
/** Border tiles: each piece is a 1 km square around a point, in the z12 tile under that point. */
function tilesOf(pieces: { id: string; name: string; around: LngLat; r?: number }[]): OutlineTile[] {
  const out = new Map<string, OutlineTile>();
  for (const pc of pieces) {
    const [x, y] = outlineTileOf(pc.around);
    const key = outlineTileKey(x, y);
    const t = out.get(key) ?? { key, z: 12, x, y, release: 'test', read_at: 1, pieces: [], points: [] };
    t.pieces.push({ id: pc.id, name: pc.name, polygons: square(pc.around, pc.r ?? 1) });
    out.set(key, t);
  }
  return [...out.values()];
}
const named = (cards: Listed[], name: string) => cards.filter((c) => c.area.name === name);

// ---- TI1: the owner's report, on Overture's real tiles

const fx = JSON.parse(readFileSync(new URL('./philadelphiaOutlines.json', import.meta.url), 'utf8')) as {
  release: string;
  tiles: { x: number; y: number; division_area: never[]; division: never[] }[];
};
const PHILLY = fx.tiles.map((t) => outlineTileFrom(t.x, t.y, fx.release, 1, { division_area: t.division_area, division: t.division }));
/** Philadelphia's label point in the map's z11 places, at City Hall. */
const CITY_HALL: LngLat = [-75.1636, 39.9527];

test('TI1: Philadelphia from every spot of a grid across it is one card, and the city you are in is "You\'re here"', { todo: 'test first' }, async () => {
  const w = world(PHILLY);
  const spots: LngLat[] = [];
  for (let dx = -12; dx <= 12; dx += 3) for (let dy = -12; dy <= 12; dy += 3) spots.push([CITY_HALL[0] + dx / 85.2, CITY_HALL[1] + dy / 111.3]);
  let inside = 0;
  for (const at of spots) {
    const { cards } = await rowAt(w, at, () => labels([{ name: 'Philadelphia', at: CITY_HALL, cls: 'city' }]));
    const philly = named(cards, 'Philadelphia');
    assert.ok(philly.length <= 1, `${at}: ${philly.length} Philadelphia cards`);
    const holds = w.under([at]).towns.some((t) => t.name === 'Philadelphia' && inOutline(at, t));
    if (holds) {
      inside++;
      assert.equal(philly.length, 1, `${at}: inside the city, one card`);
      assert.equal(philly[0].here, true, `${at}: you are in it`);
    }
  }
  assert.ok(inside >= 20, `spots inside the city: ${inside}`);
});

// ---- TI2, TI6: the border under the label decides

test('TI2: a city label 9 km from the piece read, inside its border, is one town at its label; a same-named label outside it is a town of its own', { todo: 'test first' }, async () => {
  const label = km(9, 0);
  const w = world(tilesOf([{ id: 'big', name: 'Bigcity', around: HERE }, { id: 'big', name: 'Bigcity', around: label }]));
  const { cards, rows } = await rowAt(w, HERE, () => labels([{ name: 'Bigcity', at: label, cls: 'city' }]));
  assert.equal(named(cards, 'Bigcity').length, 1, 'one card');
  assert.deepEqual(named(cards, 'Bigcity')[0].area.at, label, 'at its label');
  assert.equal(rows.find((r) => r.name === 'Bigcity')?.outline_id, 'big', 'the row keeps its border');
  // The label 9 km east, its own tile read and no piece of the border there: another Bigcity.
  const w2 = world(tilesOf([{ id: 'big', name: 'Bigcity', around: HERE }]));
  const other = await rowAt(w2, HERE, () => labels([{ name: 'Bigcity', at: label, cls: 'city' }]));
  assert.equal(named(other.cards, 'Bigcity').length, 2, 'the label outside the border is not that border\'s town');
});

test('TI6: a town-class label 5 km from the piece read, inside its border, is one card; no distance decides it', { todo: 'test first' }, async () => {
  const label = km(5, 0);
  const w = world(tilesOf([{ id: 'twp', name: 'Big Township', around: HERE }, { id: 'twp', name: 'Big Township', around: label }]));
  const { cards } = await rowAt(w, HERE, () => labels([{ name: 'Big Township', at: label, cls: 'town' }]));
  assert.equal(named(cards, 'Big Township').length, 1);
  assert.equal(named(cards, 'Big Township')[0].here, true);
});

// ---- TI3: two towns of one name

test('TI3: two cities of one name, you in A\'s border and B\'s label nearer: two cards, A is "You\'re here"', { todo: 'test first' }, async () => {
  const aLabel = km(5, 0);
  const bLabel = km(-4.5, 0);
  const w = world(tilesOf([
    { id: 'A', name: 'Twin City', around: HERE, r: 1.5 }, { id: 'A', name: 'Twin City', around: aLabel },
    { id: 'B', name: 'Twin City', around: bLabel },
  ]));
  const { cards } = await rowAt(w, HERE, () => labels([{ name: 'Twin City', at: aLabel, cls: 'city' }, { name: 'Twin City', at: bLabel, cls: 'city' }]));
  const twins = named(cards, 'Twin City');
  assert.equal(twins.length, 2, 'two towns');
  const here = twins.filter((c) => c.here);
  assert.equal(here.length, 1);
  assert.deepEqual(here[0].area.at, aLabel, 'the one whose border holds you');
  assert.equal(cards[0], here[0], 'first');
});

// ---- TI4: your town past the read

test('TI4: your town\'s label 13 km away, past the town read: it is listed, first and "You\'re here"', { todo: 'test first' }, async () => {
  const label = km(13, 0);
  const w = world(tilesOf([{ id: 'far', name: 'Longcity', around: HERE }, { id: 'far', name: 'Longcity', around: label }]));
  const { cards } = await rowAt(w, HERE, () => labels([{ name: 'Longcity', at: label, cls: 'city' }, { name: 'Smallville', at: km(-3, 2), cls: 'town' }]));
  assert.equal(named(cards, 'Longcity').length, 1, 'listed once');
  assert.equal(cards[0].area.name, 'Longcity', 'first');
  assert.equal(cards[0].here, true, 'here');
});

// ---- TI5: rows from reads at two spots

test('TI5: a border-only row (read where the label was not fetched) and the label row (read later) are one card, at the label', { todo: 'test first' }, async () => {
  const label = km(9, 0);
  const far = km(-2, 0);
  const w = world(tilesOf([{ id: 'big', name: 'Bigcity', around: far, r: 3 }, { id: 'big', name: 'Bigcity', around: label }]));
  let fetched = labels([]);
  const r = reader(w, () => fetched);
  // At the far spot the label is beyond what was fetched: the town is its border alone, at the middle of the piece.
  await rowAt(w, km(-3, 0), () => fetched, r);
  // Two kilometres on, the label is fetched.
  fetched = labels([{ name: 'Bigcity', at: label, cls: 'city' }]);
  const { cards, rows } = await rowAt(w, HERE, () => fetched, r);
  assert.ok(rows.filter((x) => x.name === 'Bigcity').length >= 1);
  const big = named(cards, 'Bigcity');
  assert.equal(big.length, 1, 'one card');
  assert.deepEqual(big[0].area.at, label, 'the label\'s');
  assert.ok(Math.abs(big[0].distanceM - distanceM(HERE, label)) < 1, 'its distance is to the label');
});

// ---- TI7: what was listed before

test('TI7: town rows of the code before are listed again, its neighborhood rows stand, and only the code just before is carried', { todo: 'test first' }, () => {
  const [own, presence] = ATLAS_CODE.split('.');
  const n = Number(own.slice(1));
  assert.equal(n, 16, 'a16: this slice\'s bump');
  const row = (level: 'town' | 'neighborhood', a: number) => ({ build: BUILD, code: `a${a}.${presence}`, level });
  assert.equal(rowCurrent(row('town', n - 1), BUILD), false, 'a duplicate town row from before goes');
  assert.equal(rowCurrent(row('neighborhood', n - 1), BUILD), true, 'neighborhood rows stand');
  assert.equal(rowCurrent(row('neighborhood', n - 2), BUILD), false, 'never two codes back');
});

// ---- TI8: placing is untouched

test('TI8: placing joins as before (3 km), AREA_RULES is unchanged, and a town card counts the same walks', { todo: 'test first' }, () => {
  assert.equal(AREA_RULES, '5');
  const [x, y] = outlineTileOf(HERE);
  const set = outlineSet([{ key: outlineTileKey(x, y), z: 12, x, y, release: 't', read_at: 1, pieces: [{ id: 'c', name: 'Bigcity', polygons: square(HERE, 1) }], points: [] }]);
  const near: PlaceCandidate = { level: 'town', name: 'Bigcity', at: km(3.5, 0), reachM: AREA_REACH_M.city };
  const farther: PlaceCandidate = { ...near, at: km(9, 0) };
  assert.ok(withOutlines([near], set)[0].outline, 'within 3 km of the piece: joined, as placing did');
  assert.equal(withOutlines([farther], set).find((c) => c.at === farther.at)?.outline, undefined, 'farther: not joined by placing');
  const area = (key: string, at: LngLat): Area => ({ key, level: 'town', name: 'Bigcity', parent_key: 's', lon: at[0], lat: at[1], rules: AREA_RULES });
  const walks: WalkArea[] = [{ walk_id: 'w', area_key: 'k', metres: 100, first_t: 1, last_t: 2, lon: 0, lat: 0 } as WalkArea];
  assert.equal(familiarity({ level: 'town', name: 'Bigcity', at: HERE }, [area('k', km(2.5, 0))], walks).walks, 1, 'within 3 km');
  assert.equal(familiarity({ level: 'town', name: 'Bigcity', at: HERE }, [area('k', km(4, 0))], walks).walks, 0, 'past 3 km, as before');
});

// ---- TI9: the reads it makes

test('TI9: the second read asks only for the tiles of same-named labels not read, at most 12, and none when there are none', { todo: 'test first' }, async () => {
  const label = km(9, 0);
  const w = world(tilesOf([{ id: 'big', name: 'Bigcity', around: HERE }, { id: 'big', name: 'Bigcity', around: label }]));
  await rowAt(w, HERE, () => labels([{ name: 'Bigcity', at: label, cls: 'city' }, { name: 'Elsewhere', at: km(-8, 0), cls: 'town' }]));
  assert.deepEqual(w.calls, [[HERE], [label]], 'under you, then under the one same-named label not read');
  // No label shares a border's name: one read.
  const w2 = world(tilesOf([{ id: 'big', name: 'Bigcity', around: HERE }]));
  await rowAt(w2, HERE, () => labels([{ name: 'Elsewhere', at: km(-8, 0), cls: 'town' }]));
  assert.deepEqual(w2.calls, [[HERE]]);
  // Twenty same-named labels in twenty tiles: at most 12 asked for.
  const many = Array.from({ length: 20 }, (_, i) => ({ name: 'Bigcity', at: km(-11 + i * 1.1, 10.5), cls: 'village' }));
  const w3 = world(tilesOf([{ id: 'big', name: 'Bigcity', around: HERE }]));
  await rowAt(w3, HERE, () => labels(many));
  assert.ok(w3.calls.length === 2 && w3.calls[1].length <= 12, `asked for ${w3.calls[1]?.length}`);
});
