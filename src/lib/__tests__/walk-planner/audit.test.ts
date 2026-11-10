import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ATLAS_ORDER } from '../../atlas/atlas';
import type { Place } from '../../discovery/types';
import { distanceM } from '../../geo';
import type { Cell } from '../../kindWalk/density';
import { retracedM } from '../../kindWalk/plan';
import { navStep, passedStops, rejoinPlanned, startNav } from '../../nav/navigator';
import type { Route, Waypoint } from '../../nav/types';
import type { LngLat, StreetSegment } from '../../types';
import { alsoPasses, gradeRuns, stripLabel } from '../../walkPlanner/exposure';
import { applyRound, headingNote, roundFor } from '../../walkPlanner/page';
import { fitPreset, overlapShare } from '../../walkPlanner/planner';
import { ceilingFor } from '../../walkPlanner/settings';
import { createPlanner, legOver, type PlannerDeps, type PlannerResult } from '../../walkPlanner/service';
import { alsoLine, densityHeading, differentLabel, lessGroundLine, reasonLine, title, visibleLines } from '../../walkPlanner/words';
import { nearestStep } from '../../kindWalk/settings';
import { at, leg, segs } from './grid';

const straight = (a: LngLat, b: LngLat): Route => ({ path: [a, b], lengthM: distanceM(a, b), source: 't' });
const cell = (e: number, n: number, count: number): Cell => ({ at: at(e, n), count });

test('walk-planner audit 1: a re-route off a planned loop rejoins it and keeps the way back', () => {
  const planned = [at(0, 0), at(600, 0), at(600, 240), at(0, 240), at(0, 0)];
  const r = rejoinPlanned(planned, at(300, -80), straight)!;
  assert.ok(r && distanceM(r.path[0], at(300, -80)) < 1, 'it begins where the walker is');
  const tail = r.path.slice(-4);
  assert.deepEqual(tail.map((p) => [p[0].toFixed(5), p[1].toFixed(5)]), [at(600, 0), at(600, 240), at(0, 240), at(0, 0)].map((p) => [p[0].toFixed(5), p[1].toFixed(5)]), 'the planned remainder, way back included, is kept');
  assert.ok(Math.abs(r.lengthM - (80 + 300 + 240 + 600 + 240)) < 15, `length ${Math.round(r.lengthM)}`);
});

test('walk-planner audit 2: when nothing different exists the routes on screen stay and the reason is said', () => {
  const three = { routes: [1, 2, 3], reasons: [], found: [] } as unknown as PlannerResult;
  const none = { routes: [], reasons: ['nothingDifferent'], found: [] } as unknown as PlannerResult;
  const r = applyRound(three, none, 1);
  assert.equal(r.result, three, 'the routes on screen stay');
  assert.equal(r.nothing, true);
  const fresh = { routes: [4], reasons: [], found: [] } as unknown as PlannerResult;
  assert.deepEqual(applyRound(three, fresh, 2), { result: fresh, nothing: false });
  assert.deepEqual(applyRound(three, none, 0), { result: none, nothing: false }, 'the first plan is shown as it is');
});

test('walk-planner audit 3: a preset whose first cell is out of reach still offers a pair that fits', () => {
  const cells = [cell(130, 130, 9), cell(2500, 130, 8), cell(300, 130, 7), cell(500, 130, 6)];
  const r = fitPreset('edge', cells, at(130, 130), 'oneway', 1200, leg, 0);
  assert.ok(r, 'two near cells fit the ceiling although the furthest does not');
  assert.ok(r!.lengthM <= 1200 + 0.5);
});

test('walk-planner audit 4: progress on a closed loop follows the walker\'s order, not the first nearest segment', () => {
  const out = [at(0, 0), at(300, 0), at(600, 0), at(600, 300), at(300, 300), at(0, 300), at(0, 0)];
  const dest: Waypoint = { at: at(0, 0), label: 'x', kind: 'point', loop: true, via: [at(600, 150)], path: out };
  const s = { ...startNav(dest, { path: out, lengthM: 1800, source: 'p' }, 0), seg: out.length - 1 };
  const r = navStep(s, at(0, 0), 1000, 1);
  assert.ok(r.state.leftM < 60, `left ${Math.round(r.state.leftM)} m at the finish`);
  assert.equal(passedStops(out, [at(600, 150)], at(0, 0), 0, out.length - 1), 1, 'the stop is passed by the way round');
});

test('walk-planner audit 5: non-markable places of a findable kind do not make a cell dense', async () => {
  const church = (i: number): Place => ({ key: `c${i}`, name: `Church ${i}`, category: 'history', at: at(500 + i, 130), generic: false, build: 'b', markable: false }) as Place;
  const notable = (i: number, e: number): Place => ({ key: `n${i}`, name: `Monument ${i}`, category: 'history', at: at(e, 130), generic: false, build: 'b', markable: true }) as Place;
  const places = [...Array.from({ length: 10 }, (_, i) => church(i)), notable(0, 130), notable(1, 1000)];
  const d: PlannerDeps = { read: async () => ({ places, segments: segs }), reach: async () => ({ cars: [], unknown: false }), found: async () => [] };
  const r = await createPlanner(d).plan({ kind: 'history', area: { at: at(650, 650), reachM: 1200 }, from: at(130, 130), prefs: { budgetM: 3000, pref: 'warn', mode: 'oneway', density: 'anywhere' } });
  assert.ok(r.routes.length > 0);
  for (const route of r.routes) for (const s of route.stops) assert.ok(distanceM(s, at(500, 130)) > 200, 'no stop in the cell of churches that cannot be found');
});

