import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { routeVia, viaAhead } from '../../nav/navigator';
import type { RouteSource } from '../../nav/types';
import { NAV_KEY, startPlan } from '../../startPlan';
import type { LngLat } from '../../types';

const p = (x: number): LngLat => [8.54 + x / 80000, 47.37];
const straight: RouteSource = { id: 'straight', route: (a, b) => ({ path: [a, b], lengthM: distanceM(a, b), source: 'straight' }) };
const noEast: RouteSource = { id: 'noEast', route: (a, b) => (b[0] > p(1500)[0] ? null : straight.route(a, b)) };

test('KW5: a route goes through its stops in order, the legs joined', () => {
  const r = routeVia([straight], p(0), [p(400), p(900)], p(1200), 'shortest');
  assert.ok(r.route);
  assert.deepEqual(r.route!.path, [p(0), p(400), p(900), p(1200)]);
  assert.ok(Math.abs(r.route!.lengthM - distanceM(p(0), p(1200))) < 1);
});

test('KW5: with no stops it is an ordinary route', () => {
  assert.deepEqual(routeVia([straight], p(0), [], p(500)).route?.path, [p(0), p(500)]);
});

test('KW5: a leg with no route is no route', () => {
  const r = routeVia([noEast], p(0), [p(400), p(2000)], p(2400));
  assert.equal(r.route, null);
  assert.ok(r.reason);
});

test('KW13: after a re-route only the stops not yet passed are kept', () => {
  const via = [p(400), p(900)];
  assert.deepEqual(viaAhead(via, 0), via);
  assert.deepEqual(viaAhead(via, 1), [p(900)]);
  assert.deepEqual(viaAhead(via, 5), []);
});


test('KW12: a walk started from a kind is an ordinary one: only the navigation destination says it was suggested', () => {
  const dest = { at: p(900), label: 'Through green', kind: 'point' as const, via: [p(400)], suggested: true };
  const plan = startPlan({ walkId: 'w1', now: 1, mode: 'quiet', dest });
  assert.deepEqual(plan.meta.map(([k]) => k), [NAV_KEY], 'nothing but the destination is written for the walk');
  assert.ok(JSON.parse(plan.meta[0][1]).dest.suggested, 'the destination carries it');
  assert.deepEqual(plan.params, { started: '1' }, 'the walk opens as any walk started to somewhere');
});
