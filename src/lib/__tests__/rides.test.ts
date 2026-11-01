/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignAreas } from '../areas/assign';
import { AREA_REACH_M } from '../areas/rules';
import type { BoundarySource, PlaceCandidate } from '../areas/types';
import { distanceM, filterFixes, isBreak, positionAt } from '../geo';
import { traceRouteSource } from '../nav/traceRoute';
import { PATH_MS, schedule, walkTimeAt } from '../replay';
import { keptFixes, readTrace, rideRuns, ridingAt, RIDE_RULES, traceDistances } from '../rides';
import { snap } from '../snapper';
import type { Capture, LngLat, StreetSegment, TracePoint } from '../types';

// Rides (the concept doc's "Rides" tab, R1-R14), written before the code.
// A walk can include a trolley, bus or train: drawn dashed, counted for
// places, never for streets or walked distance.

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

interface Leg {
  /** Speed east, m/s. */
  v: number;
  /** Seconds. */
  s: number;
  /** Speed north instead of east. */
  north?: boolean;
}

/**
 * One fix a second along these legs, starting at O at t0. `reported` puts the
 * true speed on each fix, as a phone does; without it, speed is null.
 */
function trip(legs: Leg[], o: { t0?: number; reported?: boolean; jitterM?: number; from?: [number, number]; dtMs?: number } = {}): TracePoint[] {
  const dt = o.dtMs ?? 1000;
  let [x, y] = o.from ?? [0, 0];
  let t = o.t0 ?? 0;
  const out: TracePoint[] = [];
  let i = 0;
  const push = (v: number) => {
    const [jx, jy] = wobble(i++, o.jitterM ?? 0);
    const p = at(x + jx, y + jy);
    out.push({ walk_id: 'w', t, lon: p[0], lat: p[1], accuracy_m: 8, speed: o.reported ? v : null, course: null });
  };
  push(legs[0]?.v ?? 0);
  for (const leg of legs) {
    const n = Math.round((leg.s * 1000) / dt);
    for (let k = 0; k < n; k++) {
      if (leg.north) y += (leg.v * dt) / 1000;
      else x += (leg.v * dt) / 1000;
      t += dt;
      push(leg.v);
    }
  }
  return out;
}

const WALK = 1.4;
const BUS = 12;

test('rides: a bus between two walks is one ride; both walks stay walked (R1)', () => {
  const pts = trip([{ v: WALK, s: 120 }, { v: BUS, s: 300 }, { v: WALK, s: 120 }], { reported: true });
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 1);
  const r = tr.rides[0];
  // From the first fast fix to the last, within a few seconds.
  assert.ok(Math.abs(r.t0 - 121_000) <= 3000, `ride starts at ${r.t0}`);
  assert.ok(Math.abs(r.t1 - 420_000) <= 3000, `ride ends at ${r.t1}`);
  assert.ok(r.fixes.length >= 290);
  // Walked: both walks, nothing from the bus.
  assert.ok(tr.walked.length >= 230, `walked ${tr.walked.length}`);
  assert.ok(tr.walked.every((p) => p.t < r.t0 || p.t > r.t1));
  const d = traceDistances(tr);
  assert.ok(Math.abs(d.walkedM - 2 * 120 * WALK) < 20, `walked ${d.walkedM}`);
  // The ride's dashed line joins the walk either side: all of the 3.6 km.
  assert.ok(Math.abs(d.rideM - 300 * BUS) < 30, `ride ${d.rideM}`);
});

test('rides: the phone not reporting speed still finds the ride, from fix to fix (R1)', () => {
  const pts = trip([{ v: WALK, s: 120 }, { v: BUS, s: 300 }, { v: WALK, s: 120 }], { jitterM: 2 });
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(Math.abs(tr.rides[0].t0 - 121_000) <= 5000);
});

test('rides: a train at 60 m/s is a ride (R1)', () => {
  const tr = readTrace(trip([{ v: WALK, s: 60 }, { v: 60, s: 120 }, { v: WALK, s: 60 }], { reported: true }), 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(traceDistances(tr).rideM > 7000);
});

test('rides: walking, even briskly with a wobbly GPS, is never a ride (R1)', () => {
  const pts = trip([{ v: 2, s: 600 }], { jitterM: 6 });
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 0);
  // Exactly what the walking filter kept before rides existed.
  assert.deepEqual(tr.walked, filterFixes(pts, 0));
});

test('rides: a single jump is dropped as before, and makes no ride (R2)', () => {
  const pts = trip([{ v: WALK, s: 200 }], { reported: true });
  const j = pts[100];
  const off = at(400, 0);
  pts[100] = { ...j, lon: off[0], lat: off[1] };
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 0);
  assert.ok(!tr.walked.some((p) => p.t === j.t));
  assert.equal(tr.walked.length, pts.length - 1);
});

