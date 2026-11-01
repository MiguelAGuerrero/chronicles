/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, lineLengthM } from '../geo';
import { liveRuns, readTrace, traceDistances } from '../rides';
import type { LngLat, TracePoint } from '../types';

// Motion (MO8, MO9): still spells, told by the sensors, are kept with the walk
// like pauses. Reading a trace holds walked fixes inside one at a single spot,
// however short; a ride is never cut by one.

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const fix = (s: number, x: number, y: number, acc = 10): TracePoint => {
  const [lon, lat] = at(x, y);
  return { walk_id: 'w', t: s * 1000, lon, lat, accuracy_m: acc, speed: null, course: null };
};

test('still 1: a 40 s still spell holds the drawn line at one spot, and adds no distance', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 30; s++) pts.push(fix(s, 1.4 * s, 0, 5));
  // Standing 40 s, the fixes drifting round a 20 m loop at 3 m/s: wider than their 10 m
  // accuracy and slow enough for the speed gate, as indoor drift is.
  for (let s = 31; s <= 70; s++) pts.push(fix(s, 42 + 20 * Math.sin((s - 31) * 0.15), 20 - 20 * Math.cos((s - 31) * 0.15), 10));
  for (let s = 71; s <= 100; s++) pts.push(fix(s, 42 + 1.4 * (s - 70), 0, 5));
  const stills = [{ started_at: 31_000, ended_at: 70_000 }];
  const plain = readTrace(pts, 0, []);
  const held = readTrace(pts, 0, [], stills);
  const inside = held.walked.filter((p) => p.t >= 31_000 && p.t <= 70_000);
  assert.ok(inside.length <= 2, `${inside.length} points drawn while still`);
  const spots = new Set(inside.map((p) => `${p.lon},${p.lat}`));
  assert.equal(spots.size, 1, 'one spot');
  assert.ok(traceDistances(held).walkedM < traceDistances(plain).walkedM - 50, 'the wander adds nothing');
  assert.ok(Math.abs(traceDistances(held).walkedM - 84) < 25, `walked ${traceDistances(held).walkedM.toFixed(0)} m of 84`);
  assert.ok(lineLengthM(liveRuns(held).flat()) < lineLengthM(liveRuns(plain).flat()));
});

test('still 2: an open still spell (standing now) holds the fixes since it began', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 20; s++) pts.push(fix(s, 1.4 * s, 0, 5));
  for (let s = 21; s <= 40; s++) pts.push(fix(s, 28 + 15 * Math.sin(s), 15 * Math.cos(s * 1.3), 10));
  const held = readTrace(pts, 0, [], [{ started_at: 21_000, ended_at: null }]);
  const inside = held.walked.filter((p) => p.t >= 21_000);
  assert.equal(new Set(inside.map((p) => `${p.lon},${p.lat}`)).size, 1);
});

test('still 3: a ride inside a still spell stays a ride', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 60; s++) pts.push({ ...fix(s, 1.4 * s, 0, 8), speed: 1.4 });
  for (let s = 61; s <= 240; s++) pts.push({ ...fix(s, 84 + 12 * (s - 60), 0, 8), speed: 12 });
  for (let s = 241; s <= 300; s++) pts.push({ ...fix(s, 84 + 12 * 180 + 1.4 * (s - 240), 0, 8), speed: 1.4 });
  // Sitting on the bus, the sensors said still the whole way.
  const tr = readTrace(pts, 0, [], [{ started_at: 61_000, ended_at: 240_000 }]);
  assert.equal(tr.rides.length, 1);
  assert.ok(traceDistances(tr).rideM > 2000);
  const end = tr.walked.at(-1)!;
  assert.ok(distanceM([end.lon, end.lat], at(84 + 12 * 180 + 1.4 * 60, 0)) < 15, 'the walk after the ride is where it was');
});

test('still 4: without still spells, reading is unchanged', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 60; s++) pts.push(fix(s, 1.4 * s, 0, 5));
  assert.deepEqual(readTrace(pts, 0, [], []), readTrace(pts, 0, []));
});
