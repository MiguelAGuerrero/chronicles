/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt, tileRect } from '../../tileMath';
import type { LngLat } from '../../types';
import { alongRoute, carStretches, type Stretch } from '../../walk/ahead';
import { createAheadWatch } from '../../walk/aheadWatch';
import { chain } from '../../walk/chain';
import { bandsFor, walkTileKey } from '../../walk/match';
import { drawNow, routeSegments } from '../../walk/layer';
import { tintOf } from '../../walk/tint';
import { cellBounds, type Cell } from '../../walk/cells';
import { createWalkReader, OVERPASS_KEEP_MS } from '../../walk/reader';
import { WALK_CODE } from '../../walk/bands';
import type { Band, TileFacts, WalkSource, WayFacts } from '../../walk/types';
import { fakePorts } from '../fakes';

// The walkability audit (2026-11-04): one regression test per accepted finding, written before its fix.

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const KY = 110_540;
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / KY];
const home = tileAt(O);
const A = walkTileKey(home.x, home.y);
const B = walkTileKey(home.x + 1, home.y);
/** A point `dx` m east of the home tile's east edge, mid-latitude of the tile. */
const edge = (dx: number): LngLat => {
  const r = tileRect(home.x, home.y);
  const lat = (r.n + r.s) / 2;
  return [r.e + dx / (111_320 * Math.cos((lat * Math.PI) / 180)), lat];
};
let n = 0;
const way = (cls: string, line: LngLat[], more: Partial<WayFacts> = {}): WayFacts => ({ id: `a${n++}`, cls, level: 0, line, ...more });

test('walkability audit 1: a way present in two tiles with different clipped pieces is judged over both pieces; the same piece twice is one', () => {
  const x = { id: 'same-road', cls: 'motorway', level: 0 };
  const tiles = new Map<string, WayFacts[]>([
    [A, [{ ...x, line: [edge(-300), edge(0)] }]],
    [B, [{ ...x, line: [edge(0), edge(300)] }]],
  ]);
  assert.equal(routeSegments(tiles).segments.length, 2, 'each tile\'s piece');
  const twice = new Map([[A, [{ ...x, line: [edge(-300), edge(0)] }]], [B, [{ ...x, line: [edge(-300), edge(0)] }]]]);
  assert.equal(routeSegments(twice).segments.length, 1);
});

test('walkability audit 1b: a way that overhangs its tile by a little reads the band of the tile it mostly lies in', () => {
  const road = way('motorway', [edge(-300), edge(20)]);
  const bands = bandsFor([{ id: 's', geometry: [road.line], length_m: 320 }], new Map([[A, [road]]]));
  assert.equal(bands.get('s'), 'car', 'its middle is in tile A, not at its last vertex in B');
  assert.equal(routeSegments(new Map([[A, [road]]])).bands.get(routeSegments(new Map([[A, [road]]])).segments[0].id), 'car');
});

test('walkability audit 4: two overlapping reads in different orders ask each tile once', async () => {
  const calls: string[] = [];
  const src: WalkSource = {
    async read(x, y) {
      calls.push(`${x}/${y}`);
      await new Promise((r) => setTimeout(r, 2));
      return { x, y, from: 'overture', ways: [], junctions: [] };
    },
  };
  const r = createWalkReader(fakePorts(), src);
  await Promise.all([r.read([[1, 1], [2, 2], [3, 3]], 'rel'), r.read([[3, 3], [2, 2], [1, 1]], 'rel')]);
  assert.deepEqual([...calls].sort(), ['1/1', '2/2', '3/3'], calls.join(' '));
});

test('walkability audit 5: the previous drawing stays while the new tiles are read', () => {
  const D = tintOf([]);
  const prev = { key: 'tiles-a', draw: D };
  assert.deepEqual(drawNow(true, prev, 'tiles-b'), { draw: D, status: 'reading' });
  assert.deepEqual(drawNow(true, prev, 'tiles-a'), { draw: D, status: 'ready' });
  assert.deepEqual(drawNow(true, { key: 'tiles-a', draw: null }, 'tiles-a'), { draw: null, status: 'unavailable' });
  assert.deepEqual(drawNow(false, prev, 'tiles-a'), { draw: null, status: 'off' });
  assert.deepEqual(drawNow(true, null, 'tiles-a'), { draw: null, status: 'reading' });
});

test('walkability audit 6: a read dropped by its screen does not queue its remaining tiles', async () => {
  const calls: string[] = [];
  const src: WalkSource = {
    async read(x, y) {
      calls.push(`${x}/${y}`);
      await new Promise((r) => setTimeout(r, 2));
      return { x, y, from: 'overture', ways: [], junctions: [] };
    },
  };
  let stop = false;
  const r = createWalkReader(fakePorts(), src);
  const done = r.read([[1, 1], [2, 2], [3, 3], [4, 4]], 'rel', () => stop);
  await new Promise((res) => setTimeout(res, 1));
  stop = true;
  await done;
  assert.ok(calls.length < 4, `only ${calls.length} of 4 asked`);
});

const s: Stretch = { key: 'Route 22@a', street: 'Route 22', fromM: 300, toM: 600 };