test('rides: a fast burst shorter than 20 s downtown is no ride (R2)', () => {
  // 15 s drifting at 15 m/s, then snapping back: multipath, not a bus.
  const pts = [...trip([{ v: WALK, s: 100 }]), ...trip([{ v: 15, s: 15 }], { t0: 101_000, from: [140, 0] }).slice(0, 15), ...trip([{ v: WALK, s: 100 }], { t0: 116_000, from: [142, 0] })];
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 0);
});

test('rides: inside a ride, a fix faster than 70 m/s from the last is a jump (R2)', () => {
  const pts = trip([{ v: WALK, s: 60 }, { v: BUS, s: 200 }, { v: WALK, s: 60 }], { reported: true });
  const k = 160;
  const off = at(5000, 3000);
  const bad = { ...pts[k], lon: off[0], lat: off[1] };
  pts[k] = bad;
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(!tr.rides[0].fixes.some((p) => p.t === bad.t));
  assert.ok(traceDistances(tr).rideM < 200 * BUS + 100);
});

test('rides: a minute stopped at a light is still one ride (R3)', () => {
  const tr = readTrace(trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: 0, s: 60 }, { v: BUS, s: 120 }, { v: WALK, s: 60 }], { reported: true }), 0);
  assert.equal(tr.rides.length, 1);
  // The stop is part of the ride: none of it is walked.
  assert.ok(!tr.walked.some((p) => p.t > 200_000 && p.t < 240_000));
});

test('rides: a bus crawling through traffic stays one ride, crediting no streets (R3, R7)', () => {
  const legs: Leg[] = [{ v: WALK, s: 60 }];
  for (let k = 0; k < 4; k++) legs.push({ v: BUS, s: 40 }, { v: 4.5, s: 120 });
  legs.push({ v: BUS, s: 40 }, { v: WALK, s: 60 });
  const tr = readTrace(trip(legs, { reported: true }), 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(!tr.walked.some((p) => p.t > 70_000 && p.t < 60_000 + 4 * 160_000 + 30_000));
});

test('rides: two buses with a walk of 4 minutes between are two rides (R3)', () => {
  const tr = readTrace(trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: WALK, s: 240 }, { v: BUS, s: 120 }, { v: WALK, s: 60 }], { reported: true }), 0);
  assert.equal(tr.rides.length, 2);
  // The walk between them is walked.
  assert.ok(tr.walked.filter((p) => p.t > 190_000 && p.t < 410_000).length > 200);
});

test('rides: a pause ends a ride, and nothing inside the pause is kept (R3)', () => {
  const pts = trip([{ v: WALK, s: 60 }, { v: BUS, s: 300 }, { v: WALK, s: 60 }], { reported: true });
  const pauses = [{ started_at: 200_000, ended_at: 230_000 }];
  const tr = readTrace(pts, 0, pauses);
  assert.equal(tr.rides.length, 2);
  assert.ok(keptFixes(tr).every((p) => p.t < 200_000 || p.t > 230_000));
});

test('rides: a ride is a break in the walked trace, however short (R7)', () => {
  const pts = trip([{ v: WALK, s: 60 }, { v: BUS, s: 35 }, { v: WALK, s: 60 }], { reported: true });
  const tr = readTrace(pts, 0);
  assert.equal(tr.rides.length, 1);
  const before = tr.walked.filter((p) => p.t < tr.rides[0].t0).at(-1)!;
  const after = tr.walked.find((p) => p.t > tr.rides[0].t1)!;
  assert.ok(isBreak(before, after, tr.breaks));
  // Under 60 s apart: only the ride breaks it.
  assert.ok(after.t - before.t < 60_000);
});

test('rides: the dashed line runs from the last walked fix to the next one (R5)', () => {
  const tr = readTrace(trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: WALK, s: 60 }], { reported: true }), 0);
  const runs = rideRuns(tr);
  assert.equal(runs.length, 1);
  const last = tr.walked.filter((p) => p.t < tr.rides[0].t0).at(-1)!;
  const next = tr.walked.find((p) => p.t > tr.rides[0].t1)!;
  assert.deepEqual(runs[0][0], [last.lon, last.lat]);
  assert.deepEqual(runs[0].at(-1), [next.lon, next.lat]);
});

test('rides: a ride shows within 30 s of starting, from where it started (R1)', () => {
  const pts = trip([{ v: WALK, s: 120 }, { v: BUS, s: 300 }], { reported: true });
  const live = pts.filter((p) => p.t <= 121_000 + 30_000);
  const tr = readTrace(live, 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(Math.abs(tr.rides[0].t0 - 121_000) <= 3000);
});

test('rides: an old walk shows its ride from its raw fixes (R4)', () => {
  // Nothing about a walk is stored but its raw fixes: reading them again is enough.
  const pts = trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: WALK, s: 60 }], { reported: true });
  assert.equal(readTrace(pts, 0).rides.length, 1);
  assert.equal(readTrace([...pts].reverse(), 0).rides.length, 1, 'order of the stored rows does not matter');
});

