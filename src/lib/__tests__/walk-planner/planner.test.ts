import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retracedM } from '../../kindWalk/plan';
import { overlapShare, planRoutes, type PlanInput } from '../../walkPlanner/planner';
import { PRESET_IDS } from '../../walkPlanner/presets';
import { at, cases, distanceM, leg } from './grid';

const base = (c: ReturnType<typeof cases>[number], over: Partial<PlanInput> = {}): PlanInput => ({ cells: c.cells, from: c.from, mode: 'loop', ceilingM: 3000, density: 'anywhere', ...over });
const lengthOf = (path: readonly [number, number][]) => path.reduce((s, p, i) => (i ? s + distanceM(path[i - 1], p) : 0), 0);

test('WP3: With no position it says so and plans nothing', () => {
  const r = planRoutes({ cells: cases(1)[0].cells, from: null, mode: 'loop', ceilingM: 3000, density: 'anywhere' }, leg);
  assert.deepEqual(r, { routes: [], reasons: ['noPosition'] });
});

test('WP4: Up to three routes in the presets\' fixed order, the same on every call', () => {
  let seen = 0;
  for (const c of cases()) {
    const a = planRoutes(base(c), leg);
    const b = planRoutes(base(c), leg);
    assert.deepEqual(a, b);
    assert.ok(a.routes.length <= 3);
    const order = a.routes.map((r) => PRESET_IDS.indexOf(r.preset));
    assert.deepEqual(order, [...order].sort((x, y) => x - y), 'the rows follow the presets, not length or quality');
    seen += a.routes.length;
  }
  assert.ok(seen >= 40, `most cases give routes (${seen})`);
});

test('WP4: A small area gives one route with a reason, not a failure', () => {
  const cells = [{ at: at(130, 130), count: 5 }, { at: at(250, 130), count: 4 }];
  const r = planRoutes({ cells, from: at(130, 130), mode: 'oneway', ceilingM: 3000, density: 'anywhere' }, leg);
  assert.equal(r.routes.length, 1, 'the presets all pass the same two cells');
  assert.ok(r.reasons.includes('same'));
});

test('WP6: No two routes share more than 80% of their length; where fewer differ, a reason is given', () => {
  let fewer = 0;
  for (const c of cases()) {
    const r = planRoutes(base(c), leg);
    for (let i = 0; i < r.routes.length; i++) for (let j = i + 1; j < r.routes.length; j++) assert.ok(overlapShare(r.routes[i].path, r.routes[j].path) <= 0.8 + 1e-9);
    if (r.routes.length < 3 && r.routes.length > 0) {
      fewer += 1;
      assert.ok(r.reasons.length > 0, 'fewer than three says why');
    }
  }
  assert.ok(fewer > 0, 'some cases give fewer than three');
});

test('WP8: A loop starts and ends where the walker stands; a one-way trip ends at its last stop', () => {
  for (const c of cases(20)) {
    for (const r of planRoutes(base(c, { mode: 'loop' }), leg).routes) {
      assert.ok(r.loop);
      assert.ok(distanceM(r.path[0], c.from) < 1 && distanceM(r.path[r.path.length - 1], c.from) < 1);
    }
    for (const r of planRoutes(base(c, { mode: 'oneway' }), leg).routes) {
      assert.ok(!r.loop);
      assert.ok(distanceM(r.path[0], c.from) < 1 && distanceM(r.path[r.path.length - 1], r.stops[r.stops.length - 1]) < 1);
    }
  }
});

test('WP10 KW17: No route is longer than the ceiling, counting the way there and the way back, in both modes', () => {
  let routes = 0;
  for (const c of cases()) {
    for (const mode of ['loop', 'oneway'] as const) {
      for (const ceilingM of [1000, 2000, 3500]) {
        for (const r of planRoutes(base(c, { mode, ceilingM }), leg).routes) {
          routes += 1;
          assert.ok(r.lengthM <= ceilingM + 0.5, `${mode} ${Math.round(r.lengthM)} m over ${ceilingM}`);
          assert.ok(Math.abs(lengthOf(r.path) - r.lengthM) < 0.01 * r.lengthM + 2, 'the length is the whole path');
          assert.ok(r.startM <= r.lengthM);
        }
      }
    }
  }
  assert.ok(routes > 100, String(routes));
  // Where the ceiling is below any way: nothing, said as out of reach.
  const out = planRoutes(base(cases(1)[0], { ceilingM: 100, mode: 'oneway' }), leg);
  assert.deepEqual(out.routes, []);
  assert.ok(out.reasons.includes('outOfReach'));
});

