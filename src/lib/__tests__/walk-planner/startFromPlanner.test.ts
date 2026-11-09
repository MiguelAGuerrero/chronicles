import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NAV_KEY, navValue, startPlan, walkHerePlan } from '../../startPlan';
import { destFor, routeToStart } from '../../walkPlanner/dest';
import { planRoutes } from '../../walkPlanner/planner';
import { close, open, replanned, select, startable } from '../../walkPlanner/page';
import { at, cases, distanceM, leg } from './grid';

const input = (c: ReturnType<typeof cases>[number]) => ({ cells: c.cells, from: c.from, mode: 'oneway' as const, ceilingM: 3500, density: 'anywhere' as const });

test('WP19: With a walk recording, Start routes that walk, replacing a destination already set, and starts no second walk', () => {
  const c = cases(3)[1];
  const r = planRoutes(input(c), leg).routes[0];
  const dest = destFor(r);
  const plan = walkHerePlan('walk-7', dest);
  assert.equal(plan.kind, 'route');
  if (plan.kind === 'route') {
    assert.deepEqual(plan.meta, [[NAV_KEY, navValue('walk-7', dest)]], 'the open walk\'s destination is written, replacing what was there');
    assert.ok(JSON.parse(plan.meta[0][1]).dest.suggested);
  }
});

test('WP19: With no walk, Start starts one ready (0076), its destination written for it', () => {
  const dest = destFor(planRoutes(input(cases(3)[1]), leg).routes[0]);
  assert.deepEqual(walkHerePlan(null, dest), { kind: 'start' });
  const sp = startPlan({ walkId: 'w1', now: 1, mode: 'quiet', dest });
  assert.deepEqual(sp.meta.map(([k]) => k), [NAV_KEY]);
  assert.deepEqual(sp.params, { started: '1' });
});

test('WP24: Start plans again from where the walker stands then, with the same settings, and takes the same preset', () => {
  const c = cases(5)[3];
  const first = planRoutes(input(c), leg).routes[0];
  const moved = { ...c, from: at(first.stops[0][0] === 0 ? 0 : 400, 400) };
  const again = routeToStart({ ...input(moved), from: moved.from }, first, leg);
  assert.equal(again.preset, first.preset);
  assert.ok(distanceM(again.path[0], moved.from) < 1, 'the new route begins where the walker is now');
  assert.ok(again.lengthM <= 3500 + 0.5, 'the same ceiling holds');
});

test('WP24: If the preset gives no route from there, the highlighted route stands', () => {
  const c = cases(5)[3];
  const first = planRoutes(input(c), leg).routes[0];
  const far = routeToStart({ ...input(c), from: at(9000, 9000) }, first, leg);
  assert.equal(far, first);
});

test('WP1 WP18: Nothing is highlighted when the page opens, Start waits for a tap on a row, and closing starts over', () => {
  const routes = planRoutes(input(cases(3)[1]), leg).routes;
  const o = open();
  assert.equal(o.open, true);
  assert.equal(o.selected, null);
  assert.equal(startable(o, routes), null, 'nothing starts until a row is chosen');
  const s = select(o, 0, routes);
  assert.equal(startable(s, routes), routes[0]);
  assert.equal(select(o, 99, routes).selected, null, 'a row that is not there is not chosen');
  assert.equal(replanned(s).selected, null, 'new routes: nothing is highlighted again');
  assert.deepEqual(close(), { open: false, selected: null });
  assert.equal(startable(close(), routes), null);
});
