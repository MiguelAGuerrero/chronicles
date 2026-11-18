import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// The road engine's core (RE4-RE7, RE9-RE13, RE29, RE32, RE34): roads from tiles, a directed graph, one way with a cost by kind.
// Hand-made roads for the rules, and nine real z12 tiles of Zurich (zurichRoads.json, scripts/fixture-roads.mjs) for what real
// tiles do at their edges.

const TODO = { todo: 'test first' };
const O: LngLat = [8.5, 47.3];
const M_LAT = 1 / 111_320;
const M_LON = 1 / (111_320 * Math.cos((O[1] * Math.PI) / 180));
const at = (e: number, n: number): LngLat => [O[0] + e * M_LON, O[1] + n * M_LAT];
const road = (kind: string, pts: [number, number][], o: { oneWay?: -1 | 0 | 1; link?: boolean } = {}) => ({ kind, link: !!o.link, oneWay: o.oneWay ?? 0, points: pts.map(([e, n]) => at(e, n)) });
const real = () => JSON.parse(readFileSync(new URL('./zurichRoads.json', import.meta.url), 'utf8')) as { tiles: { z: number; x: number; y: number; features: { class: string; oneway: number; ramp: number; lines: LngLat[][] }[] }[] };
const drain = <T>(g: Generator<void, T>): { value: T; yields: number } => {
  let yields = 0;
  for (;;) {
    const r = g.next();
    if (r.done) return { value: r.value, yields };
    yields++;
  }
};

test('RE5: the roads read are motorways to tertiary and their links; smaller roads, tracks and roads being built are not', TODO, async () => {
  const { roadsFromTile } = await import('../../roads/fromTiles');
  const line = [[at(0, 0), at(100, 0)]];
  const f = (cls: string, extra: object = {}) => ({ class: cls, lines: line, ...extra });
  const got = roadsFromTile([f('motorway'), f('trunk'), f('primary'), f('secondary'), f('tertiary'), f('minor'), f('service'), f('path'), f('track'), f('rail'), f('primary_construction'), f('motorway', { ramp: 1 })], 12, 0, 0, null);
  assert.deepEqual(got.map((r) => `${r.kind}${r.link ? '+link' : ''}`), ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway+link']);
});

test('RE5: a one-way road keeps its sense, either way round; a road with no flag goes both ways', TODO, async () => {
  const { roadsFromTile } = await import('../../roads/fromTiles');
  const line = [[at(0, 0), at(100, 0)]];
  const got = roadsFromTile([{ class: 'primary', oneway: 1, lines: line }, { class: 'primary', oneway: -1, lines: line }, { class: 'primary', lines: line }], 12, 0, 0, null);
  assert.deepEqual(got.map((r) => r.oneWay), [1, -1, 0]);
});

test('RE6: a road is cut to its own tile, so the same stretch is never read from two tiles', TODO, async () => {
  const { roadsFromTile, tileRect } = await import('../../roads/fromTiles');
  const t = real().tiles[4];
  const [w, s, e, n] = tileRect(t.z, t.x, t.y);
  const roads = roadsFromTile(t.features, t.z, t.x, t.y);
  assert.ok(roads.length > 50);
  for (const r of roads) for (const [lon, lat] of r.points) assert.ok(lon >= w - 1e-9 && lon <= e + 1e-9 && lat >= s - 1e-9 && lat <= n + 1e-9, 'inside its tile');
});

test('RE6: roads cut at a tile edge are one road again: hand-made halves some metres apart, and the real tiles as one part', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { roadsFromTile } = await import('../../roads/fromTiles');
  const halves = RoadGraph.build([road('primary', [[0, 0], [500, 0]]), road('primary', [[506, 2], [1000, 0]])] as never);
  assert.ok(halves.largestShare() > 0.99, 'six metres apart at an edge is one road');
  const apart = RoadGraph.build([road('primary', [[0, 0], [500, 0]]), road('primary', [[540, 0], [1000, 0]])] as never);
  assert.ok(apart.largestShare() < 0.6, 'forty metres apart is two');
  const g = RoadGraph.build(real().tiles.flatMap((t) => roadsFromTile(t.features, t.z, t.x, t.y)));
  assert.ok(g.largestShare() >= 0.95, `the real tiles' roads are one part (${g.largestShare().toFixed(3)})`);
  assert.ok(g.nodeCount > 1000 && g.nodeCount < 80_000, `nodes ${g.nodeCount}`);
});

test('RE10: one way, the same every time, whatever order the roads come in', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { findWay } = await import('../../roads/way');
  const roads = [road('primary', [[0, 0], [1000, 0]]), road('secondary', [[0, 0], [0, 600], [1000, 600], [1000, 0]]), road('tertiary', [[1000, 0], [2000, 0]])];
  const a = drain(findWay(RoadGraph.build(roads as never), [at(0, 0), at(2000, 0)])).value;
  const b = drain(findWay(RoadGraph.build([...roads].reverse() as never), [at(0, 0), at(2000, 0)])).value;
  assert.ok(Math.abs(a.lengthM - 2000) < 5, `the direct road (${a.lengthM})`);
  assert.deepEqual(a.path, b.path);
  assert.equal(a.whole, true);
});

