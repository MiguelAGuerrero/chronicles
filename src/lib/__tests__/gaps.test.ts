/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundsOf, distanceM, splitAtGaps, stepToward, traceDistanceM, smoothDwells, type Bounds } from '../geo';
import { fillsOf, GAP_RULES, gapsOf, inferGap, readBounds, stretchesFor, stretchLines } from '../gaps/infer';
import { readTrace, traceDistances } from '../rides';
import { snap } from '../snapper';
import { deriveSegments, type RoadFeature } from '../streets';
import type { GapDecision, LngLat, StreetSegment, TracePoint } from '../types';

// Filling gaps (the concept doc's "Filling gaps" tab, G1-G14), written from
// the criteria before the code. Streets are in-memory; nothing is read.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: props });

/** Fixes along a path at 1.4 m/s, one every 5 s, from t0. */
function walk(path: LngLat[], t0 = 0): TracePoint[] {
  const pts: TracePoint[] = [{ walk_id: 'w', t: t0, lon: path[0][0], lat: path[0][1], accuracy_m: 8, speed: 1.4, course: null }];
  let pos = path[0];
  let t = t0;
  for (const target of path.slice(1)) {
    while (distanceM(pos, target) > 0.1) {
      pos = stepToward(pos, target, 7);
      t += 5000;
      pts.push({ walk_id: 'w', t, lon: pos[0], lat: pos[1], accuracy_m: 8, speed: 1.4, course: null });
    }
  }
  return pts;
}

/** Walks `before`, loses the GPS for `gapS` seconds, then walks `after`. */
function withGap(before: LngLat[], after: LngLat[], gapS: number): TracePoint[] {
  const a = walk(before);
  const b = walk(after, a[a.length - 1].t + gapS * 1000);
  return [...a, ...b];
}

const everywhere = (segs: StreetSegment[]): Bounds => boundsOf(segs.flatMap((s) => s.geometry.flat()), 3000)!;

// A 100 m grid, 8 blocks each way: Street y runs east, Avenue x runs north.
const grid = deriveSegments([
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((y) => road([at(0, y), at(8, y)], { class: 'minor', name: `Street ${y}` })),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((x) => road([at(x, 0), at(x, 8)], { class: 'minor', name: `Avenue ${x}` })),
]);

// A long Main Street with its only parallel 300 m away, joined at the two ends.
const corridor = deriveSegments([
  road([at(0, 0), at(12, 0)], { class: 'minor', name: 'Main Street' }),
  road([at(0, 3), at(12, 3)], { class: 'minor', name: 'Back Street' }),
  road([at(0, 0), at(0, 3)], { class: 'minor', name: 'West Lane' }),
  road([at(12, 0), at(12, 3)], { class: 'minor', name: 'East Lane' }),
]);

function only(points: TracePoint[], segs: StreetSegment[], coverage: Bounds | null = everywhere(segs)) {
  const tr = readTrace(points, 0);
  const gaps = gapsOf(tr);
  assert.equal(gaps.length, 1, 'one gap');
  return inferGap(gaps[0], segs, coverage);
}

test('gaps: a minute without fixes, 40 m or more apart and at most 30 min, is a gap (G1)', () => {
  const tr = readTrace(withGap([at(1.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 300), 0);
  const gaps = gapsOf(tr);
  assert.equal(gaps.length, 1);
  assert.ok(gaps[0].t1 - gaps[0].t0 >= 300_000);
  assert.ok(distanceM(gaps[0].from, at(2, 0)) < 2 && distanceM(gaps[0].to, at(6, 0)) < 2, 'from the last fix to the next');
});

test('gaps: short, close, long, paused or ridden breaks are not gaps (G1)', () => {
  // Fixes 50 s apart: no break at all.
  assert.equal(gapsOf(readTrace(withGap([at(0, 0), at(1, 0)], [at(1.2, 0), at(2, 0)], 50), 0)).length, 0, 'under a minute');
  // Back within 30 m of where it stopped.
  assert.equal(gapsOf(readTrace(withGap([at(0, 0), at(1, 0)], [at(1.3, 0), at(2, 0)], 300), 0)).length, 0, 'under 40 m apart');
  // 31 minutes out.
  assert.equal(gapsOf(readTrace(withGap([at(0, 0), at(1, 0)], [at(5, 0), at(6, 0)], 31 * 60), 0)).length, 0, 'over 30 min');
  // A pause across it: you said you stopped.
  const pts = withGap([at(0, 0), at(1, 0)], [at(5, 0), at(6, 0)], 300);
  const lastBefore = pts.find((p, i) => pts[i + 1] && pts[i + 1].t - p.t > 60_000)!;
  const pause = { started_at: lastBefore.t + 1000, ended_at: lastBefore.t + 200_000 };
  assert.equal(gapsOf(readTrace(pts, 0, [pause])).length, 0, 'a pause between');
});

test('gaps: a gap beside a ride is not filled on foot (G1)', () => {
  // Walk, then a bus at 12 m/s for 2 min, then the GPS out for 2 min, then walking.
  const a = walk([at(0, 0), at(1, 0)]);
  let t = a[a.length - 1].t;
  const bus: TracePoint[] = [];
  for (let k = 1; k <= 24; k++) {
    t += 5000;
    const p = stepToward(at(1, 0), at(20, 0), k * 60);
    bus.push({ walk_id: 'w', t, lon: p[0], lat: p[1], accuracy_m: 8, speed: 12, course: null });
  }
  const end = bus[bus.length - 1];
  const b = walk([[end.lon, end.lat], at(17, 1)], t + 120_000);
  const tr = readTrace([...a, ...bus, ...b], 0);
  assert.ok(tr.rides.length === 1, 'the bus is a ride');
  assert.equal(gapsOf(tr).length, 0);
});

test('gaps: the likely way is the shortest walk over the streets, joined at each end (G2)', () => {
  const inf = only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 300), corridor)!;
  assert.ok(inf, 'a stretch');
  assert.ok(Math.abs(inf.lengthM - 400) < 15, `about 400 m, got ${Math.round(inf.lengthM)}`);
  assert.ok(distanceM(inf.path[0], at(2, 0)) < 2, 'starts at the last fix');
  assert.ok(distanceM(inf.path[inf.path.length - 1], at(6, 0)) < 2, 'ends at the next fix');
  assert.equal(inf.street, 'Main Street');
});