test('rides: "on a ride" holds through a stop, and ends once you walk off (R11)', () => {
  const ride = trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: 0, s: 90 }], { reported: true });
  const tr = readTrace(ride, 0);
  const here: LngLat = [ride.at(-1)!.lon, ride.at(-1)!.lat];
  assert.equal(ridingAt(tr, here, ride.at(-1)!.t), true, 'stopped 90 s');
  const walkedOff = [...ride, ...trip([{ v: WALK, s: 150 }], { t0: ride.at(-1)!.t + 1000, from: [60 * WALK + 120 * BUS, 0], reported: true }).map((p) => ({ ...p }))];
  const tr2 = readTrace(walkedOff, 0);
  const end = walkedOff.at(-1)!;
  assert.equal(ridingAt(tr2, [end.lon, end.lat], end.t), false, 'walked 200 m away');
  assert.equal(ridingAt(readTrace(trip([{ v: WALK, s: 300 }]), 0), here, 300_000), false);
});

test('rides: weak GPS is judged on fixes inside the accuracy gate, not the speed gate (R11)', () => {
  const pts = trip([{ v: WALK, s: 30 }, { v: BUS, s: 15 }], { reported: true });
  const tr = readTrace(pts, 0);
  // Still deciding whether it's a ride: the fast fixes are not kept yet, but the GPS is fine.
  assert.equal(tr.lastGoodAt, pts.at(-1)!.t);
  const poor = readTrace(pts.map((p) => (p.t > 30_000 ? { ...p, accuracy_m: 200 } : p)), 0);
  assert.equal(poor.lastGoodAt, 30_000);
});

// ---- What a ride counts for -------------------------------------------------

/** A straight named street east from O, cut into 100 m pieces. */
function street(lengthM: number): StreetSegment[] {
  const segs: StreetSegment[] = [];
  for (let x = 0; x < lengthM; x += 100) {
    segs.push({ id: `s${x / 100}`, name: 'Long St', kind_detail: 'residential', length_m: 100, geometry: [[at(x, 0), at(x + 100, 0)]], build: 'b' });
  }
  return segs;
}

test('rides: a ride along a street credits none of it; the walks either side do (R7)', () => {
  const legs: Leg[] = [{ v: WALK, s: 150 }];
  for (let k = 0; k < 3; k++) legs.push({ v: BUS, s: 40 }, { v: 4.5, s: 100 });
  legs.push({ v: BUS, s: 40 }, { v: WALK, s: 150 });
  const pts = trip(legs, { reported: true });
  const len = 150 * WALK * 2 + 4 * 40 * BUS + 3 * 100 * 4.5 + 200;
  const visited = new Set(snap('w', pts, street(len), 0, []).map((v) => v.segment_id));
  const tr = readTrace(pts, 0);
  const r = tr.rides[0];
  const xOf = (t: number) => {
    const p = positionAt(pts, t)!;
    return distanceM(O, [p[0], O[1]]);
  };
  const rideFrom = Math.ceil(xOf(r.t0) / 100) + 1;
  const rideTo = Math.floor(xOf(r.t1) / 100) - 1;
  for (let k = rideFrom; k < rideTo; k++) assert.ok(!visited.has(`s${k}`), `s${k} was ridden, not walked`);
  assert.ok(visited.has('s0') || visited.has('s1'), 'the first walk counts');
});

const TOWN_A = at(0, 200);
const TOWN_B = at(4000, 200);
const places: PlaceCandidate[] = [
  { level: 'neighborhood', name: 'Fox Point', at: TOWN_A, reachM: AREA_REACH_M.neighborhood },
  { level: 'neighborhood', name: 'Downcity', at: TOWN_B, reachM: AREA_REACH_M.neighborhood },
  { level: 'town', name: 'Providence', at: at(2000, 0), reachM: AREA_REACH_M.town },
];
const oneState: BoundarySource = {
  id: 'test-1',
  containing: () => ({ country: { name: 'Testland', code: 'TL', at: O }, state: { name: 'Rhode', code: 'TL-R', at: O } }),
};

test('rides: riding through a neighborhood counts it (R8)', () => {
  // Walk in Fox Point, ride 4 km to Downcity, stop there.
  const pts = trip([{ v: WALK, s: 120 }, { v: BUS, s: 320 }], { reported: true });
  const r = assignAreas('w', pts, [], places, oneState, 0);
  const names = r.rows.map((w) => r.areas.get(w.area_key)!.name);
  assert.ok(names.includes('Fox Point'));
  assert.ok(names.includes('Downcity'), `got ${names.join(', ')}`);
});

