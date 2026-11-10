import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import type { Cell } from '../../kindWalk/density';
import { MIN_RUN_M, gradeRuns, kindShare } from '../../walkPlanner/exposure';
import { plannerMap, pinsAlong, gradedPieces } from '../../walkPlanner/mapProps';
import { planRoutes } from '../../walkPlanner/planner';
import { at, cases, leg } from './grid';

const line = [at(0, 0), at(600, 0), at(1200, 0), at(1800, 0), at(2400, 0)];
const cells: Cell[] = [{ at: at(1200, 100), count: 6 }, { at: at(1300, 150), count: 2 }];

test('WP16: The shading is at the cells\' resolution: no run is narrower than a cell, and it does not change when a place is found', () => {
  const runs = gradeRuns(line, cells);
  const total = runs[runs.length - 1].toM;
  assert.ok(Math.abs(total - 2400) < 25);
  for (const r of runs) assert.ok(r.toM - r.fromM >= MIN_RUN_M - 1 || runs.length === 1, `a run of ${Math.round(r.toM - r.fromM)} m`);
  assert.ok(runs.some((r) => r.grade >= 2), 'the dense cell shades its stretch');
  // A find changes no cell: the cells carry counts of every place, found or not, and nothing about which is found.
  assert.deepEqual(gradeRuns(line, cells.map((c) => ({ ...c }))), runs);
  assert.ok(kindShare(runs) > 0 && kindShare(runs) < 1);
});

test('WP16: Shading follows the highlighted route in grades, pieces that join', () => {
  const runs = gradeRuns(line, cells);
  const pieces = gradedPieces(line, runs);
  assert.equal(pieces.length, runs.length);
  assert.ok(distanceM(pieces[0].path[0], line[0]) < 1 && distanceM(pieces[pieces.length - 1].path.at(-1)!, line[4]) < 1);
  for (let i = 1; i < pieces.length; i++) assert.ok(distanceM(pieces[i - 1].path.at(-1)!, pieces[i].path[0]) < 1);
});

test('WP16: The only pins are places already found, near the routes, several close together as one with no count', () => {
  const found = [{ at: at(1250, 40) }, { at: at(1290, 60) }, { at: at(2000, 30) }, { at: at(3000, 3000) }];
  const pins = pinsAlong([line], found);
  assert.equal(pins.length, 2, 'two close together are one; the one far from the route is none');
  assert.ok(pins.every((p) => Array.isArray(p) && p.length === 2), 'a pin is a point and nothing else: no count, no name');
});

test('WP16: The planner map has no field for a point of interest or a "?" mark, and the pins equal the found set exactly', () => {
  const c = cases(3)[1];
  const routes = planRoutes({ cells: c.cells, from: c.from, mode: 'oneway', ceilingM: 3500, density: 'anywhere' }, leg).routes;
  const found = [{ at: routes[0].path[Math.floor(routes[0].path.length / 2)] }];
  const unfound = { at: at(400, 400), found: false, name: 'A place not yet found' };
  const map = plannerMap(routes, 0, found);
  assert.deepEqual(Object.keys(map).sort(), ['alternates', 'fit', 'grades', 'pins', 'route']);
  assert.equal(map.pins.length, 1);
  assert.deepEqual(map.pins[0], found[0].at);
  assert.ok(!JSON.stringify(map).includes(unfound.name));
  const same = plannerMap(routes, 0, found);
  assert.deepEqual(same.grades, map.grades, 'finding another place leaves the shading as it was');
});

test('WP4: With no row highlighted, every route is drawn alike and none is the route', () => {
  const c = cases(3)[1];
  const routes = planRoutes({ cells: c.cells, from: c.from, mode: 'oneway', ceilingM: 3500, density: 'anywhere' }, leg).routes;
  const map = plannerMap(routes, null, []);
  assert.equal(map.route, null);
  assert.equal(map.alternates.length, routes.length);
  assert.deepEqual(map.grades, []);
});