test('gaps: an end with no street within 40 m, or no way between, fills nothing (G2)', () => {
  // A park 200 m north of Main Street, then back on it.
  assert.equal(only(withGap([at(1, 2), at(2, 2)], [at(6, 0), at(7, 0)], 400), corridor.filter((s) => s.name !== 'Back Street')), null, 'no street at one end');
  // Two streets that never meet.
  const apart = deriveSegments([
    road([at(0, 0), at(4, 0)], { class: 'minor', name: 'North Road' }),
    road([at(5, 0), at(9, 0)], { class: 'minor', name: 'South Road' }),
  ]);
  assert.equal(only(withGap([at(1, 0), at(3, 0)], [at(6, 0), at(7, 0)], 300), apart), null, 'no way between');
});

test('gaps: a way that needs more than 2.5 m/s was not walked (G3)', () => {
  // 400 m in 100 s is 4 m/s: a taxi with the app closed.
  assert.equal(only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 100), corridor), null);
  // The same at 2 m/s is walking briskly.
  assert.ok(only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 200), corridor));
});

test('gaps: a long street with nowhere else to have been fills by itself (G4, G5)', () => {
  const inf = only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 300), corridor)!;
  assert.equal(inf.level, 'auto');
  assert.ok(inf.certainTime! >= GAP_RULES.auto, `certain ${inf.certainTime}`);
  // Even slowly: Back Street is 600 m out of the way, more than 10 min allows at 1.4 m/s.
  const slow = only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 600), corridor)!;
  assert.equal(slow.level, 'auto');
});

test('gaps: a street in a grid fills by itself only when the time leaves no room to go round (G4-G6)', () => {
  // 400 m along Street 2 in 5 min: going round a block adds 200 m, more than the time allows.
  const quick = only(withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 300), grid)!;
  assert.equal(quick.level, 'auto', `quick: ${quick.certainTime}`);
  // The same in 10 min: there was time to go round a block, so it is only offered.
  const slow = only(withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 600), grid)!;
  assert.equal(slow.level, 'offer', `slow: time ${slow.certainTime}, direct ${slow.certainDirect}`);
  assert.ok(slow.certainDirect >= GAP_RULES.offer);
});

test('gaps: across a grid, where many ways are as short, nothing is filled (G7)', () => {
  assert.equal(only(withGap([at(0.5, 1), at(1.5, 1)], [at(5, 4.5), at(5, 5.5)], 400), grid), null);
});

test('gaps: streets not read around the gap fill nothing by themselves (G8)', () => {
  const pts = withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 300);
  assert.equal(only(pts, corridor, null), null, 'nothing read');
  // Only the two ends read: the ways around can't be ruled out.
  const ends = boundsOf([at(2, 0), at(6, 0)], 50)!;
  assert.equal(only(pts, corridor, ends), null, 'only the ends read');
  // What to read covers the time budget around the gap.
  const tr = readTrace(pts, 0);
  const want = readBounds(gapsOf(tr)[0]);
  const inside = (b: Bounds, p: LngLat) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
  assert.ok(inside(want, at(4, 2)) && inside(want, at(4, -2)), 'reaches 200 m either side of the middle');
  assert.ok(only(pts, corridor, want), 'and that is enough');
});

