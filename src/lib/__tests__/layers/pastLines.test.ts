/// <reference types="node" />
// Where I've been (specs/where-ive-been/spec.md, WB6-WB8, WB13, WB16), the core, written before the code: the module is
// reached through a dynamic import and casts, so the typecheck holds while each test fails for its own reason.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, type PauseSpan } from '../../geo';
import { readTrace } from '../../rides';
import type { LngLat, TracePoint } from '../../types';

type Bounds = [number, number, number, number];
interface WalkLine {
  walk_id: string;
  code: string;
  bounds: Bounds;
  tiles: string[];
  runs: LngLat[][];
}
interface Core {
  LINE_CODE: string;
  PAST_REACH_M: number;
  SIMPLIFY_M: number;
  lineOf(walkId: string, tr: ReturnType<typeof readTrace>, code?: string): WalkLine;
  simplifyRun(run: LngLat[], toleranceM: number): LngLat[];
  reachTiles(centre: LngLat, reachM?: number): string[];
  nearLines(rows: WalkLine[], centre: LngLat, reachM?: number): WalkLine[];
  visibleLines(rows: WalkLine[], hidden: ReadonlySet<string>, openWalkId: string | null): WalkLine[];
  linesKey(rows: WalkLine[]): string;
  staleIds(walks: { id: string; open: boolean }[], codes: { walk_id: string; code: string }[], code?: string): string[];
  prepareOrder(walks: { id: string; at: LngLat | null; started_at: number }[], centre: LngLat | null): string[];
}
const PATH = '../../pastLines/core';
const core = (): Promise<Core> => import(PATH as string) as Promise<Core>;

const O: LngLat = [-71.4, 41.82];
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const mLat = 1 / 110574;
/** x metres east and y north of O. */
const at = (x: number, y = 0): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const T0 = 1_700_000_000_000;

/** Fixes every 5 m at 1.4 m/s from (x0, y) to (x1, y), starting at t0. */
function along(walkId: string, x0: number, x1: number, t0: number, y = 0, speed = 1.4): TracePoint[] {
  const pts: TracePoint[] = [];
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / 5));
  for (let k = 0; k <= n; k++) {
    const [lon, lat] = at(x0 + ((x1 - x0) * k) / n, y);
    pts.push({ walk_id: walkId, t: t0 + Math.round(((k * Math.abs(x1 - x0)) / n / speed) * 1000), lat, lon, accuracy_m: 6, speed, course: null } as TracePoint);
  }
  return pts;
}

const line = (walk_id: string, runs: LngLat[][], code = 'p1'): WalkLine => {
  const pts = runs.flat();
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return { walk_id, code, bounds: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], tiles: [], runs };
};

test('WB7: only walked fixes draw; a ride, a pause and a gap left unresolved break the line', async () => {
  const { lineOf } = await core();
  // 300 m walked, a 2-minute pause, 300 m walked, a ride of 1 km at 10 m/s, 200 m walked, then 5 minutes with no fix (a gap), 200 m walked.
  const a = along('w', 0, 300, T0);
  const pause: PauseSpan = { started_at: a[a.length - 1].t + 1000, ended_at: a[a.length - 1].t + 121_000 };
  const b = along('w', 300, 600, pause.ended_at! + 1000);
  const ride = along('w', 600, 1600, b[b.length - 1].t + 1000, 0, 10);
  const c = along('w', 1600, 1800, ride[ride.length - 1].t + 1000);
  const d = along('w', 1900, 2100, c[c.length - 1].t + 300_000);
  const tr = readTrace([...a, ...b, ...ride, ...c, ...d], T0, [pause]);
  const l = lineOf('w', tr);
  assert.equal(l.walk_id, 'w');
  assert.equal(l.runs.length, 4, `four walked stretches: ${l.runs.length}`);
  // No run reaches into the ride.
  for (const r of l.runs) for (const p of r) assert.ok(!(p[0] > at(650)[0] && p[0] < at(1550)[0]), 'a ridden point is never drawn');
});

test('WB7: a gap the walker kept draws; one filled by itself (an inference, never stored) does not', async () => {
  const { lineOf } = await core();
  const a = along('w', 0, 200, T0);
  const b = along('w', 400, 600, a[a.length - 1].t + 240_000);
  // Without fills the gap breaks the line.
  assert.equal(lineOf('w', readTrace([...a, ...b], T0)).runs.length, 2);
  // A kept stretch is a fill: one line across.
  const kept = { t0: a[a.length - 1].t, t1: b[0].t, path: [at(200), at(300), at(400)] };
  assert.equal(lineOf('w', readTrace([...a, ...b], T0, [], [], [kept])).runs.length, 1);
});

