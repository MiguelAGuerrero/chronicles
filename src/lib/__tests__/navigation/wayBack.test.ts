/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { traceRouteSource } from '../../nav/traceRoute';
import { readTrace, ridingAt } from '../../rides';
import type { LngLat, TracePoint } from '../../types';

// Drive there, walk back (specs/drive-then-walk, DW1-DW14): the decisions, pure. Written before the
// module, which each test loads inside its body.
const wayBack = (): Promise<any> => import(`../../nav/${'wayBack'}`);
const startPlan = (): Promise<any> => import(`../../${'startPlan'}`);

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in metres east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];

/** A small deterministic wobble, so fix-to-fix speeds look like a real phone's. */
function wobble(i: number, m: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [((a - Math.floor(a)) * 2 - 1) * m, ((b - Math.floor(b)) * 2 - 1) * m];
}

/** One fix a second along these legs (speed east in m/s, seconds), from O at t 0, the speed reported. */
function trip(legs: { v: number; s: number; north?: boolean }[], jitterM = 1): TracePoint[] {
  let x = 0;
  let y = 0;
  let t = 0;
  let i = 0;
  const out: TracePoint[] = [];
  const push = (v: number) => {
    const [jx, jy] = wobble(i++, jitterM);
    const p = at(x + jx, y + jy);
    out.push({ walk_id: 'w', t, lon: p[0], lat: p[1], accuracy_m: 8, speed: v, course: null });
  };
  push(legs[0].v);
  for (const leg of legs) {
    for (let k = 0; k < leg.s; k++) {
      if (leg.north) y += leg.v;
      else x += leg.v;
      t += 1000;
      push(leg.v);
    }
  }
  return out;
}

const WALK = 1.4;
const CAR = 12;
const BIKE = 5;
const p = (f: TracePoint): LngLat => [f.lon, f.lat];

// ---- Getting there first (Explore's area card) ----

test('DW1: a place within 2 km starts at once, with a fresh fix', { todo: 'test first' }, async () => {
  const { walkToChoice, GET_THERE_M } = await startPlan();
  const now = 10 * 3600_000;
  assert.equal(GET_THERE_M, 2000);
  assert.equal(walkToChoice(300, now - 60_000, now), 'start');
  assert.equal(walkToChoice(2000, now - 60_000, now), 'start', 'exactly 2 km is near');
});

test('DW2: a place past 2 km asks', { todo: 'test first' }, async () => {
  const { walkToChoice } = await startPlan();
  const now = 10 * 3600_000;
  assert.equal(walkToChoice(2001, now - 60_000, now), 'ask');
  assert.equal(walkToChoice(9_999, now, now), 'ask');
});

test('DW5: no position, or a fix over 30 minutes old, asks', { todo: 'test first' }, async () => {
  const { walkToChoice, FRESH_FIX_MS } = await startPlan();
  const now = 10 * 3600_000;
  assert.equal(FRESH_FIX_MS, 30 * 60_000);
  assert.equal(walkToChoice(null, null, now), 'ask', 'nothing known');
  assert.equal(walkToChoice(300, null, now), 'ask', 'a distance from where the atlas last listed, no fix');
  assert.equal(walkToChoice(300, now - 31 * 60_000, now), 'ask', 'a fix from over 30 min ago');
  assert.equal(walkToChoice(300, now - 30 * 60_000, now), 'start', 'exactly 30 min is fresh');
});

test('DW14: too far to walk offers When I get there alone', { todo: 'test first' }, async () => {
  const { walkToChoice } = await startPlan();
  const now = 10 * 3600_000;
  assert.equal(walkToChoice(10_001, now, now), 'later');
  assert.equal(walkToChoice(10_000, now, now), 'ask', 'exactly 10 km is still walkable (N5)');
  assert.equal(walkToChoice(40_000, null, now), 'later', 'too far whatever the fix');
});

// ---- The way back ----

