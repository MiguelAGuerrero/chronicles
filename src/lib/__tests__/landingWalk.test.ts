/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../geo';
import { LANDING_WALK, deadZoneNudge, loopWaypoint, planLoop, stripAt } from '../landing/walk';
import type { LngLat } from '../types';

// v1.5 slice 3 (on the walk), written from criteria L13-L16 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

test('walk: the loop goes from the landing through each pocket, nearest first, and back (L13)', () => {
  const pockets = [
    { name: 'Far', centre: m(1500, 0) },
    { name: 'Near', centre: m(300, 0) },
    { name: 'Middle', centre: m(800, 200) },
  ];
  const legs = planLoop(O, pockets);
  assert.deepEqual(legs.map((l) => l.label), ['Near', 'Middle', 'Far', 'Start here']);
  assert.deepEqual(legs[legs.length - 1].at, O);
});

test('walk: the loop keeps within the 10 km limit; the rest are left (L13)', () => {
  const pockets = [{ name: 'A', centre: m(2000, 0) }, { name: 'B', centre: m(4000, 0) }, { name: 'C', centre: m(6000, 0) }];
  const legs = planLoop(O, pockets);
  // Out and back, straight-line: A and B (8 km round trip); C would make 12 km.
  assert.deepEqual(legs.map((l) => l.label), ['A', 'B', 'Start here']);
  let total = 0;
  let at = O;
  for (const l of legs) {
    total += distanceM(at, l.at);
    at = l.at;
  }
  assert.ok(total <= LANDING_WALK.loopMaxM);
});

test('walk: on a strip within 30 m, the chip names it (L14)', () => {
  const strips = [{ name: 'Thayer Street', lines: [[m(0, -100), m(0, 200)]] }];
  assert.equal(stripAt(m(20, 50), strips), 'Thayer Street');
  assert.equal(stripAt(m(40, 50), strips), null);
});

test('walk: a dead zone nudges once, after 10 min more than 400 m from every pocket, toward one within 1.5 km (L15)', () => {
  const pockets = [{ name: 'Thayer Street', centre: m(0, 600), strip: true }];
  const base = { here: m(0, 0), pockets, quiet: false, nudged: false };
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 9 * 60_000 }), null, 'not yet 10 min');
  const n = deadZoneNudge({ ...base, farSinceMs: 10 * 60_000 })!;
  assert.equal(n.text, 'Thayer Street strip, 600 m north');
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 11 * 60_000, nudged: true }), null, 'once a walk');
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 11 * 60_000, quiet: true }), null, 'quiet walk');
  assert.equal(deadZoneNudge({ ...base, here: m(0, 300), farSinceMs: 11 * 60_000 }), null, 'within 400 m: not a dead zone');
  assert.equal(deadZoneNudge({ ...base, pockets: [{ name: 'Far', centre: m(0, 1700) }], farSinceMs: 11 * 60_000 }), null, 'none within 1.5 km');
  assert.equal(deadZoneNudge({ ...base, pockets: [{ name: 'A busy pocket', centre: m(-500, 0) }], farSinceMs: 11 * 60_000 })!.text, 'A busy pocket, 500 m west');
});

test('walk: the loop is one waypoint: the landing first (scanned on arrival), then the pockets, numbered (L13, L16)', () => {
  const w = loopWaypoint(O, 'Thayer Street', [{ name: 'Near', centre: m(300, 0) }, { name: 'Far', centre: m(900, 0) }]);
  assert.equal(w.label, 'Thayer Street');
  assert.deepEqual(w.leg, { n: 1, of: 4 });
  assert.equal(w.scanOnArrive, true);
  assert.deepEqual(w.legs!.map((l) => `${l.leg!.n} ${l.label}`), ['2 Near', '3 Far', '4 Start here']);
  assert.ok(w.legs!.every((l) => !l.scanOnArrive));
});
