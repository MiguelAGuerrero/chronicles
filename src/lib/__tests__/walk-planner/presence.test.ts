/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { archivePlace } from '../../discovery/archivePois';
import type { Place } from '../../discovery/types';
import type { Reach } from '../../kindWalk/words';
import { distanceM } from '../../geo';
import type { LngLat } from '../../types';
import { densestCells, onStreets } from '../../kindWalk/density';
import { gradeRuns } from '../../walkPlanner/exposure';
import { CONSIDERED } from '../../walkPlanner/presets';
import { createPlanner, type PlannerDeps } from '../../walkPlanner/service';
import { at, segs } from './grid';

// Presence and kinds (PK8-PK10, PK17), written from specs/presence-and-kinds/spec.md before the code.

const area = { at: at(650, 650), reachM: 1200 };
const prefs = { budgetM: 3000, pref: 'warn' as const, mode: 'oneway' as const, density: 'anywhere' as const };
const place = (key: string, category: Place['category'], kind: Place['kind'], p: LngLat, name = key): Place => ({ key, name, category, at: p, generic: false, build: 'b', markable: true, kind });
const museum = (name: string, p: LngLat): Place => archivePlace(name, 'museum', p, 'v')!;
const planner = (places: Place[]) =>
  createPlanner({
    read: async () => ({ places, segments: segs }),
    reach: async () => ({ cars: [], unknown: false }) as Reach,
    found: async () => [],
  } satisfies PlannerDeps);

test('PK8: a bar lit by museums the data calls historic plans a route through them; one alone is "few"', async () => {
  const two = await planner([museum('Old Mill Museum', at(250, 250)), museum('Kiln Museum', at(1000, 900))]).plan({ kind: 'history', area, from: at(130, 130), prefs });
  assert.ok(two.routes.length > 0, `reasons: ${two.reasons.join(', ')}`);
  const alone = await planner([museum('Kiln Museum', at(1000, 900))]).plan({ kind: 'history', area, from: at(130, 130), prefs });
  assert.deepEqual(alone.routes, []);
  assert.ok(alone.reasons.includes('few'), 'one place is not "a lot"');
});

test('PK9: cells come from places you pass when they make the minimum, else from all', async () => {
  // Monuments in two cells near the south-west; museums, more of them, in two cells near the north-east.
  const monuments = [at(200, 200), at(220, 210), at(900, 300), at(910, 320)].map((p, i) => place(`m${i}`, 'history', 'monuments', p));
  const museums = [at(1000, 1000), at(1010, 990), at(1020, 1010), at(1250, 1000), at(1260, 1010), at(1240, 990)].map((p, i) => museum(`Old Museum ${i}`, p));
  const lean = await planner([...monuments, ...museums]).plan({ kind: 'history', area, from: at(130, 130), prefs });
  assert.ok(lean.routes.length > 0);
  for (const r of lean.routes)
    for (const s of r.stops) assert.ok(monuments.some((m) => distanceM(m.at, s) <= 300), 'every stop is among the places you pass');
  // One monument cannot make the minimum of cells: every place of the bar chooses them.
  const all = await planner([monuments[0], ...museums]).plan({ kind: 'history', area, from: at(130, 130), prefs });
  assert.ok(all.routes.length > 0, `reasons: ${all.reasons.join(', ')}`);
  assert.ok(all.routes[0].stops.some((s) => museums.some((m) => distanceM(m.at, s) <= 300)), 'the museums choose cells too');
});

test('PK10: a museum the data calls historic counts toward History along the route', async () => {
  const parks = [at(130, 130), at(160, 150), at(850, 140), at(880, 120), at(1250, 130)].map((p, i) => place(`p${i}`, 'parks', 'parks', p));
  const along = [at(500, 130), at(520, 140), at(700, 130), at(720, 120), at(1000, 140), at(1020, 130)].map((p, i) => museum(`Old Museum ${i}`, p));
  const r = await planner([...parks, ...along]).plan({ kind: 'parks', area, from: at(130, 130), prefs });
  assert.ok(r.routes.length > 0);
  const kinds = r.routes[0].also.map((a) => a.kind);
  assert.ok(kinds.includes('history'), `also: ${kinds.join(', ')}`);
  assert.ok(kinds.includes('culture'), `also: ${kinds.join(', ')}`);
});

test('PK17: the planner\'s words name no place, say no count and never the lean', () => {
  const lean = /pass[- ]by|places you pass|go into|destination kind/i;
  for (const f of ['../../walkPlanner/words.ts', '../../walkPlanner/exposure.ts', '../../../components/planner/PlannerDrawer.tsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const strings = src.match(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
    for (const s of strings) assert.ok(!lean.test(s), `${f}: ${s}`);
  }
});

// The audit (Nov 11): regression tests before their fixes.

test('presence-and-kinds audit 1: the planner reads the places archive beside the map, as the atlas ring does', async () => {
  // The Kilns light History only from the archive; the map holds nothing of them.
  const archive = [museum('Old Mill Museum', at(250, 250)), museum('Kiln Museum', at(1000, 900))];
  const p = createPlanner({
    read: async () => ({ places: [], archive, segments: segs }),
    reach: async () => ({ cars: [], unknown: false }) as Reach,
    found: async () => [],
  } satisfies PlannerDeps);
  const r = await p.plan({ kind: 'history', area, from: at(130, 130), prefs });
  assert.ok(r.routes.length > 0, `reasons: ${r.reasons.join(', ')}`);
});

test('presence-and-kinds audit 2: with no lean, a route is graded by the planner\'s own cells, as before the slice', async () => {
  const food: Place[] = [];
  for (let e = 100; e <= 1300; e += 300) for (let n = 100; n <= 1300; n += 300) food.push(place(`f${e}-${n}`, 'food', undefined, at(e, n)));
  const r = await planner(food).plan({ kind: 'food', area, from: at(130, 130), prefs: { ...prefs, budgetM: 4000 } });
  assert.ok(r.routes.length > 0);
  const lines = segs.flatMap((s) => s.geometry);
  const own = onStreets(densestCells(food, area.at), lines).slice(0, CONSIDERED);
  for (const route of r.routes) assert.deepEqual(route.runs, gradeRuns(route.path, own), `${route.preset}: graded only by the cells it considered`);
});

test('presence-and-kinds audit 3: places you pass out of reach fall back to every place of the bar', async () => {
  const far = [at(1300, 1300), at(1310, 1290), at(900, 1300), at(910, 1310)].map((p, i) => place(`m${i}`, 'history', 'monuments', p));
  const near = [at(200, 250), at(220, 260), at(600, 200), at(610, 220)].map((p, i) => museum(`Old Museum ${i}`, p));
  const r = await planner([...far, ...near]).plan({ kind: 'history', area, from: at(130, 130), prefs: { ...prefs, budgetM: 1500 } });
  assert.ok(r.routes.length > 0, `reasons: ${r.reasons.join(', ')}`);
  assert.ok(r.routes[0].stops.every((s) => near.some((m) => distanceM(m.at, s) <= 300)), 'the near museums make the route');
});