test('DW6: back to where the last ride ended; the start with none; a ride under way doesn\'t count', { todo: 'test first' }, async () => {
  const { landingOf, wayBackTarget } = await wayBack();
  // A drive, a walk, a bus, a walk.
  const pts = trip([{ v: WALK, s: 60 }, { v: CAR, s: 180 }, { v: WALK, s: 120, north: true }, { v: CAR, s: 120 }, { v: WALK, s: 120, north: true }]);
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 2, 'two rides');
  const landing = landingOf(tr, false);
  assert.ok(landing, 'a landing');
  const firstAfter = tr.walked.find((f) => f.t > tr.rides[1].t1)!;
  assert.deepEqual(landing, p(firstAfter), 'the first walked point after the last ride');
  const start: LngLat = p(tr.walked[0]);
  assert.deepEqual(wayBackTarget({ start, landing, chosen: null }).at, landing);
  assert.equal(wayBackTarget({ start, landing, chosen: null }).kind, 'ride');

  // No ride: the start.
  const plain = readTrace(trip([{ v: WALK, s: 300 }]), 0);
  assert.equal(landingOf(plain, false), null);
  const t0 = wayBackTarget({ start, landing: null, chosen: null });
  assert.deepEqual(t0.at, start);
  assert.equal(t0.kind, 'start');

  // On the second ride now, stopped at a light: it doesn't count; the first ride's end does.
  const riding = trip([{ v: WALK, s: 60 }, { v: CAR, s: 180 }, { v: WALK, s: 120, north: true }, { v: CAR, s: 120 }, { v: 0, s: 40 }]);
  const tr2 = readTrace(riding, 0);
  const last = riding.at(-1)!;
  assert.ok(ridingAt(tr2, p(last), last.t), 'still on the ride');
  const firstLanding = tr2.walked.find((f) => f.t > tr2.rides[0].t1)!;
  assert.deepEqual(landingOf(tr2, true), p(firstLanding), 'the ride under way is skipped');
  assert.equal(wayBackTarget({ start: null, landing: null, chosen: null }), null, 'nothing walked yet');
});

test('DW7: the spot chosen wins over where the ride ended and the start', { todo: 'test first' }, async () => {
  const { wayBackTarget } = await wayBack();
  const chosen = at(500, 500);
  const t = wayBackTarget({ start: at(0, 0), landing: at(2000, 0), chosen });
  assert.deepEqual(t.at, chosen);
  assert.equal(t.kind, 'chosen');
});

test('DW8: the label names the target in words, with no digits; shown past 50 m', { todo: 'test first' }, async () => {
  const { wayBackTarget, showsWayBack, CHOSEN_NOTICE } = await wayBack();
  const start = at(0, 0);
  const s = wayBackTarget({ start, landing: null, chosen: null });
  const r = wayBackTarget({ start, landing: at(2000, 0), chosen: null });
  const c = wayBackTarget({ start, landing: at(2000, 0), chosen: at(10, 10) });
  assert.equal(s.said, 'Walk me back to the start');
  assert.equal(r.said, 'Walk me back to where the ride ended');
  assert.equal(c.said, 'Walk me back to the spot you chose');
  assert.equal(s.label, 'Start');
  assert.equal(r.label, 'Where the ride ended');
  assert.equal(c.label, 'The spot you chose');
  assert.equal(CHOSEN_NOTICE, 'Walk me back now leads here.');
  for (const x of [s, r, c]) {
    assert.doesNotMatch(`${x.said} ${x.label}`, /\d|min|faster|fastest|shorter/i, 'words, never numbers or a comparison');
  }
  assert.equal(showsWayBack(s, at(40, 0)), false, 'within 50 m: hidden');
  assert.equal(showsWayBack(s, at(60, 0)), true, 'past 50 m: shown');
  assert.equal(showsWayBack(r, at(60, 0)), true, 'measured from its own target, not the start');
  assert.equal(showsWayBack(r, at(2030, 0)), false, 'near where the ride ended: hidden');
  assert.equal(showsWayBack(null, at(60, 0)), false);
  assert.equal(showsWayBack(s, null), false, 'no position yet');
});

test('DW9: the way back to where the ride ended never follows the ride', { todo: 'test first' }, async () => {
  const { landingOf } = await wayBack();
  const pts = trip([{ v: WALK, s: 150 }, { v: CAR, s: 180 }, { v: WALK, s: 200, north: true }]);
  const tr = readTrace(pts, 0);
  const landing = landingOf(tr, false)!;
  const here = p(pts.at(-1)!);
  const src = traceRouteSource(pts, [], 0);
  const route = src.route(here, landing);
  assert.ok(route, 'a way back to where the ride ended');
  const ride = tr.rides[0].fixes;
  const rideMid = p(ride[Math.floor(ride.length / 2)]);
  assert.ok(route!.path.every((q: LngLat) => distanceM(q, rideMid) > 500), 'never along the drive');
  assert.ok(route!.lengthM < 200 * WALK + 60, `the walk back only: ${route!.lengthM} m`);
  assert.equal(src.route(here, p(tr.walked[0])), null, 'the start is across the drive: no walking way back there');
});

test('DW10: where the ride ended moves with RIDE_RULES, read from the trace', { todo: 'test first' }, async () => {
  const { landingOf } = await wayBack();
  // A bike at 5 m/s is under RIDE_RULES.speed (7 m/s): not a ride, so there is no landing and the target is the start.
  const bike = readTrace(trip([{ v: WALK, s: 60 }, { v: BIKE, s: 180 }, { v: WALK, s: 60 }]), 0);
  assert.equal(bike.rides.length, 0);
  assert.equal(landingOf(bike, false), null);
  // The same walk with a drive: a landing, from the same reading of the trace.
  const car = readTrace(trip([{ v: WALK, s: 60 }, { v: CAR, s: 180 }, { v: WALK, s: 60 }]), 0);
  assert.ok(landingOf(car, false));
});