test('gaps: kept and dismissed stretches stand over what is inferred (G10)', () => {
  const pts = withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 600);
  const tr = readTrace(pts, 0);
  const gaps = gapsOf(tr);
  const inf = inferGap(gaps[0], grid, everywhere(grid))!;
  assert.equal(stretchesFor(gaps, [inf], [])[0].how, 'offer');
  const kept: GapDecision = { walk_id: 'w', t0: gaps[0].t0 + 3000, t1: gaps[0].t1 - 2000, state: 'kept', path: inf.path, length_m: inf.lengthM, street: null, decided_at: 1 };
  const k = stretchesFor(gaps, [inf], [kept]);
  assert.equal(k[0].how, 'kept', 'kept, matched across a few seconds of drift');
  // Kept stands with nothing inferred (offline).
  assert.equal(stretchesFor(gaps, [], [kept])[0].how, 'kept');
  // Dismissed hides even one that would fill by itself.
  const quick = readTrace(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 300), 0);
  const qg = gapsOf(quick);
  const auto = inferGap(qg[0], corridor, everywhere(corridor))!;
  assert.equal(auto.level, 'auto');
  const no: GapDecision = { walk_id: 'w', t0: qg[0].t0, t1: qg[0].t1, state: 'dismissed', path: auto.path, length_m: auto.lengthM, street: null, decided_at: 1 };
  assert.equal(stretchesFor(qg, [auto], [no]).length, 0);
  // Only filled and kept stretches are walked; an offer is not.
  assert.equal(fillsOf(stretchesFor(gaps, [inf], [])).length, 0);
  assert.equal(fillsOf(k).length, 1);
});

test('gaps: a filled stretch is walked trace: one line, its distance, its streets (G11)', () => {
  const pts = withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 300);
  const plain = readTrace(pts, 0);
  const gaps = gapsOf(plain);
  const inf = inferGap(gaps[0], grid, everywhere(grid))!;
  const fills = fillsOf(stretchesFor(gaps, [inf], []));
  assert.equal(fills.length, 1);
  const filled = readTrace(pts, 0, [], [], fills);
  assert.equal(splitAtGaps(plain.walked, 60_000, plain.breaks).length, 2, 'a break before');
  assert.equal(splitAtGaps(filled.walked, 60_000, filled.breaks).length, 1, 'one line after');
  const before = traceDistances(plain).walkedM;
  const after = traceDistances(filled).walkedM;
  assert.ok(Math.abs(after - before - 400) < 25, `the stretch's 400 m added, got ${Math.round(after - before)}`);
  // Spread evenly over the gap, never held as a standstill however slow.
  const inside = filled.walked.filter((p) => p.t > gaps[0].t0 && p.t < gaps[0].t1);
  assert.ok(inside.length >= 20, 'points along it');
  assert.ok(traceDistanceM(smoothDwells(filled.walked)) > before + 375, 'not smoothed into a stay');
  // Streets along it are walked.
  const without = new Set(snap('w', pts, grid, 0).map((v) => v.segment_id));
  const withFill = snap('w', pts, grid, 0, [], [], fills);
  const street2 = (id: string) => grid.find((s) => s.id === id)?.name === 'Street 2';
  assert.ok(withFill.filter((v) => street2(v.segment_id) && !without.has(v.segment_id)).length >= 3, 'Street 2 credited along the stretch');
});

test('gaps: a slow stretch is never read as a standstill (G11)', () => {
  // 100 m in 25 min: walked at a walking pace somewhere in there.
  const pts = withGap([at(0.5, 0), at(1, 0)], [at(2, 0), at(2.5, 0)], 25 * 60);
  const plain = readTrace(pts, 0);
  const g = gapsOf(plain);
  const inf = inferGap(g[0], corridor, everywhere(corridor));
  assert.ok(inf, 'a stretch');
  const filled = readTrace(pts, 0, [], [], [{ t0: g[0].t0, t1: g[0].t1, path: inf!.path }]);
  const smoothed = smoothDwells(filled.walked);
  assert.ok(traceDistanceM(smoothed) > traceDistanceM(smoothDwells(plain.walked)) + 90, 'the 100 m stays');
  for (let i = 1; i < filled.walked.length; i++) assert.ok(filled.walked[i].t - filled.walked[i - 1].t <= 60_000, 'no break inside');
});

test('gaps: a kept line that no longer meets a gap is left out (G10, G11)', () => {
  const pts = walk([at(0, 0), at(5, 0)]);
  const tr = readTrace(pts, 0, [], [], [{ t0: pts[3].t, t1: pts[20].t, path: [at(0, 1), at(5, 1)] }]);
  assert.equal(tr.walked.length, readTrace(pts, 0).walked.length, 'fixes inside it: nothing added');
});

test('gaps: the card says what a stretch is, its length and how long the GPS was out (G9)', () => {
  const base = { t0: 0, t1: 6 * 60_000, path: [at(0, 0), at(4, 0)], lengthM: 400, street: 'Elm Street' };
  assert.deepEqual(stretchLines({ ...base, how: 'offer' }), { title: 'Probably along Elm Street', sub: '400 m · no GPS for 6 min. Keep it to count it as walked.' });
  assert.equal(stretchLines({ ...base, how: 'auto' }).title, 'Filled in along Elm Street');
  assert.equal(stretchLines({ ...base, how: 'kept', street: null, lengthM: 1250 }).title, 'Kept this way');
  assert.equal(stretchLines({ ...base, how: 'kept', lengthM: 1250 }).sub, '1.3 km · no GPS for 6 min.');
});
