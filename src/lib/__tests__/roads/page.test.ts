/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import type { Road, RoadSource } from '../../roads/types';

// The road engine on the page (RE1, RE2, RE7, RE8, RE15-RE18, RE29, RE30): the tiles as a source, the service that reads a
// corridor and finds one way, the line thinned for the map, and what the page says. Written before the code.

const O: LngLat = [8.5, 47.3];
const M_LAT = 1 / 111_320;
const M_LON = 1 / (111_320 * Math.cos((O[1] * Math.PI) / 180));
const at = (e: number, n: number): LngLat => [O[0] + e * M_LON, O[1] + n * M_LAT];
const road = (pts: [number, number][]): Road => ({ kind: 'primary', link: false, oneWay: 0, points: pts.map(([e, n]) => at(e, n)) });
/** A road east for 8 km, bent once. */
const ROADS = [road([[0, 0], [4000, 600]]), road([[4000, 600], [8000, 0]])];
const A = at(0, 0);
const B = at(8000, 0);
const counted = (roads: readonly Road[] | null) => {
  const calls: (readonly [number, number][])[] = [];
  const source: RoadSource = {
    read: async (tiles, shouldStop) => {
      calls.push(tiles);
      return shouldStop?.() || !roads ? null : [...roads];
    },
  };
  return { source, calls };
};

test('RE4, RE5: a tile\'s features reach the engine as its own: class, sense and ramp, lines only', async () => {
  const { tileFeatures } = await import('../../roads/tilesSource');
  const line = [A, B];
  const got = tileFeatures([
    { geometry: { type: 'LineString', coordinates: line }, properties: { class: 'primary', oneway: 1 } },
    { geometry: { type: 'MultiLineString', coordinates: [line, line] }, properties: { class: 'motorway', ramp: 1, oneway: -1 } },
    // A test tile's values are text.
    { geometry: { type: 'LineString', coordinates: line }, properties: { class: 'trunk', oneway: '1' } },
    { geometry: { type: 'Polygon', coordinates: [[A, B, A]] }, properties: { class: 'pier' } },
    { geometry: { type: 'Point', coordinates: A }, properties: null },
  ]);
  assert.deepEqual(got.map((f) => [f.class, f.oneway, !!f.ramp, f.lines.length]), [['primary', 1, false, 1], ['motorway', -1, true, 2], ['trunk', 1, false, 1]]);
});

test('RE4, RE8: the tiles source asks for the corridor\'s tiles at the engine\'s zoom and nothing else; a failed read gives none', async () => {
  const { createTileRoads } = await import('../../roads/tilesSource');
  const { ROAD_RULES } = await import('../../roads/rules');
  const { tileRect } = await import('../../roads/fromTiles');
  const asked: { tiles: [number, number][]; zoom: number }[] = [];
  const [w, s, e, n] = tileRect(12, 2144, 1434);
  const inside: LngLat[] = [[w + (e - w) * 0.2, (s + n) / 2], [w + (e - w) * 0.8, (s + n) / 2]];
  const src = createTileRoads({
    bodies: async (tiles, zoom) => {
      asked.push({ tiles, zoom });
      return tiles.map(() => new ArrayBuffer(1));
    },
    decode: () => [{ geometry: { type: 'LineString', coordinates: inside }, properties: { class: 'secondary' } }],
    pause: async () => {},
  });
  const roads = await src.read([[2144, 1434]]);
  assert.deepEqual(asked, [{ tiles: [[2144, 1434]], zoom: ROAD_RULES.zoom }]);
  assert.equal(roads?.length, 1);
  assert.equal(roads?.[0].kind, 'secondary');
  const broken = createTileRoads({ bodies: async () => { throw new Error('offline'); }, decode: () => [], pause: async () => {} });
  assert.equal(await broken.read([[2144, 1434]]), null);
  const stopped = createTileRoads({ bodies: async (t) => t.map(() => new ArrayBuffer(1)), decode: () => [], pause: async () => {} });
  assert.equal(await stopped.read([[2144, 1434]], () => true), null);
});

test('RE1, RE10: the service reads the corridor once and finds one way through the points, a road and not a line', async () => {
  const { createRoads } = await import('../../roads/service');
  const { source, calls } = counted(ROADS);
  const roads = createRoads({ source, pause: async () => {} });
  const got = await roads.way([A, B]);
  assert.equal(got?.state, 'found');
  if (got?.state !== 'found') return;
  assert.ok(got.way.whole);
  assert.ok(got.way.lengthM > 8050 && got.way.lengthM < 8150, `${got.way.lengthM}`);
  assert.equal(got.way.path.length, 3);
  // The same corridor again reads nothing more: the graph is kept while the page is open, and dropped when it says so.
  await roads.way([A, at(4000, 0)]);
  assert.equal(calls.length, 1);
  roads.forget();
  await roads.way([A, B]);
  assert.equal(calls.length, 2);
});

