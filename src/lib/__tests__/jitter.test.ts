/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, filterFixes, lineLengthM } from '../geo';
import { liveRuns, readTrace, traceDistances } from '../rides';
import type { LngLat, TracePoint } from '../types';

// Standing still and the scribble (Nov 1): a phone's screenshot showed the live
// trace as a tangle of spikes while the owner stood in one place. The live map
// drew every gated fix; GPS wandering 20-40 m passes the accuracy (50 m) and
// speed (7 m/s) gates. Fixtures sit well inside one z14 tile (lat 41.812).

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const T0 = 1_700_000_000_000;

/** A seeded random source, so every run sees the same jitter. */
function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  return { u, gauss };
}

interface Gen {
  seconds: number;
  everyMs: number;
  /** Jitter's spread in metres, and how much of it carries from one fix to the next (0: none). */
  sigma: number;
  rho?: number;
  accuracy: number | null;
  /** The true position at time t (seconds): standing at the origin by default. */
  path?: (t: number) => [number, number];
  seed?: number;
}

function fixes({ seconds, everyMs, sigma, rho = 0, accuracy, path = () => [0, 0], seed = 7 }: Gen): TracePoint[] {
  const r = rng(seed);
  const out: TracePoint[] = [];
  let nx = 0;
  let ny = 0;
  const q = Math.sqrt(1 - rho * rho);
  for (let t = 0; t < seconds * 1000; t += everyMs * (0.5 + r.u())) {
    nx = rho * nx + q * sigma * r.gauss();
    ny = rho * ny + q * sigma * r.gauss();
    const [x, y] = path(t / 1000);
    const [lon, lat] = at(x + nx, y + ny);
    out.push({ walk_id: 'w', t: T0 + Math.round(t), lat, lon, accuracy_m: accuracy, speed: null, course: null });
  }
  return out;
}

const line = (ps: TracePoint[]) => lineLengthM(ps.map((p): LngLat => [p.lon, p.lat]));
const runsLength = (runs: LngLat[][]) => runs.reduce((m, r) => m + lineLengthM(r), 0);
const farthest = (ps: TracePoint[]) => Math.max(...ps.map((p) => distanceM(O, [p.lon, p.lat])));

/** An L: 150 m east, then 150 m north, at 1.4 m/s. */
const ell = (t: number): [number, number] => {
  const d = 1.4 * t;
  return d <= 150 ? [d, 0] : [150, Math.min(d - 150, 150)];
};
/** Distance from a point to the L. */
function offEll(p: TracePoint): number {
  const x = (p.lon - O[0]) / mLon;
  const y = (p.lat - O[1]) / mLat;
  const leg1 = Math.hypot(x - Math.max(0, Math.min(150, x)), y);
  const leg2 = Math.hypot(x - 150, y - Math.max(0, Math.min(150, y)));
  return Math.min(leg1, leg2);
}

test('jitter 1: five minutes standing indoors draws no scribble', () => {
  // A fix a second, wandering 15 m around the spot, each reporting ±35 m.
  const tr = readTrace(fixes({ seconds: 300, everyMs: 1000, sigma: 15, accuracy: 35 }), T0);
  assert.ok(line(tr.walked) < 30, `walked trace is ${line(tr.walked).toFixed(0)} m`);
  assert.ok(runsLength(liveRuns(tr)) < 30, `live runs are ${runsLength(liveRuns(tr)).toFixed(0)} m`);
  assert.ok(traceDistances(tr).walkedM < 30);
});

test('jitter 2: the first minute and a half of a stop, before it counts as a standstill, stays calm', () => {
  // Wandering that drifts (each fix carries most of the last one's error), as a phone's does.
  const tr = readTrace(fixes({ seconds: 90, everyMs: 1000, sigma: 20, rho: 0.95, accuracy: 30 }), T0);
  assert.ok(runsLength(liveRuns(tr)) < 60, `live runs are ${runsLength(liveRuns(tr)).toFixed(0)} m`);
});

test('jitter 3: one fix that jumps away and back is not drawn as a spike', () => {
  const still = fixes({ seconds: 120, everyMs: 10_000, sigma: 2, accuracy: 10 });
  // 50 m off, 10 s after its neighbour: 5 m/s, inside the walking speed gate.
  const i = 6;
  const [lon, lat] = at(50, 0);
  still[i] = { ...still[i], lon, lat };
  const tr = readTrace(still, T0);
  assert.ok(farthest(tr.walked) < 20, `farthest drawn fix is ${farthest(tr.walked).toFixed(0)} m away`);
});

test('jitter 4: a real walk keeps its shape, its corner and about its length', () => {
  const tr = readTrace(fixes({ seconds: 300 / 1.4, everyMs: 1000, sigma: 5, rho: 0.95, accuracy: 10, path: ell }), T0);
  const len = line(tr.walked);
  assert.ok(len > 260 && len < 340, `walked ${len.toFixed(0)} m of 300`);
  assert.ok(Math.max(...tr.walked.map(offEll)) <= 15, 'never strays from the path');
  const corner = at(150, 0);
  assert.ok(tr.walked.some((p) => distanceM(corner, [p.lon, p.lat]) <= 15), 'keeps the corner');
  // The end is where the walker is, not left behind.
  const end = tr.walked[tr.walked.length - 1];
  assert.ok(distanceM(at(150, 150), [end.lon, end.lat]) <= 15);
});

test('jitter 5: a walk with poor accuracy keeps its corner', () => {
  const tr = readTrace(fixes({ seconds: 300 / 1.4, everyMs: 3000, sigma: 10, rho: 0.9, accuracy: 25, path: ell }), T0);
  assert.ok(Math.max(...tr.walked.map(offEll)) <= 25);
  assert.ok(tr.walked.some((p) => distanceM(at(150, 0), [p.lon, p.lat]) <= 25), 'keeps the corner');
});

test('jitter 6: fixes without a reported accuracy are read as before', () => {
  const ps = fixes({ seconds: 60, everyMs: 1000, sigma: 3, accuracy: null, path: ell });
  const tr = readTrace(ps, T0);
  // Only the walking filter applies, as before this change.
  assert.deepEqual(tr.walked, filterFixes(ps, T0));
});

test('jitter 7: the live trace holds a standstill still even when accuracy is unknown', () => {
  // Without accuracy the reading can't tell jitter from steps, but a five-minute
  // stay is a standstill all the same, drawn as the replay draws it.
  const tr = readTrace(fixes({ seconds: 300, everyMs: 1000, sigma: 8, accuracy: null }), T0);
  assert.ok(line(tr.walked) > 200, 'the walked trace still holds the jitter');
  assert.ok(runsLength(liveRuns(tr)) < 20, `live runs are ${runsLength(liveRuns(tr)).toFixed(0)} m`);
});
