// @tree-wide: walk.tsx's source (FR7) and the lint config (FR8)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../components/map/types';
import { FOG_RULES, fogDue, fogOf } from '../fog/rules';
import { createFog } from '../fog/shell';
import type { RoadFeature } from '../streets';
import type { LngLat, StreetSegment, Walk, WalkSummary } from '../types';
import { fakePorts } from './fakes';

// Fog refresh, the first shell (specs/fog-refresh-shell/spec.md, FR1-FR10).

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** A point x, y hundreds of metres east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
/** A street piece 80 m long, eastwards from (x, y). */
const piece = (id: string, x: number, y: number, name: string | null = 'Main St', build = 'b1'): StreetSegment => ({
  id, name, kind_detail: 'residential', length_m: 80, build, geometry: [[at(x, y), at(x + 0.8, y)]],
});
const road = (coords: LngLat[]): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: { class: 'minor', name: 'Elm St' } });
const ids = (xs: StreetSegment[]) => xs.map((x) => x.id).sort();

test('FR1 a read is due on the first fix, then after 100 m; never riding, without a build, or during a read', () => {
  const base = { here: at(0, 0), lastAt: null, busy: false, riding: false, build: 'b1' };
  assert.equal(fogDue(base), true, 'the first fix');
  assert.equal(fogDue({ ...base, here: null }), false, 'no fix');
  assert.equal(fogDue({ ...base, build: null }), false, 'no build yet');
  assert.equal(fogDue({ ...base, build: 'unknown' }), true, 'the unknown build still reads the cache');
  assert.equal(fogDue({ ...base, riding: true }), false, 'riding');
  assert.equal(fogDue({ ...base, busy: true }), false, 'a read under way');
  assert.equal(fogDue({ ...base, lastAt: at(0, 0.99) }), false, '99 m from the last read');
  assert.equal(fogDue({ ...base, lastAt: at(0, 1.01) }), true, '101 m from the last read');
  assert.equal(FOG_RULES.stepM, 100);
});

test('FR2 within 1 km: credited pieces are walked, the rest fog, less pieces whose middle the trace passed within 20 m', () => {
  const pieces = [
    piece('near', 0, 0.5),
    piece('credited', 0, 1),
    piece('along', 0, 2),
    piece('far', 0, 10.5), // 1,050 m north
    piece('edge', 0, 9.9), // 990 m north
  ];
  const mid = (p: StreetSegment) => p.geometry[0][Math.floor(p.geometry[0].length / 2)];
  const r = fogOf({ pieces, visited: new Set(['credited']), runs: [[at(0, 0), [mid(pieces[2])[0], mid(pieces[2])[1] + 15 / 111320]]], here: at(0, 0) });
  assert.deepEqual(ids(r.walked), ['credited']);
  assert.deepEqual(ids(r.fog), ['edge', 'near']);
  assert.equal(FOG_RULES.nearM, 1000);
  assert.equal(FOG_RULES.onTraceM, 20);
});

/** A map read the test controls: what it returns, and when. */
function fakeMap(result: Partial<CollectedFeatures> | null) {
  let release: () => void = () => {};
  const gate = { held: false };
  const reads: number[] = [];
  const collect = async (): Promise<CollectedFeatures | null> => {
    reads.push(reads.length + 1);
    if (gate.held) await new Promise<void>((r) => (release = r));
    return result ? { roads: [], names: [], places: [], pois: [], complete: true, ...result } : null;
  };
  return { collect, reads, hold: () => (gate.held = true), release: () => release() };
}

async function seedCredited(p: ReturnType<typeof fakePorts>, segs: StreetSegment[], credited: string[]) {
  const walk: Walk = { id: 'old', started_at: 1, ended_at: 2, title: null, epilogue: null, open: false, area: null, snapped_build: null };
  const summary: WalkSummary = { walk_id: 'old', build: 'b1', distance_m: 1, duration_ms: 1, new_streets: 0, streets_walked: 0, photos: 0, videos: 0, voices: 0, notes: 0, streets_read: true };
  await p.db.createWalk(walk);
  await p.db.saveSnap('old', segs, credited.map((id) => ({ segment_id: id, walk_id: 'old', covered_fraction: 1, first_t: 1, street_key: `name:${id}` })), summary, null, true);
  p.log.clear();
}

const refreshArgs = (here: LngLat, collect: () => Promise<CollectedFeatures | null>, more: { build?: string | null; riding?: boolean; runs?: LngLat[][] } = {}) => ({
  here, collect, build: more.build === undefined ? 'b1' : more.build, riding: more.riding ?? false, runs: () => more.runs ?? [],
});

test('FR3 a complete read stores streets before reading the fog, and places without waiting', async () => {
  const p = fakePorts();
  await seedCredited(p, [piece('old1', 0, 3)], ['old1']);
  const map = fakeMap({ roads: [road([at(0, 0), at(2, 0)])] });
  const fog = createFog(p);
  await fog.refresh(refreshArgs(at(0.5, 0), map.collect));
  const effects = p.log.effects();
  assert.ok(effects.includes('db.putSegments') && effects.includes('db.putPlaces'), effects.join(', '));
  const calls = p.log.calls();
  assert.ok(calls.indexOf('db.putSegments') < calls.indexOf('db.getSegmentsIn'), `streets stored before the fog is read: ${calls.join(', ')}`);
  const { fog: f, walked } = fog.store.get();
  assert.ok(f.some((x) => x.name === 'Elm St'), 'the street just read is fog');
  assert.deepEqual(ids(walked), ['old1']);
});

