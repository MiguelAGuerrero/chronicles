/// <reference types="node" />
// Where I've been (specs/where-ive-been/spec.md, WB6, WB14-WB17), the shell over `fakePorts()`, written before the code: the
// shell and the new `Db` methods are reached through a dynamic import and casts, so the typecheck holds while each test fails.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Store } from '../../store';
import type { GapDecision, LngLat, TracePoint, Walk } from '../../types';
import { fakePorts, type FakePorts } from '../fakes';

interface WalkLine {
  walk_id: string;
  code: string;
  bounds: [number, number, number, number];
  tiles: string[];
  runs: LngLat[][];
}
interface PastLines {
  store: Store<{ preparing: boolean; version: number }>;
  build(walkId: string): Promise<WalkLine | null>;
  drop(walkId: string): Promise<void>;
  prepare(centre: LngLat | null, shouldStop?: () => boolean): Promise<void>;
  near(centre: LngLat): Promise<WalkLine[]>;
}
interface LineDb {
  putWalkLine(l: WalkLine): Promise<void>;
  getWalkLinesIn(tiles: string[]): Promise<WalkLine[]>;
  listWalkLineCodes(): Promise<{ walk_id: string; code: string }[]>;
  deleteWalkLine(walkId: string): Promise<void>;
}
const SHELL = '../../pastLines/shell';
const CORE = '../../pastLines/core';
const shellOf = async (p: FakePorts): Promise<PastLines> =>
  ((await import(SHELL as string)) as { createPastLines(p: Pick<FakePorts, 'db'>): PastLines }).createPastLines(p);
const lineDb = (p: FakePorts) => p.db as unknown as LineDb;

const O: LngLat = [-71.4, 41.82];
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y = 0): LngLat => [O[0] + x * mLon, O[1] + y / 110574];
const T0 = 1_700_000_000_000;

function along(walkId: string, x0: number, x1: number, t0: number): TracePoint[] {
  const pts: TracePoint[] = [];
  const n = Math.max(1, Math.round(Math.abs(x1 - x0) / 5));
  for (let k = 0; k <= n; k++) {
    const [lon, lat] = at(x0 + ((x1 - x0) * k) / n);
    pts.push({ walk_id: walkId, t: t0 + Math.round(((k * Math.abs(x1 - x0)) / n / 1.4) * 1000), lat, lon, accuracy_m: 6, speed: 1.4, course: null } as TracePoint);
  }
  return pts;
}

const walk = (id: string, started_at: number, open = false): Walk =>
  ({ id, started_at, ended_at: open ? null : started_at + 3_600_000, title: null, epilogue: null, area: null, open, snapped_build: null } as Walk);

/** A closed walk with fixes from x0 to x1 metres east of O. */
async function seed(p: FakePorts, id: string, x0: number, x1: number, t0 = T0, open = false) {
  await p.db.createWalk(walk(id, t0, open));
  await p.db.appendPoints(along(id, x0, x1, t0));
}

test('WB14: a walk\'s line is built from its trace, kept with its bounds, tiles and rule code', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await seed(p, 'a', 0, 400);
  const past = await shellOf(p);
  const { LINE_CODE } = (await import(CORE as string)) as { LINE_CODE: string };
  const built = await past.build('a');
  assert.ok(built && built.runs.length === 1 && built.code === LINE_CODE && built.tiles.length > 0);
  const codes = await lineDb(p).listWalkLineCodes();
  assert.deepEqual(codes, [{ walk_id: 'a', code: LINE_CODE }]);
  // A rebuild from the same trace gives the same line.
  const again = await past.build('a');
  assert.deepEqual(again, built);
});

test('WB14: a gap decision drops the walk\'s line, and the next build draws the kept stretch', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await p.db.createWalk(walk('a', T0));
  const a = along('a', 0, 200, T0);
  const b = along('a', 400, 600, a[a.length - 1].t + 240_000);
  await p.db.appendPoints([...a, ...b]);
  const past = await shellOf(p);
  assert.equal((await past.build('a'))?.runs.length, 2, 'the gap breaks the line');
  await past.drop('a');
  assert.deepEqual(await lineDb(p).listWalkLineCodes(), []);
  const kept: GapDecision = { walk_id: 'a', t0: a[a.length - 1].t, t1: b[0].t, state: 'kept', path: [at(200), at(300), at(400)], length_m: 200, street: null, decided_at: T0 };
  await p.db.putGapDecision(kept);
  assert.equal((await past.build('a'))?.runs.length, 1, 'the kept stretch joins it');
  // A dismissed one breaks it again.
  await p.db.putGapDecision({ ...kept, state: 'dismissed', decided_at: T0 + 1 });
  assert.equal((await past.build('a'))?.runs.length, 2);
});

