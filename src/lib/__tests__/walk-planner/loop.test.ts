import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { navStep, passedStops, startNav } from '../../nav/navigator';
import type { Waypoint } from '../../nav/types';
import { destFor } from '../../walkPlanner/dest';
import { planRoutes } from '../../walkPlanner/planner';
import { at, cases, leg } from './grid';

// A loop out along the south side and back along the north: start (0,0), stops east, home again.
const out = [at(0, 0), at(300, 0), at(600, 0), at(900, 0), at(900, 300), at(600, 300), at(300, 300), at(0, 300), at(0, 0)];
const stops = [at(600, 0), at(600, 300)];
const dest: Waypoint = { at: at(0, 0), label: 'Around the edge', kind: 'point', via: stops, suggested: true, loop: true, path: out };
const route = { path: out, lengthM: 1800, source: 'planned' };

test('WP9: Starting a loop does not arrive at once: it ends where it began', () => {
  const s = startNav(dest, route, 0);
  const r = navStep(s, at(0, 0), 1000, stops.length);
  assert.equal(r.state.arrived, false, 'at the start, with stops still ahead');
  assert.equal(navStep(s, at(10, 5), 1000, 2).state.arrived, false);
});

test('WP9: A loop arrives once the stops are passed and the walker is back within 30 m of its end', () => {
  const s = startNav(dest, route, 0);
  assert.equal(navStep(s, at(0, 20), 1000, 0).state.arrived, true);
  assert.equal(navStep(s, at(0, 250), 1000, 0).state.arrived, false, 'not yet back');
  const oneWay = { ...dest, loop: undefined, at: at(900, 300) };
  assert.equal(navStep(startNav(oneWay, route, 0), at(900, 290), 1000).state.arrived, true, 'a one-way trip is unchanged');
});

test('WP25: A stop the walker has passed by on the way is let go, so a re-route does not pull back to it', () => {
  assert.equal(passedStops(out, stops, at(100, 0), 0), 0, 'none yet');
  assert.equal(passedStops(out, stops, at(600, 10), 0), 1, 'within reach of the first');
  assert.equal(passedStops(out, stops, at(900, 200), 0), 1, 'gone by the first, not near it');
  assert.equal(passedStops(out, stops, at(200, 300), 0), 2, 'gone by both, on the way back');
  assert.equal(passedStops(out, stops, at(200, 300), 2), 2, 'never fewer than before');
  assert.equal(passedStops(out, stops, at(400, 500), 0), 0, 'far off the route is not passing');
});

test('WP25: A loop with a skipped stop still arrives', () => {
  const s = startNav(dest, route, 0);
  const left = stops.length - passedStops(out, stops, at(100, 300), 0);
  assert.equal(left, 0);
  assert.equal(navStep(s, at(5, 5), 1000, left).state.arrived, true);
});

test('WP21 WP17: The destination is an ordinary one: it carries its stops, its path and suggested, and no walk field is written', () => {
  const c = cases(2)[1];
  for (const mode of ['loop', 'oneway'] as const) {
    const r = planRoutes({ cells: c.cells, from: c.from, mode, ceilingM: 3500, density: 'anywhere' }, leg).routes[0];
    const d = destFor(r);
    assert.equal(d.suggested, true);
    assert.equal(d.kind, 'point');
    assert.deepEqual(d.path, r.path);
    assert.equal(!!d.loop, mode === 'loop');
    assert.equal(d.via!.length, mode === 'loop' ? r.stops.length : r.stops.length - 1);
    assert.ok(distanceM(d.at, mode === 'loop' ? c.from : r.stops[r.stops.length - 1]) < 1);
    assert.deepEqual(Object.keys(d).filter((k) => !['at', 'label', 'kind', 'via', 'suggested', 'loop', 'path'].includes(k)), [], 'nothing else rides on it');
  }
});