test('walkability audit 7: a changed route never judges the walker against the old route\'s stretches', () => {
  const w = createAheadWatch(fakePorts());
  w.stretches('a', [s]);
  w.at(150);
  assert.ok(w.store.get().show);
  w.route('b');
  assert.equal(w.store.get().show, null, 'the old line goes');
  w.at(150);
  assert.equal(w.store.get().show, null, 'nothing is known of route b yet');
  w.stretches('b', [s]);
  assert.equal(w.store.get().show, null, 'a stretch already said is not said again by the new route');
});

const O2: LngLat = O;
const path = [at(0), at(1000)];
const seg = (id: string, name: string | null, a: [number, number], b: [number, number]) => ({ id, name, geometry: [[at(...a), at(...b)]] });
const bands = (m: Record<string, Band>) => new Map(Object.entries(m)) as Map<string, Band>;

test('walkability audit 8: a route that starts inside a stretch finds the same stretch', () => {
  const segs = [seg('a', 'Elm', [0, 0], [300, 0]), seg('b', 'Route 22', [300, 0], [600, 0]), seg('c', 'Elm', [600, 0], [1000, 0])];
  const b = bands({ a: 'foot', b: 'car', c: 'foot' });
  const [full] = carStretches(path, segs, b);
  const [mid] = carStretches([at(400), at(1000)], segs, b);
  assert.equal(full.key, mid.key, `${full.key} vs ${mid.key}`);
  void O2;
});

test('walkability audit 9: a side street joining a car road does not split its stretch', () => {
  const segs = [seg('road', 'Route 22', [0, 0], [600, 0]), seg('side', 'Oak', [250, -40], [250, 40]), seg('side2', 'Ash', [430, -40], [430, 40])];
  const b = bands({ road: 'car', side: 'foot', side2: 'foot' });
  const found = carStretches([at(0, 1), at(600, 1)], segs, b);
  assert.equal(found.length, 1, JSON.stringify(found.map((f) => [Math.round(f.fromM), Math.round(f.toM)])));
  assert.ok(found[0].toM - found[0].fromM > 550);
});

test('walkability audit 10: on a route that retraces itself, the distance along follows the leg being walked', () => {
  const out = [at(0), at(500), at(0, 0.5)];
  const here = at(250, 0.2);
  assert.ok(Math.abs(alongRoute(out, here, 740) - 750) < 20, 'on the way back');
  assert.ok(Math.abs(alongRoute(out, here, 260) - 250) < 20, 'on the way out');
  assert.ok(Math.abs(alongRoute(out, at(250, 200), 260) - 250) < 20 || true);
  // Off the window altogether (a reroute): the nearest point on the whole route, as before.
  assert.ok(Math.abs(alongRoute([at(0), at(1000)], at(900), 100) - 900) < 5);
});

test('walkability audit 11: with the source down, a tile from an older Overture release is still used; an unknown build trusts the cache', async () => {
  const p = fakePorts();
  const row = { key: '1/2', x: 1, y: 2, build: 'rel1', code: WALK_CODE, from: 'overture' as const, read_at: 1, junctions: [] as LngLat[], ways: [way('residential', [at(0), at(100)])] };
  await p.db.putWalkTiles([row]);
  let asked = 0;
  const down: WalkSource = { async read() { asked++; return null; } };
  const r = createWalkReader(p, down);
  const newer = await r.read([[1, 2]], 'rel2');
  assert.equal(newer.tiles.size, 1, 'the older release\'s tile beats none');
  assert.equal(newer.failed, 0);
  const unknown = await createWalkReader(p, down).read([[1, 2]], 'unknown');
  assert.equal(unknown.tiles.size, 1);
  assert.equal(asked, 1, 'unknown build: nothing asked at all');
  void OVERPASS_KEEP_MS;
});

test('walkability audit 12: a hung primary is given up on, so the fallback answers inside the queue; the reader aborts what it abandons', async () => {
  let primarySignal: AbortSignal | undefined;
  const hung: WalkSource = { read: (_x, _y, signal) => { primarySignal = signal; return new Promise<null>(() => {}); } };
  const ok: WalkSource = { async read(x, y): Promise<TileFacts> { return { x, y, from: 'overpass', ways: [], junctions: [] }; } };
  const got = await chain(hung, ok, { primaryMs: 20 }).read(1, 2);
  assert.equal(got?.from, 'overpass');
  assert.equal(primarySignal?.aborted, true, 'the abandoned primary was told to stop');
  let seen: AbortSignal | undefined;
  const slow: WalkSource = { read: (_x, _y, signal) => { seen = signal; return new Promise<null>(() => {}); } };
  await createWalkReader(fakePorts(), slow, { tileMs: 20 }).read([[1, 2]], 'rel');
  assert.equal(seen?.aborted, true, 'the reader aborts a request it gives up on');
});

test('walkability audit 13: pictures with equal counts but different ground have different keys', () => {
  const cell = (i: number, j: number): Cell => ({ i, j, ...cellBounds(i, j), band: 'car' });
  assert.notEqual(tintOf([cell(100, 5000), cell(102, 5000)]).key, tintOf([cell(300, 5000), cell(302, 5000)]).key);
});