test('WB14, WB15: prepare builds the closed walks with no current line, one at a time, never the open walk', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await seed(p, 'a', 0, 300);
  await seed(p, 'b', 1000, 1300, T0 + 10_000_000);
  await seed(p, 'open', 0, 100, T0 + 20_000_000, true);
  await lineDb(p).putWalkLine({ walk_id: 'b', code: 'an-old-rule', bounds: [0, 0, 0, 0], tiles: [], runs: [] });
  const past = await shellOf(p);
  await past.prepare(O);
  const codes = (await lineDb(p).listWalkLineCodes()).sort((x, y) => x.walk_id.localeCompare(y.walk_id));
  const { LINE_CODE } = (await import(CORE as string)) as { LINE_CODE: string };
  assert.deepEqual(codes, [{ walk_id: 'a', code: LINE_CODE }, { walk_id: 'b', code: LINE_CODE }]);
  // One walk's reads at a time: each walk's points are read, then its line written, before the next walk's.
  const order = p.log.calls('db.').filter((c) => c === 'db.getPoints' || c === 'db.putWalkLine');
  assert.deepEqual(order, ['db.getPoints', 'db.putWalkLine', 'db.getPoints', 'db.putWalkLine']);
});

test('WB15: prepare stops when told, and a walk that fails is left for next time without stopping the others', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await seed(p, 'a', 0, 300);
  await seed(p, 'b', 500, 800, T0 + 10_000_000);
  const past = await shellOf(p);
  p.db.failNext('getPoints');
  await past.prepare(O);
  assert.equal((await lineDb(p).listWalkLineCodes()).length, 1, 'one walk failed, the other was built');
  await past.prepare(O);
  assert.equal((await lineDb(p).listWalkLineCodes()).length, 2, 'the failed one is built the next time');

  const q = fakePorts();
  await seed(q, 'a', 0, 300);
  await seed(q, 'b', 500, 800, T0 + 10_000_000);
  let n = 0;
  await (await shellOf(q)).prepare(O, () => n++ >= 1);
  assert.equal((await lineDb(q).listWalkLineCodes()).length, 1, 'told to stop after one walk');
});

test('WB16: preparing tells its listeners twice, at the start and when done, never once per walk', { todo: 'test first' }, async () => {
  const p = fakePorts();
  for (let k = 0; k < 4; k++) await seed(p, `w${k}`, k * 200, k * 200 + 150, T0 + k * 10_000_000);
  const past = await shellOf(p);
  const seen: { preparing: boolean; version: number }[] = [];
  past.store.subscribe(() => seen.push(past.store.get()));
  await past.prepare(O);
  assert.deepEqual(seen.map((s) => s.preparing), [true, false]);
  assert.equal(seen[1].version, seen[0].version + 1);
  // Nothing stale: nothing said.
  seen.length = 0;
  await past.prepare(O);
  assert.deepEqual(seen, []);
});

test('WB6: near reads the lines of the reach\'s tiles and keeps those within 5 km', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await seed(p, 'near', 0, 300);
  await seed(p, 'far', 20_000, 20_300, T0 + 10_000_000);
  const past = await shellOf(p);
  // Creating the shell reads nothing.
  assert.deepEqual(p.log.calls('db.').filter((c) => /WalkLine/.test(c)), []);
  await past.prepare(O);
  p.log.clear();
  assert.deepEqual((await past.near(O)).map((l) => l.walk_id), ['near']);
  assert.deepEqual(p.log.calls('db.'), ['db.getWalkLinesIn'], 'one indexed read, never a list of every walk');
});

test('WB17: building and drawing read only what the device holds', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await seed(p, 'a', 0, 300);
  const past = await shellOf(p);
  await past.prepare(O);
  await past.near(O);
  const allowed = new Set(['db.listWalks', 'db.listWalkLineCodes', 'db.listWalkAreas', 'db.getWalk', 'db.getPoints', 'db.getPauses', 'db.getStills', 'db.getGapDecisions', 'db.putWalkLine', 'db.getWalkLinesIn']);
  for (const c of p.log.calls()) assert.ok(allowed.has(c), `only the device's own stores (${c})`);
  // Nothing in the feature's folder imports a tile reader or fetches.
  const dir = join(__dirname, '../../pastLines');
  const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
  assert.ok(files.length >= 3, `the feature's modules are there (${files.join(', ')})`);
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    assert.ok(!/\bfetch\(|tileFetch|tileBodies|fetchTiles|readGap|walkStretches|XMLHttpRequest/.test(src), `${f} reads no tile and fetches nothing`);
  }
});