test('FR3 an incomplete read stores nothing and reads again on the next fix', async () => {
  const p = fakePorts();
  const map = fakeMap({ roads: [road([at(0, 0), at(2, 0)])], complete: false });
  const fog = createFog(p);
  await fog.refresh(refreshArgs(at(0, 0), map.collect));
  assert.deepEqual(p.log.effects().filter((e) => e.startsWith('db.put')), []);
  await fog.refresh(refreshArgs(at(0, 0.1), map.collect)); // 10 m on
  assert.equal(map.reads.length, 2, 'read again within 100 m');
});

test('FR3 the unknown build stores nothing and still draws the cached fog', async () => {
  const p = fakePorts();
  await p.db.putSegments([piece('cached', 0, 0.5, 'Main St', 'b0')]);
  p.log.clear();
  const map = fakeMap({ roads: [road([at(0, 0), at(2, 0)])] });
  const fog = createFog(p);
  await fog.refresh(refreshArgs(at(0, 0), map.collect, { build: 'unknown' }));
  assert.deepEqual(p.log.effects().filter((e) => e.startsWith('db.put')), []);
  assert.deepEqual(ids(fog.store.get().fog), ['cached']);
});

test('FR4 credited ids are read once per fog instance', async () => {
  const p = fakePorts();
  const map = fakeMap(null);
  const fog = createFog(p);
  await fog.refresh(refreshArgs(at(0, 0), map.collect));
  await fog.refresh(refreshArgs(at(0, 1.5), map.collect));
  await fog.refresh(refreshArgs(at(0, 3), map.collect));
  assert.equal(p.log.calls().filter((c) => c === 'db.visitedSegmentIds').length, 1);
  await createFog(p).refresh(refreshArgs(at(0, 0), map.collect));
  assert.equal(p.log.calls().filter((c) => c === 'db.visitedSegmentIds').length, 2, 'a new walk screen reads them again');
});

test('FR1 a fix during a read is dropped, not queued', async () => {
  const p = fakePorts();
  const map = fakeMap(null);
  map.hold();
  const fog = createFog(p);
  const first = fog.refresh(refreshArgs(at(0, 0), map.collect));
  await fog.refresh(refreshArgs(at(0, 2), map.collect)); // 200 m on, while the first is under way
  map.release();
  await first;
  assert.equal(map.reads.length, 1);
});

test('FR5 a failed write still draws the fog; a failed read keeps the fog and waits for 100 m', async () => {
  const p = fakePorts();
  await p.db.putSegments([piece('cached', 0, 0.5)]);
  const map = fakeMap({ roads: [road([at(0, 0), at(2, 0)])] });
  const fog = createFog(p);
  p.db.failNext('putSegments', new Error('disk full'));
  await fog.refresh(refreshArgs(at(0, 0), map.collect));
  assert.ok(ids(fog.store.get().fog).includes('cached'), 'a failed street write still draws the cached fog');
  const before = fog.store.get();
  p.db.failNext('getSegmentsIn', new Error('read failed'));
  await fog.refresh(refreshArgs(at(0, 1.5), map.collect));
  assert.equal(fog.store.get(), before, 'a failed read keeps the fog as it was');
  await fog.refresh(refreshArgs(at(0, 2), map.collect)); // 50 m on from the failed read
  assert.equal(map.reads.length, 2, 'the next read waits for 100 m from the failed one');
});

test('FR6 a read that ends after close changes nothing', async () => {
  const p = fakePorts();
  await p.db.putSegments([piece('cached', 0, 0.5)]);
  const map = fakeMap(null);
  map.hold();
  const fog = createFog(p);
  const run = fog.refresh(refreshArgs(at(0, 0), map.collect));
  const before = fog.store.get();
  fog.close();
  map.release();
  await run;
  assert.equal(fog.store.get(), before);
});

test('FR7 walk.tsx reads and writes nothing for the fog', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app', 'walk.tsx'), 'utf8');
  for (const m of ['getSegmentsIn', 'putSegments', 'putPlaces', 'visitedSegmentIds', 'deriveSegments', 'placesFromTilePois']) {
    assert.ok(!src.includes(m), `walk.tsx still calls ${m}: the fog shell (lib/fog) does that`);
  }
  assert.match(src, /from '\.\.\/lib\/fog'/, 'walk.tsx gets its fog from lib/fog');
});

test('FR8 a shell importing the db, recorder or notifier is flagged; ports and types are not; the composition root is exempt', async () => {
  const ROOT = join(__dirname, '..', '..', '..');
  const load = createRequire(__filename);
  const { ESLint } = load('eslint') as { ESLint: new (o: object) => { lintText(c: string, o: { filePath: string }): Promise<{ messages: { ruleId: string | null; line: number; message: string }[] }[]> } };
  const eslint = new ESLint({ cwd: ROOT });
  const code = [
    '// @layer shell',
    "import { db } from '../db';",
    "import { recorder } from '../recorder';",
    "import { notifier } from '../notify';",
    "import { ports } from '../ports';",
    "import type { Db } from '../db/types';",
    'export const a = [db, recorder, notifier, ports];',
  ].join('\n');
  const [r] = await eslint.lintText(code, { filePath: join(ROOT, 'src/lib/fog/shell.ts') });
  const flagged = r.messages.filter((m) => /takes `ports`/.test(m.message));
  assert.deepEqual(flagged.map((m) => m.line), [2, 3, 4]);
  const [root] = await eslint.lintText(code, { filePath: join(ROOT, 'src/lib/ports/index.ts') });
  assert.deepEqual(root.messages.filter((m) => /takes `ports`/.test(m.message)), []);
});