test('RE7: a journey too long for one read says so and reads nothing', async () => {
  const { createRoads } = await import('../../roads/service');
  const { source, calls } = counted(ROADS);
  const got = await createRoads({ source, pause: async () => {} }).way([A, at(900_000, 0)]);
  assert.deepEqual(got, { state: 'long' });
  assert.equal(calls.length, 0);
});

test('RE15: roads that could not be read, or that do not join the towns, are a failure said plainly, never a made-up road', async () => {
  const { createRoads } = await import('../../roads/service');
  assert.deepEqual(await createRoads({ source: counted(null).source, pause: async () => {} }).way([A, B]), { state: 'failed' });
  // Two roads that never meet: nothing joins the towns.
  const apart = [road([[0, 0], [1000, 0]]), road([[7000, 0], [8000, 0]])];
  assert.deepEqual(await createRoads({ source: counted(apart).source, pause: async () => {} }).way([A, B]), { state: 'none' });
  // A failed read is not kept: the next ask reads again.
  const flaky = counted(null);
  const r = createRoads({ source: flaky.source, pause: async () => {} });
  await r.way([A, B]);
  await r.way([A, B]);
  assert.equal(flaky.calls.length, 2);
});

test('RE29: finding a way gives the screen its turns and can be stopped: a stopped find answers nothing', async () => {
  const { createRoads } = await import('../../roads/service');
  const { ROAD_RULES } = await import('../../roads/rules');
  // A long road of many junctions, and a rule that yields often.
  const many: Road[] = [];
  for (let i = 0; i < 400; i++) many.push(road([[i * 20, 0], [(i + 1) * 20, 0]]));
  let pauses = 0;
  const roads = createRoads({ source: counted(many).source, pause: async () => { pauses++; }, rules: { ...ROAD_RULES, yieldEvery: 50 } });
  const got = await roads.way([A, at(8000, 0)]);
  assert.equal(got?.state, 'found');
  assert.ok(pauses >= 4, `${pauses} pauses`);
  let n = 0;
  assert.equal(await roads.way([A, at(7000, 0)], () => ++n > 2), null);
});

test('RE7: one read at a time: a second ask waits for the first', async () => {
  const { createRoads } = await import('../../roads/service');
  let open = 0;
  let most = 0;
  const source: RoadSource = {
    read: async () => {
      most = Math.max(most, ++open);
      await new Promise((r) => setTimeout(r, 5));
      open--;
      return [...ROADS];
    },
  };
  const roads = createRoads({ source, pause: async () => {} });
  const far = at(8000, 30_000);
  await Promise.all([roads.way([A, B]), roads.way([at(0, 30_000), far])]);
  assert.equal(most, 1);
});

test('RE16: the line handed to the map is the road thinned to a set number of points, its ends kept', async () => {
  const { thinLine } = await import('../../roads/thin');
  const path: LngLat[] = [];
  for (let i = 0; i <= 5000; i++) path.push(at(i * 10, Math.sin(i / 40) * 300));
  const thin = thinLine(path, 400);
  assert.ok(thin.length <= 400 && thin.length > 100, `${thin.length}`);
  assert.deepEqual(thin[0], path[0]);
  assert.deepEqual(thin[thin.length - 1], path[path.length - 1]);
  assert.deepEqual(thinLine([A, B], 400), [A, B]);
});

test('RE2, RE11a, RE15, RE18, RE32: what the page says of the road: found, being read, not found, too far; no time, speed or comparison', async () => {
  const w = await import('../../roads/words');
  assert.equal(w.roadLine('reading'), 'Finding the road…');
  assert.equal(w.roadLine('found'), 'The way keeps to the roads through the towns.');
  assert.match(w.roadLine('failed'), /^Couldn't find the road\..*straight lines/);
  assert.match(w.roadLine('none'), /^Couldn't find the road\..*straight lines/);
  assert.match(w.roadLine('long'), /^Too far to find the road here\..*straight lines/);
  for (const s of ['reading', 'found', 'failed', 'none', 'long'] as const) {
    assert.doesNotMatch(w.roadLine(s), /\d|\b(min|minutes?|hours?|fast\w*|quick\w*|short\w*|best|recalculat\w*)\b/i, s);
  }
});

test('RE9: the page\'s side of the engine is layered: the source an adapter, the service a shell that takes its effects', () => {
  const src = (f: string) => readFileSync(new URL(`../../roads/${f}.ts`, import.meta.url), 'utf8');
  assert.match(src('tilesSource'), /^\/\/ @layer adapter/);
  assert.match(src('service'), /^\/\/ @layer shell/);
  assert.match(src('thin'), /^\/\/ @layer core/);
  assert.doesNotMatch(src('service').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /Date\.now|setTimeout|from '\.\.\/(db|ports|net)'/);
});