test('rides: walk me back never routes along a ride (R13)', () => {
  const pts = trip([{ v: WALK, s: 150 }, { v: BUS, s: 120 }, { v: WALK, s: 150 }], { reported: true });
  const end = pts.at(-1)!;
  const src = traceRouteSource(pts, [], 0);
  assert.equal(src.route([end.lon, end.lat], at(0, 0)), null);
  // Along the walk you are on, it still routes.
  assert.ok(src.route([end.lon, end.lat], [pts.at(-100)!.lon, pts.at(-100)!.lat]));
});

test('rides: a capture on a ride is placed on the ride line (R9)', () => {
  const pts = trip([{ v: WALK, s: 60 }, { v: BUS, s: 120 }, { v: WALK, s: 60 }], { reported: true });
  const tr = readTrace(pts, 0);
  const p = positionAt(keptFixes(tr), 120_000)!;
  // 60 s walking, then 60 s of bus.
  assert.ok(Math.abs(distanceM(O, p) - (60 * WALK + 60 * BUS)) < 15);
});

const capture = (t: number): Capture => ({ id: `c${t}`, walk_id: 'w', t, lat: null, lon: null, kind: 'text', file_path: null, body: 'x', segment_id: null });

test('rides: the replay gives a long ride at most 4 s of the path, and stops at a capture on it (R10)', () => {
  const pts = trip([{ v: WALK, s: 300 }, { v: BUS, s: 1200 }, { v: WALK, s: 300 }], { reported: true });
  const tr = readTrace(pts, 0);
  const fixes = keptFixes(tr);
  const s = schedule(fixes, [capture(900_000)], 0, [], tr.rides);
  const r = tr.rides[0];
  // Path time at the ride's start and end.
  const msAt = (t: number) => ((s.toActive(t) - s.start) / (s.end - s.start)) * PATH_MS;
  const rideMs = msAt(r.t1) - msAt(r.t0);
  assert.ok(rideMs <= RIDE_RULES.replayMs + 1 && rideMs > 1000, `ride takes ${rideMs} ms`);
  // The capture mid-ride stops the path inside the ride's few seconds.
  const stop = s.groups[0].atMs;
  assert.ok(stop > msAt(r.t0) && stop < msAt(r.t1));
  // The dot is on the ride at that moment, near the capture's time.
  assert.ok(Math.abs(walkTimeAt(s, stop) - 900_000) < 2000);
});

test('rides: a short ride keeps its real share of the replay (R10)', () => {
  const pts = trip([{ v: WALK, s: 600 }, { v: BUS, s: 40 }, { v: WALK, s: 600 }], { reported: true });
  const tr = readTrace(pts, 0);
  const s = schedule(keptFixes(tr), [], 0, [], tr.rides);
  const r = tr.rides[0];
  const share = ((s.toActive(r.t1) - s.toActive(r.t0)) / (s.end - s.start)) * PATH_MS;
  const real = ((r.t1 - r.t0) / (pts.at(-1)!.t - pts[0].t)) * PATH_MS;
  assert.ok(Math.abs(share - real) < 50, `${share} vs ${real}`);
});

test('rides: a GPS jump just before boarding stays out of the ride (R2, the e2e card, Nov 1)', () => {
  // No speed from the phone. Walking, a 120 m jump (the fix lands across the street), 4 s still, then the bus.
  const before = trip([{ v: WALK, s: 60 }]);
  const landing = trip([{ v: 0, s: 4 }, { v: BUS, s: 120 }], { t0: 63_000, from: [60 * WALK + 120, 0] });
  const tr = readTrace([...before, ...landing], 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(tr.rides[0].t0 >= 63_000, `the ride starts after the jump (${tr.rides[0].t0})`);
  const { rideM } = traceDistances(tr);
  assert.ok(Math.abs(rideM - 120 * BUS) < 30, `no jog across the jump (${rideM})`);
});

test('rides: hurrying to the stop, then standing, is not part of the ride (R3, the e2e card, Nov 1)', () => {
  // No speed from the phone: a 25 s jog at 5 m/s to the stop, 4 s standing, then the bus.
  const tr = readTrace(trip([{ v: WALK, s: 60 }, { v: 5, s: 25 }, { v: 0, s: 4 }, { v: BUS, s: 120 }]), 0);
  assert.equal(tr.rides.length, 1);
  assert.ok(tr.rides[0].t0 >= 85_000, `the ride starts at the stop, not on the way to it (${tr.rides[0].t0})`);
  assert.ok(Math.abs(traceDistances(tr).rideM - 120 * BUS) < 30);
});