test('walk-planner audit 6: the ceiling used is the step shown, in either unit', () => {
  assert.equal(ceilingFor(2000, 'mi'), nearestStep(2000, 'mi'));
  assert.equal(ceilingFor(2000, 'km'), 2000);
});

test('walk-planner audit 7: a way back may share a long segment\'s unused part', () => {
  const pts = Array.from({ length: 16 }, (_, i) => at(i * 100, 0));
  const long: StreetSegment = { id: 'avenue', name: 'Avenue', kind_detail: 'residential', length_m: 1500, geometry: [pts], build: 'b' };
  const back = legOver([long])(at(1400, 0), at(100, 0), [at(0, 0), at(100, 0), at(200, 0), at(300, 0)]);
  assert.ok(back, 'the avenue is only partly used by the way out');
});

test('walk-planner audit 8: overlap and retracing are measured along the geometry, not vertex pairs', () => {
  assert.ok(overlapShare([at(0, 0), at(300, 0), at(600, 0)], [at(0, 0), at(600, 0)]) > 0.9, 'a stop in the middle of a street is the same street');
  const back = [at(0, 0), at(600, 0), at(300, 0), at(0, 0)];
  assert.ok(retracedM(back) > 500, `retraced ${Math.round(retracedM(back))}`);
});

test('walk-planner audit 9: a lone place along a route is never "plenty"', () => {
  const line = [at(0, 0), at(600, 0), at(1200, 0)];
  const runs = gradeRuns(line, [cell(600, 50, 1)]);
  assert.ok(runs.every((r) => r.grade <= 1), 'one place is the faintest grade');
  const also = alsoPasses(line, { history: [cell(600, 50, 1)] }, ATLAS_ORDER, 'parks');
  assert.ok(also.every((a) => a.level === 'some'));
});

test('walk-planner audit 10: a settings change plans once: the round starts over with the settings', () => {
  assert.equal(roundFor({ key: 'a', n: 3 }, 'a'), 3);
  assert.equal(roundFor({ key: 'a', n: 3 }, 'b'), 0);
});

test('walk-planner audit 14: only the selected row carries the "Also passes" line', () => {
  const w = { title: 't', distance: 'About 1.0 km', passes: 'Plenty', getting: null, also: 'Also passes some history' };
  assert.ok(visibleLines(w, true).includes('Also passes some history'));
  assert.ok(!visibleLines(w, false).includes('Also passes some history'));
});

test('walk-planner audit 15: no line compares: "less", "than", "same", "different" are not used', () => {
  const sentences = [...(['noPosition', 'far', 'few', 'noRoute', 'outOfReach', 'little', 'same', 'nothingDifferent', 'cars', 'noLoop'] as const).map(reasonLine), lessGroundLine];
  for (const s of sentences) assert.ok(!/\b(less|than|same|different)\b/i.test(s), `"${s}"`);
  assert.equal(differentLabel, 'Suggest different routes');
});

test('walk-planner audit 16: with a destination set on the open walk, the page says Start replaces it', () => {
  const nav = JSON.stringify({ walk_id: 'w1', dest: { at: [1, 1], label: 'Park', kind: 'point' } });
  assert.equal(headingNote(nav, 'w1'), 'This replaces where you were heading.');
  assert.equal(headingNote(nav, 'w2'), null, 'another walk\'s destination is not this walk\'s');
  assert.equal(headingNote('', 'w1'), null);
  assert.equal(headingNote(null, 'w1'), null);
});

test('walk-planner audit 19: the density setting names the kind and does not say what it is a threshold of', () => {
  assert.equal(densityHeading('history'), 'How much history the walk passes');
});

test('walk-planner audit 20: the title and the strip name the kind and no place', () => {
  assert.equal(title('parks'), 'A walk for green');
  assert.match(stripLabel([0, 0, 3, 3, 1, 1], 'Green'), /^Green along this route: none at the start/);
  assert.equal(alsoLine([{ kind: 'history', level: 'some' }]), 'Also passes some history');
});

test('walk-planner audit 21: the pins are finds of the opened kind', async () => {
  const asked: string[] = [];
  const places = [[130, 130], [160, 150], [850, 140], [880, 120]].map(([e, n], i) => ({ key: `h${i}`, name: `H${i}`, category: 'history', at: at(e, n), generic: false, build: 'b', markable: true }) as Place);
  const d: PlannerDeps = { read: async () => ({ places, segments: segs }), reach: async () => ({ cars: [], unknown: false }), found: async (kind) => (asked.push(kind), []) };
  await createPlanner(d).plan({ kind: 'history', area: { at: at(650, 650), reachM: 1200 }, from: at(130, 130), prefs: { budgetM: 3000, pref: 'warn', mode: 'oneway', density: 'anywhere' } });
  assert.deepEqual(asked, ['history'], 'finds are asked for by the opened kind');
});