test('RE5, RE10: a one-way road is never driven against its sense', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { findWay } = await import('../../roads/way');
  const roads = [road('primary', [[0, 0], [1000, 0]], { oneWay: -1 }), road('secondary', [[0, 0], [0, 400], [1000, 400], [1000, 0]])];
  const there = drain(findWay(RoadGraph.build(roads as never), [at(0, 0), at(1000, 0)])).value;
  assert.ok(there.lengthM > 1700, `around, by the two-way road (${there.lengthM})`);
  const back = drain(findWay(RoadGraph.build(roads as never), [at(1000, 0), at(0, 0)])).value;
  assert.ok(Math.abs(back.lengthM - 1000) < 5, 'and straight back along it');
});

test('RE11: the roads through the towns before the motorway; the motorway only when the other way is more than half as long again', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { findWay } = await import('../../roads/way');
  const { ROAD_RULES } = await import('../../roads/rules');
  const motorway = road('motorway', [[0, 0], [10000, 0]]);
  const through = (extra: number) => road('secondary', [[0, 0], [0, extra / 2], [10000, extra / 2], [10000, 0]]);
  const kinds = (extra: number) => drain(findWay(RoadGraph.build([motorway, through(extra)] as never), [at(0, 0), at(10000, 0)])).value.kinds;
  assert.equal(kinds(3000).motorway ?? 0, 0, 'thirty per cent longer through the towns: taken');
  assert.ok((kinds(7000).motorway ?? 0) > 9000, 'seventy per cent longer: the motorway');
  assert.equal(ROAD_RULES.cost.motorway, 1.5);
  assert.deepEqual(Object.keys(ROAD_RULES.cost).sort(), ['motorway', 'primary', 'secondary', 'tertiary', 'trunk'], 'a cost by kind of road, and no speed or time');
});

test('RE12: the way passes through the towns in order; a town with no road in reach keeps a straight stretch and the way says so', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { findWay } = await import('../../roads/way');
  const g = RoadGraph.build([road('primary', [[0, 0], [5000, 0]]), road('primary', [[5000, 0], [5000, 5000]])] as never);
  const via = drain(findWay(g, [at(0, 0), at(5000, 0), at(5000, 5000)])).value;
  assert.equal(via.legs.length, 2);
  assert.ok(Math.abs(via.lengthM - 10000) < 10);
  const off = drain(findWay(g, [at(0, 0), at(5000, 0), at(40000, 40000)])).value;
  assert.equal(off.whole, false);
  assert.equal(off.legs[1], null, 'no road within reach of the last town');
  assert.ok(off.legs[0] && Math.abs(off.legs[0].lengthM - 5000) < 10);
});

test('RE10, RE29: a way across the real tiles\' edges is found in steps that yield, and is a road, not a line', TODO, async () => {
  const { RoadGraph } = await import('../../roads/graph');
  const { roadsFromTile } = await import('../../roads/fromTiles');
  const { findWay } = await import('../../roads/way');
  const { distanceM } = await import('../../geo');
  const g = RoadGraph.build(real().tiles.flatMap((t) => roadsFromTile(t.features, t.z, t.x, t.y)));
  const from: LngLat = [8.47, 47.33];
  const to: LngLat = [8.61, 47.41];
  const r = drain(findWay(g, [from, to]));
  assert.equal(r.value.whole, true);
  const straight = distanceM(from, to);
  assert.ok(r.value.lengthM > straight && r.value.lengthM < straight * 2, `by road ${Math.round(r.value.lengthM)} against ${Math.round(straight)} straight`);
  assert.ok(r.yields > 0, 'it yields on the way');
  assert.ok(r.value.path.length > 20);
});

test('RE7: the tiles of a corridor about the towns, bounded: a journey too long for the bound gives none', TODO, async () => {
  const { tilesAlong } = await import('../../roads/corridor');
  const { ROAD_RULES } = await import('../../roads/rules');
  const near = tilesAlong([at(0, 0), at(20000, 0)])!;
  assert.ok(near.length >= 3 && near.length <= 20, `${near.length} tiles for 20 km`);
  assert.equal(new Set(near.map((t) => t.join('/'))).size, near.length);
  assert.equal(tilesAlong([at(0, 0), at(400000, 0)]), null);
  assert.equal(ROAD_RULES.tilesMax, 60);
  assert.equal(ROAD_RULES.zoom, 12);
});

test('RE4, RE34: roads come through a source; the in-memory one answers for any tiles and can be stopped', TODO, async () => {
  const { memoryRoads } = await import('../../roads/types');
  const src = memoryRoads([road('primary', [[0, 0], [100, 0]])] as never);
  assert.equal((await src.read([[1, 2]]))!.length, 1);
  assert.equal(await src.read([[1, 2]], () => true), null);
});

test('RE9, RE13, RE32: the core holds no word of an outing, no clock and no state; its words hold a distance and nothing else', TODO, async () => {
  for (const f of ['types', 'rules', 'fromTiles', 'graph', 'way', 'corridor', 'words']) {
    const src = readFileSync(new URL(`../../roads/${f}.ts`, import.meta.url), 'utf8');
    assert.match(src, /^\/\/ @layer core/, f);
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(code, /outing|chapter|chip|journey|Date\.now|setTimeout|Math\.random/i, f);
  }
  const { byRoadLine } = await import('../../roads/words');
  assert.equal(byRoadLine(31_400, 'km'), '31 km by road');
  assert.equal(byRoadLine(4_300, 'km'), '4.3 km by road');
  assert.doesNotMatch(byRoadLine(31_400, 'mi'), /\b(min|minutes?|hours?|fast|quick|short|best)\b/i);
});
