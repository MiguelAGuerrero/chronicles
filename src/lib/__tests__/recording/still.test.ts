/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, lineLengthM } from '../../geo';
import { liveRuns, readTrace, traceDistances } from '../../rides';
import type { LngLat, TracePoint } from '../../types';

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

test('still 3 (MO9): a ride inside a still spell stays a ride', () => {
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

// The motion audit (Nov 1): regression tests written before the fixes.

test('motion audit 1: a still spell spanning a ride never joins the two sides into a walked line', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 60; s++) pts.push({ ...fix(s, 1.4 * s, 0, 8), speed: 1.4 });
  for (let s = 61; s <= 120; s++) pts.push({ ...fix(s, 84, 0, 8), speed: 0 }); // waiting at the stop
  for (let s = 121; s <= 300; s++) pts.push({ ...fix(s, 84 + 12 * (s - 120), 0, 8), speed: 12 });
  for (let s = 301; s <= 320; s++) pts.push({ ...fix(s, 84 + 2160, 0, 8), speed: 0 });
  for (let s = 321; s <= 380; s++) pts.push({ ...fix(s, 2244 + 1.4 * (s - 320), 0, 8), speed: 1.4 });
  // Still from the stop, all through the ride, to the far stop.
  const tr = readTrace(pts, 0, [], [{ started_at: 61_000, ended_at: 320_000 }]);
  assert.equal(tr.rides.length, 1);
  const walked = traceDistances(tr).walkedM;
  assert.ok(walked < 250, `walked ${walked.toFixed(0)} m: only the two walks, about 168 m`);
});

test('motion audit 2: a still spell left open (a reload) holds nothing once the walker clearly walks away', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 400; s++) pts.push(fix(s, 1.4 * s, 0, 8));
  const tr = readTrace(pts, 0, [], [{ started_at: 60_000, ended_at: null }]);
  const walked = traceDistances(tr).walkedM;
  assert.ok(walked > 500, `walked ${walked.toFixed(0)} m of 560`);
});

test('motion audit 3: a bike ride the sensors call still (no steps) keeps its distance', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 300; s++) pts.push(fix(s, 5 * s, 0, 8));
  const tr = readTrace(pts, 0, [], [{ started_at: 0, ended_at: 300_000 }]);
  const walked = traceDistances(tr).walkedM;
  assert.ok(walked > 1300, `walked ${walked.toFixed(0)} m of 1500`);
});

test('motion audit 3b: inside a spell, one fix far off is still held, not drawn out to', () => {
  const pts: TracePoint[] = [];
  for (let s = 0; s <= 30; s++) pts.push(fix(s, 1.4 * s, 0, 5));
  for (let s = 31; s <= 60; s++) pts.push(fix(s, 42 + (s === 45 ? 60 : 3 * Math.sin(s)), 3 * Math.cos(s), 8));
  const tr = readTrace(pts, 0, [], [{ started_at: 31_000, ended_at: 60_000 }]);
  assert.ok(tr.walked.every((p) => distanceM([p.lon, p.lat], at(102, 0)) > 30), 'the lone far fix is not drawn');
});

// Out and back (Nov 2): the tabs e2e walked 200 m out and straight back along the same street, and
// the standstill reading took bins 100 m and more away as "GPS jumps" it could ride out, so the
// two passes past one spot read as a two-minute stay and the middle of the walk vanished.
test('out and back: walking away along a street and straight back is never a standstill', async () => {
  const { dwellsOf, smoothDwells } = await import('../../geo');
  const pts: TracePoint[] = [];
  let s = 0;
  const legs: [number, number][] = [[100, 0], [100, 100], [200, 100], [100, 100], [100, 0], [0, 0]];
  let [x, y] = [0, 0];
  pts.push(fix(s, x, y, 6));
  for (const [tx, ty] of legs) {
    while (Math.hypot(tx - x, ty - y) > 0.1) {
      const d = Math.min(5, Math.hypot(tx - x, ty - y));
      const k = d / Math.hypot(tx - x, ty - y);
      x += (tx - x) * k;
      y += (ty - y) * k;
      s += 1;
      pts.push(fix(s, x, y, 6));
    }
  }
  assert.equal(dwellsOf(pts).length, 0, 'no stay');
  assert.ok(lineLengthM(smoothDwells(pts).map((p) => [p.lon, p.lat] as LngLat)) > 550, 'the whole walk is drawn');
});

test('out and back: the tabs e2e walk itself (a pause, a few waits) keeps its middle', async () => {
  const { dwellsOf } = await import('../../geo');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const fx = JSON.parse(readFileSync(join(__dirname, 'outAndBack.json'), 'utf8')) as { points: Omit<TracePoint, 'walk_id'>[]; pauses: { started_at: number; ended_at: number | null }[] };
  const pts = fx.points.map((p) => ({ ...p, walk_id: 'w' }) as TracePoint);
  const tr = readTrace(pts, 0, fx.pauses);
  assert.equal(dwellsOf(tr.walked).length, 0, `no stay: ${JSON.stringify(dwellsOf(tr.walked).map((d) => [d.t0 / 1000, d.t1 / 1000]))}`);
  assert.ok(traceDistances(tr).walkedM > 500, `walked ${traceDistances(tr).walkedM.toFixed(0)} m`);
});