test('WP10: A loop counts its way back: it is longer than the one-way to the same stops', () => {
  const c = cases(3)[2];
  const l = planRoutes(base(c, { mode: 'loop', ceilingM: 5000 }), leg).routes[0];
  const o = planRoutes(base(c, { mode: 'oneway', ceilingM: 5000 }), leg).routes[0];
  assert.ok(l && o && l.lengthM >= o.lengthM - 1);
});

test('WP11: A route that passes less of the kind than the density asks for is not offered, and the page says why', () => {
  let dropped = 0;
  for (const c of cases()) {
    const any = planRoutes(base(c, { density: 'anywhere' }), leg);
    const plenty = planRoutes(base(c, { density: 'plenty' }), leg);
    assert.ok(plenty.routes.length <= any.routes.length);
    if (plenty.routes.length < any.routes.length) {
      dropped += 1;
      assert.ok(plenty.reasons.includes('little'));
    }
  }
  assert.ok(dropped > 0, 'the setting acts on some cases');
});

test('WP13: A new suggestion shares at most 80% with the routes on screen, takes only those routes, and never moves to less dense ground', () => {
  let meanFirst = 0, meanLater = 0, nFirst = 0, nLater = 0;
  for (const c of cases(20)) {
    let shown: ReturnType<typeof planRoutes> | null = null;
    for (let round = 0; round < 10; round++) {
      const r = planRoutes(base(c, { round, shown: shown ? shown.routes.map((x) => x.path) : [] }), leg);
      for (const x of r.routes) for (const p of shown?.routes ?? []) assert.ok(overlapShare(x.path, p.path) <= 0.8 + 1e-9);
      const share = (rr: typeof r.routes) => rr.reduce((s, x) => s + x.runs.filter((q) => q.grade > 0).reduce((t, q) => t + q.toM - q.fromM, 0) / (x.runs[x.runs.length - 1]?.toM || 1), 0);
      if (round === 0) [meanFirst, nFirst] = [meanFirst + share(r.routes), nFirst + r.routes.length];
      else [meanLater, nLater] = [meanLater + share(r.routes), nLater + r.routes.length];
      if (r.routes.length) shown = r;
      else assert.ok(r.reasons.length > 0, 'nothing different is said');
    }
  }
  assert.ok(nFirst > 0 && nLater > 0);
  assert.ok(meanLater / nLater >= 0.8 * (meanFirst / nFirst), `density held: ${(meanLater / nLater).toFixed(2)} vs ${(meanFirst / nFirst).toFixed(2)}`);
});

test('WP20 KW16: Every route retraces at most a tenth of itself, in both modes', () => {
  for (const c of cases()) {
    for (const mode of ['loop', 'oneway'] as const) {
      for (const r of planRoutes(base(c, { mode }), leg).routes) assert.ok(retracedM(r.path) <= 0.1 * r.lengthM + 1, `${mode} retraced ${Math.round(retracedM(r.path))} of ${Math.round(r.lengthM)}`);
    }
  }
});

test('WP26: A walker more than 5 km from where the kind is gets no route and the reason', () => {
  const c = cases(1)[0];
  const r = planRoutes(base(c, { from: at(9000, 9000) }), leg);
  assert.deepEqual(r, { routes: [], reasons: ['far'] });
});

test('KW5 KW6: A route names no place: it is cell centres and streets, with no key, name or category', () => {
  for (const c of cases(10)) {
    for (const r of planRoutes(base(c), leg).routes) {
      assert.deepEqual(Object.keys(r).sort(), ['loop', 'lengthM', 'path', 'preset', 'runs', 'startM', 'stops'].sort());
      assert.ok(r.stops.every((s) => Array.isArray(s) && s.length === 2));
    }
  }
});

test('WP8: Where a loop cannot be made without going back the way it came, it says so and does not call it no way at all', () => {
  // One straight street: out and back is the only loop there is, and it is ruled out (KW16).
  const cells = [{ at: at(130, 10), count: 5 }, { at: at(850, 10), count: 4 }];
  const loop = planRoutes({ cells, from: at(130, 10), mode: 'loop', ceilingM: 3000, density: 'anywhere' }, (a, b) => leg(a, b));
  assert.deepEqual(loop.routes, []);
  assert.ok(loop.reasons.includes('noLoop'), loop.reasons.join());
  const oneway = planRoutes({ cells, from: at(130, 10), mode: 'oneway', ceilingM: 3000, density: 'anywhere' }, leg);
  assert.ok(oneway.routes.length > 0, 'the same cells make a one-way trip');
});
