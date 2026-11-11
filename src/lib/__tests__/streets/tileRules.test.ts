/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { AREA_RULES } from '../../areas/rules';
import { BOUNDARY_PACKS_ID } from '../../areas/boundaries';
import type { ensureTileBuild } from '../../tiles';
import type { StreetSegment, Walk } from '../../types';
import { memoryDb } from '../fakes';

// When the street code or the snapping rules change, the tile build's check drops or re-marks what
// was derived by the old ones: NB6 (bridges-and-open-in-maps, STREET_CODE 3) and G13 (filling-gaps,
// SNAP_RULES 7). `tiles.ts` imports the app's db, which Node can't load, so its source is run here
// with that one import swapped for the fake db and the TileJSON read stubbed: the code under test is
// the file itself, not a copy of it.

type Db = ReturnType<typeof memoryDb>;

function loadTiles(db: Db, build = 'b1'): { ensureTileBuild: typeof ensureTileBuild } {
  const src = readFileSync(join(__dirname, '..', '..', 'tiles.ts'), 'utf8')
    .replace(/^import [^;]+;$/gm, '')
    .replace(/^export \{[^}]*\} from [^;]+;$/gm, '');
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const fetchTileBuild = async () => ({ build, url: `https://t.example/planet/${build}/{z}/{x}/{y}.pbf` });
  new Function('module', 'exports', 'db', 'fetchTileBuild', 'TILEJSON_MS', 'AREA_RULES', 'BOUNDARY_PACKS_ID', code)(
    mod, mod.exports, db, fetchTileBuild, 5000, AREA_RULES, BOUNDARY_PACKS_ID,
  );
  return mod.exports as { ensureTileBuild: typeof ensureTileBuild };
}

const walk = (id: string, snapped: string | null): Walk => ({
  id, started_at: 1000, ended_at: 2000, title: null, epilogue: null, open: false, area: null, snapped_build: snapped,
} as Walk);

const piece = (id: string): StreetSegment => ({
  id, name: 'Elm Street', class: 'residential', tile_build: 'b1',
  geometry: [[[-71.4, 41.812], [-71.399, 41.812]]],
} as unknown as StreetSegment);

const BOX: [number, number, number, number] = [-71.41, 41.8, -71.39, 41.82];

async function seeded(meta: Record<string, string>) {
  const db = memoryDb();
  for (const [k, v] of Object.entries(meta)) await db.setMeta(k, v);
  await db.createWalk(walk('w1', 'b1'));
  await db.createWalk(walk('w2', 'b1'));
  await db.putSegments([piece('s1')]);
  return db;
}

/** The rules tag a fresh install stores, so a seeded install differs only in what a test changes. */
async function currentRules() {
  const d = memoryDb();
  await loadTiles(d).ensureTileBuild();
  return (await d.getMeta('snap_rules'))!;
}

test('NB6: the street code (bridges, 2 to now) drops the street cache once and marks every walk to re-snap', async () => {
  // Streets derived by the code before bridges (street code 2), on the same tile build and rules.
  const rules = await currentRules();
  const db = await seeded({ tile_build: 'b1', street_code: '2', snap_rules: rules });
  await loadTiles(db).ensureTileBuild();
  assert.equal(await db.getMeta('street_code'), '4', 'the street code is the current one (pieces keep their level, gap bridges GB1)');
  assert.deepEqual((await db.getSegmentsIn(BOX)).map((s) => s.id), [], 'pieces derived by the old code are dropped');
  assert.deepEqual((await db.listWalks()).map((w) => w.snapped_build), [null, null], 'every walk re-snaps when its replay next opens');

  // Once: pieces derived by the new code, and walks snapped since, are kept on the next launch.
  await db.putSegments([piece('s2')]);
  for (const w of await db.listWalks()) await db.updateWalk(w.id, { snapped_build: 'b1' });
  await loadTiles(db).ensureTileBuild();
  assert.deepEqual((await db.getSegmentsIn(BOX)).map((s) => s.id), ['s2'], 'dropped once, not on every launch');
  assert.deepEqual((await db.listWalks()).map((w) => w.snapped_build), ['b1', 'b1']);

  // An install that never had the code stored but had derived streets (before STREET_CODE): dropped too.
  const old = await seeded({ tile_build: 'b1', snap_rules: rules });
  await loadTiles(old).ensureTileBuild();
  assert.deepEqual((await old.getSegmentsIn(BOX)).map((s) => s.id), [], 'streets from before the street code are dropped');
});

test('G13: the gap rules bumped SNAP_RULES, which marks every walk to snap again and keeps the street pieces', async () => {
  const rules = await currentRules();
  const snap = Number(rules.split('/')[0]);
  assert.ok(snap >= 7, `SNAP_RULES is at least 7, the gap rules' bump (${rules})`);

  // Walks snapped under the rules before gaps were filled (6), same build, same street code.
  const before = `6/${AREA_RULES}/${BOUNDARY_PACKS_ID}`;
  const db = await seeded({ tile_build: 'b1', street_code: '4', snap_rules: before });
  await db.createWalk(walk('w3', null));
  await loadTiles(db).ensureTileBuild();
  assert.equal(await db.getMeta('snap_rules'), rules, 'the new rules are stored');
  assert.deepEqual((await db.listWalks()).map((w) => w.snapped_build), [null, null, null], 'every walk snaps again when its replay next opens');
  assert.deepEqual((await db.getSegmentsIn(BOX)).map((s) => s.id), ['s1'], 'street pieces are kept: only the crediting changed');

  // Once: a walk snapped again under the new rules stays snapped.
  await db.updateWalk('w1', { snapped_build: 'b1' });
  await loadTiles(db).ensureTileBuild();
  assert.equal((await db.getWalk('w1'))?.snapped_build, 'b1', 'not marked again on the next launch');
});