test('WB16: a run is simplified within 5 m of the walked trace, keeping its ends', async () => {
  const { simplifyRun, SIMPLIFY_M } = await core();
  assert.equal(SIMPLIFY_M, 5);
  // A straight 500 m with 1 m wobble every 5 m, then a right angle.
  const run: LngLat[] = [];
  for (let k = 0; k <= 100; k++) run.push(at(k * 5, k % 2 ? 1 : 0));
  for (let k = 1; k <= 20; k++) run.push(at(500, k * 5));
  const s = simplifyRun(run, 5);
  assert.ok(s.length <= 4, `a wobbling L is a few points (${s.length})`);
  assert.deepEqual(s[0], run[0]);
  assert.deepEqual(s[s.length - 1], run[run.length - 1]);
  // Every original point lies within 5 m of the simplified line.
  for (const p of run) {
    let best = Infinity;
    for (let i = 1; i < s.length; i++) {
      const steps = 50;
      for (let j = 0; j <= steps; j++) {
        const q: LngLat = [s[i - 1][0] + ((s[i][0] - s[i - 1][0]) * j) / steps, s[i - 1][1] + ((s[i][1] - s[i - 1][1]) * j) / steps];
        best = Math.min(best, distanceM(p, q));
      }
    }
    assert.ok(best <= 5.5, `within 5 m (${best.toFixed(1)})`);
  }
});

test('WB6: a line that passes within 5 km of the centre draws; one further away does not', async () => {
  const { nearLines, PAST_REACH_M } = await core();
  assert.equal(PAST_REACH_M, 5000);
  const near = line('near', [[at(4000, 0), at(4500, 0)]]);
  // Its bounds come within reach but its line never does: a long L whose corner is far away.
  const corner = line('corner', [[at(6000, 6000), at(-6000, 6000), at(-6000, 4000)]]);
  const far = line('far', [[at(8000, 0), at(9000, 0)]]);
  assert.deepEqual(nearLines([near, corner, far], O).map((l) => l.walk_id), ['near']);
});

test('WB6: the tiles of the reach cover every point within 5 km, and are few', async () => {
  const { reachTiles, lineOf } = await core();
  const tiles = new Set(reachTiles(O));
  assert.ok(tiles.size > 0 && tiles.size <= 9, `a handful of tiles (${tiles.size})`);
  for (const [x, y] of [[4900, 0], [-4900, 0], [0, 4900], [0, -4900], [3400, 3400]]) {
    const l = lineOf('w', readTrace(along('w', x, x + 10, T0, y), T0));
    assert.ok(l.tiles.some((t) => tiles.has(t)), `a line ${x},${y} m away is in a tile of the reach`);
  }
});

test('WB8, WB13: the walk being recorded and a walk waiting to be deleted are never drawn', async () => {
  const { visibleLines } = await core();
  const rows = ['a', 'b', 'open'].map((id) => line(id, [[at(0), at(100)]]));
  assert.deepEqual(visibleLines(rows, new Set(['b']), 'open').map((l) => l.walk_id), ['a']);
  assert.deepEqual(visibleLines(rows, new Set(), null).map((l) => l.walk_id), ['a', 'b', 'open']);
});

test('WB16: the key the map is sent on changes only with the set of lines', async () => {
  const { linesKey } = await core();
  const a = line('a', [[at(0), at(100)]]);
  const b = line('b', [[at(0), at(200)]]);
  assert.equal(linesKey([a, b]), linesKey([b, a]));
  assert.equal(linesKey([{ ...a }, b]), linesKey([a, b]));
  assert.notEqual(linesKey([a]), linesKey([a, b]));
  assert.notEqual(linesKey([a]), linesKey([{ ...a, code: 'p2' }]));
});

test('WB14, WB8: a closed walk with no line, or a line of another rule code, is stale; an open walk never is', async () => {
  const { staleIds, LINE_CODE } = await core();
  const walks = [{ id: 'a', open: false }, { id: 'b', open: false }, { id: 'c', open: false }, { id: 'o', open: true }];
  const codes = [{ walk_id: 'a', code: LINE_CODE }, { walk_id: 'b', code: 'old' }];
  assert.deepEqual(staleIds(walks, codes).sort(), ['b', 'c']);
});

test('WB15: older walks are prepared nearest the centre first; walks with no known place last, newest first', async () => {
  const { prepareOrder } = await core();
  const walks = [
    { id: 'far', at: at(9000), started_at: 3 },
    { id: 'near', at: at(100), started_at: 1 },
    { id: 'unknown-old', at: null, started_at: 1 },
    { id: 'mid', at: at(2000), started_at: 2 },
    { id: 'unknown-new', at: null, started_at: 5 },
  ];
  assert.deepEqual(prepareOrder(walks, O), ['near', 'mid', 'far', 'unknown-new', 'unknown-old']);
  // No centre yet: newest first.
  assert.deepEqual(prepareOrder(walks, null), ['unknown-new', 'far', 'mid', 'near', 'unknown-old']);
});
