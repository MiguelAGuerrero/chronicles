/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundsOf, distanceM, splitAtGaps, stepToward, traceDistanceM, smoothDwells, type Bounds } from '../geo';
import { fillsOf, GAP_RULES, gapsOf, inferGap, movingPace, readBounds, stretchAt, stretchesFor, stretchLines } from '../gaps/infer';
import { readTrace, traceDistances, withFilled } from '../rides';
import { tilesNear } from '../tileMath';
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
});

test('gaps: across a grid, where many ways are as short, the likeliest is still offered, never filled (G7)', () => {
  // The owner's call (Nov 3): an uncertain gap is offered faint to keep or dismiss, never left blank.
  const inf = only(withGap([at(0.5, 1), at(1.5, 1)], [at(5, 4.5), at(5, 5.5)], 400), grid)!;
  assert.ok(inf, 'offered');
  assert.equal(inf.level, 'offer');
  assert.ok(inf.certainDirect < GAP_RULES.auto, `uncertain: ${inf.certainDirect}`);
});

test('gaps audit park: a path with a parallel way close by is offered, not left blank (G6, G7)', () => {
  // Lehigh Parkway (Nov 3): 8 min out, 300 m apart along a creek path, a drive running beside it
  // 50 m away and joined at both ends. Nothing showed; the owner followed the path.
  const park = deriveSegments([
    road([at(0, 0), at(3, 0)], { class: 'path', subclass: 'footway' }),
    road([at(0, 0.5), at(3, 0.5)], { class: 'minor', name: 'Park Drive' }),
    road([at(0, 0), at(0, 0.5)], { class: 'path', subclass: 'footway' }),
    road([at(3, 0), at(3, 0.5)], { class: 'path', subclass: 'footway' }),
  ]);
  const inf = only(withGap([at(-0.3, 0), at(0.1, 0)], [at(2.9, 0), at(3.3, 0)], 480), park)!;
  assert.ok(inf, 'offered');
  assert.equal(inf.level, 'offer');
  // Along the path (y = 0), the shorter way, never round by the drive 50 m north.
  assert.ok(inf.path.every((p) => Math.abs(p[1] - O[1]) * 111320 < 15), 'along the path');
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
  assert.deepEqual(stretchLines({ ...base, how: 'offer' }), { title: 'Probably along Elm Street', sub: '400 m · not recorded for 6 min. Keep it to count it as walked.' });
  assert.equal(stretchLines({ ...base, how: 'auto' }).title, 'Filled in along Elm Street');
  assert.equal(stretchLines({ ...base, how: 'kept', street: null, lengthM: 1250 }).title, 'This way, kept');
  assert.equal(stretchLines({ ...base, how: 'kept', lengthM: 1250 }).sub, '1.3 km · not recorded for 6 min.');
});

// After the audit (Nov 3): each accepted finding's regression, `gaps audit N`.

// A 300 m block: Main Street, Back Street 100 m north, joined at both ends.
const block = deriveSegments([
  road([at(0, 0), at(3, 0)], { class: 'minor', name: 'Main Street' }),
  road([at(0, 1), at(3, 1)], { class: 'minor', name: 'Back Street' }),
  road([at(0, 0), at(0, 1)], { class: 'minor', name: 'West Lane' }),
  road([at(3, 0), at(3, 1)], { class: 'minor', name: 'East Lane' }),
]);

test('gaps audit 1: an end piece is certain only if no way leaves it the other way round', () => {
  // 200 m along Main Street in 25 min: round the block the other way is 600 m, well within the time.
  const inf = only(withGap([at(0.2, 0), at(0.5, 0)], [at(2.5, 0), at(2.8, 0)], 25 * 60), block)!;
  assert.ok(inf, 'offered');
  assert.notEqual(inf.level, 'auto', `certain ${inf.certainTime}`);
  // Quickly, there is no time to go round: it fills by itself.
  assert.equal(only(withGap([at(0.2, 0), at(0.5, 0)], [at(2.5, 0), at(2.8, 0)], 150), block)!.level, 'auto');
});

test('gaps audit 3: the time budget allows a brisk walker, not only an average one', () => {
  // 300 m along Street 2 in 5 min; round a block is 500 m, which a brisk 1.7 m/s covers.
  const inf = only(withGap([at(0.5, 2), at(1.5, 2)], [at(4.5, 2), at(5.5, 2)], 300), grid)!;
  assert.equal(inf.level, 'offer', `certain ${inf.certainTime}`);
});

test('gaps audit 4: a decision is about one gap, and only where its line meets the gap', () => {
  const A: LngLat = at(0, 0);
  const M: LngLat = at(2, 0);
  const B: LngLat = at(4, 0);
  const kept: GapDecision = { walk_id: 'w', t0: 0, t1: 600_000, state: 'kept', path: [A, B], length_m: 400, street: null, decided_at: 1 };
  // A rule change accepted a fix M inside the decided gap: two gaps now.
  const split = [{ t0: 0, t1: 450_000, from: A, to: M }, { t0: 450_000, t1: 600_000, from: M, to: B }];
  assert.equal(stretchesFor(split, [], [kept]).length, 0, 'its line meets neither gap');
  // Its own gap, a few seconds off: kept.
  assert.equal(stretchesFor([{ t0: 2000, t1: 598_000, from: A, to: B }], [], [kept]).length, 1);
});

test('gaps audit 8: a tap near either end of a stretch is the trace there, not the stretch', () => {
  const s = { t0: 0, t1: 1, path: [at(0, 0), at(4, 0)], lengthM: 400, street: null, how: 'auto' as const };
  assert.ok(stretchAt([s], at(2, 0.1), 20), 'its middle');
  assert.equal(stretchAt([s], at(0.1, 0), 20), null, 'beside its start');
  assert.equal(stretchAt([s], at(3.9, 0), 20), null, 'beside its end');
});

test('gaps audit 10: an inference for this exact gap wins, and one whose line misses the gap is not used', () => {
  const g = { t0: 0, t1: 300_000, from: at(0, 0), to: at(4, 0) };
  const old = { t0: 0, t1: 290_000, path: [at(0, 0), at(3.5, 0.5)], lengthM: 360, certainDirect: 1, certainTime: 1, street: 'Old', level: 'auto' as const };
  const exact = { ...old, t1: 300_000, path: [at(0, 0), at(4, 0)], lengthM: 400, street: 'New' };
  assert.equal(stretchesFor([g], [old, exact], [])[0].street, 'New');
  assert.equal(stretchesFor([g], [old], []).length, 0, 'the old line ends 50 m off');
});

test('gaps audit 13: a crossing that is mostly the joins to a street is not a street stretch', () => {
  const short = deriveSegments([road([at(0, 0), at(0.6, 0)], { class: 'minor', name: 'Plaza Walk' })]);
  // 35 m off the street at each end, 60 m along it.
  assert.equal(only(withGap([at(0, 0.8), at(0, 0.35)], [at(0.6, 0.35), at(0.6, 0.8)], 120), short), null);
});

test('gaps audit 9: filling a read trace gives what reading it with the fills does', () => {
  const pts = withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 300);
  const plain = readTrace(pts, 0);
  const fills = fillsOf(stretchesFor(gapsOf(plain), [inferGap(gapsOf(plain)[0], grid, everywhere(grid))!], []));
  assert.deepEqual(withFilled(plain, fills).walked, readTrace(pts, 0, [], [], fills).walked);
});

test('gaps audit 6: a snap read in code takes the tiles along the walk, at most a capped number', () => {
  // Walked bits at both ends of a 15 km ride: not every tile in the box.
  const trace = [...walk([at(0, 0), at(2, 0)]), ...walk([at(150, 0), at(152, 0)])].map((p) => [p.lon, p.lat] as LngLat);
  const near = tilesNear(trace, 150, 36);
  assert.ok(near.length <= 8, `${near.length} tiles`);
  assert.ok(tilesNear(walk([at(0, 0), at(400, 0)]).map((p) => [p.lon, p.lat] as LngLat), 150, 36).length <= 36, 'capped');
});

// A guess that fits the time (the concept doc's Filling gaps tab, "Drawing a gap's way", GT1-GT3).

// A creek path from (0, 0) to (3, 0), and a loop of path from its west end up and round to its east end.
const loop = deriveSegments([
  road([at(0, 0), at(3, 0)], { class: 'path', subclass: 'footway' }),
  road([at(0, 0), at(0, 1), at(3, 1), at(3, 0)], { class: 'path', subclass: 'footway' }),
  road([at(-0.6, 0), at(0, 0)], { class: 'path', subclass: 'footway' }),
  road([at(3, 0), at(3.6, 0)], { class: 'path', subclass: 'footway' }),
]);
const onLoop = (p: LngLat) => p[1] > O[1] + 0.5 * dLat;

test('GT1: the walk\'s own pace is the median of its moving fixes, else 1.3 m/s', () => {
  const tr = readTrace(walk([at(0, 0), at(3, 0)]), 0);
  assert.ok(Math.abs(movingPace(tr) - 1.4) < 0.05, `${movingPace(tr)}`);
  const unreported = readTrace(walk([at(0, 0), at(3, 0)]).map((p) => ({ ...p, speed: null })), 0);
  assert.ok(Math.abs(movingPace(unreported) - 1.4) < 0.15, `worked out from movement: ${movingPace(unreported)}`);
  const standing = readTrace([0, 5000, 10000, 15000].map((t) => ({ walk_id: 'w', t, lon: O[0], lat: O[1], accuracy_m: 8, speed: 0, course: null })), 0);
  assert.equal(movingPace(standing), 1.3);
});

test('GT2: a loop is offered over the shortcut when the time fits the loop', () => {
  // 8 min at 1.4 m/s is about 670 m: the loop (about 500 m) fits it better than the 280 m shortcut.
  const inf = only(withGap([at(-0.5, 0), at(0.1, 0)], [at(2.9, 0), at(3.5, 0)], 480), loop)!;
  assert.ok(inf, 'offered');
  assert.ok(inf.path.some(onLoop), 'round the loop');
  assert.ok(inf.lengthM > 450, `${Math.round(inf.lengthM)} m`);
});

test('GT2: the shortcut stays when the time is short', () => {
  // 4 min at 1.4 m/s is about 340 m: the 280 m shortcut fits.
  const inf = only(withGap([at(-0.5, 0), at(0.1, 0)], [at(2.9, 0), at(3.5, 0)], 240), loop)!;
  assert.ok(inf && !inf.path.some(onLoop), 'along the creek');
});

test('GT3: a way chosen for its fit is offered, never filled; a certain gap keeps its shortest way', () => {
  const inf = only(withGap([at(-0.5, 0), at(0.1, 0)], [at(2.9, 0), at(3.5, 0)], 480), loop)!;
  assert.equal(inf.level, 'offer');
  // Main Street with nowhere else to go, slowly: still filled by itself, along the street.
  const slow = only(withGap([at(0.5, 0), at(2, 0)], [at(6, 0), at(7, 0)], 900), corridor)!;
  assert.equal(slow.level, 'auto');
  assert.ok(Math.abs(slow.lengthM - 400) < 15, `${Math.round(slow.lengthM)} m`);
});

test('GT2: in a grid, spare time is not read as a zig-zag round the blocks', () => {
  // 10 min for 400 m along Street 2: the time would fit two blocks round, but a way that turns
  // corner after corner is a poor guess; time to spare in town is mostly time stopped.
  const inf = only(withGap([at(0.5, 2), at(1.5, 2)], [at(5.5, 2), at(6.5, 2)], 600), grid)!;
  assert.ok(inf.path.every((p) => Math.abs(p[1] - at(0, 2)[1]) * 111320 < 15), 'along Street 2');
});

// After the audit (Nov 3): each accepted finding's regression, `gap-drawing audit N`.

test('gap-drawing audit 1: the park path stays the offer at 8 min, never the drive beside it', () => {
  // A way that fits the time keeps to the kinds of way the shortest uses: a footpath walk isn't
  // guessed onto a park drive because the drive is longer.
  const park = deriveSegments([
    road([at(0, 0), at(3, 0)], { class: 'path', subclass: 'footway' }),
    road([at(0, 0.5), at(3, 0.5)], { class: 'minor', name: 'Park Drive' }),
    road([at(0, 0), at(0, 0.5)], { class: 'path', subclass: 'footway' }),
    road([at(3, 0), at(3, 0.5)], { class: 'path', subclass: 'footway' }),
  ]);
  for (const seconds of [300, 480, 600]) {
    const inf = only(withGap([at(-0.3, 0), at(0.1, 0)], [at(2.9, 0), at(3.3, 0)], seconds), park)!;
    assert.notEqual(inf.street, 'Park Drive', `${seconds} s`);
  }
});

test('gap-drawing audit 3: a loop is still found with a second path beside the ends', () => {
  // A path 30 m beside the creek, joined at both ends: every end joins two paths, and the
  // variants through those joins must not use up the ways looked at.
  const twin = deriveSegments([
    road([at(0, 0), at(3, 0)], { class: 'path', subclass: 'footway' }),
    road([at(0, 0), at(0, 1), at(3, 1), at(3, 0)], { class: 'path', subclass: 'footway' }),
    road([at(-0.6, 0), at(0, 0)], { class: 'path', subclass: 'footway' }),
    road([at(3, 0), at(3.6, 0)], { class: 'path', subclass: 'footway' }),
    road([at(-0.6, 0.3), at(3.6, 0.3)], { class: 'path', subclass: 'footway' }),
    road([at(-0.6, 0), at(-0.6, 0.3)], { class: 'path', subclass: 'footway' }),
    road([at(3.6, 0), at(3.6, 0.3)], { class: 'path', subclass: 'footway' }),
  ]);
  const inf = only(withGap([at(-0.5, 0), at(0.1, 0)], [at(2.9, 0), at(3.5, 0)], 480), twin)!;
  assert.ok(inf.path.some((p) => p[1] > O[1] + 0.8 * dLat), 'round the loop');
});

test('gap-drawing audit 6: the pace from 1 Hz fixes without a speed', () => {
  // The web reports no speed; fixes a second apart at 1.3 m/s.
  const pts: TracePoint[] = [];
  for (let k = 0; k <= 300; k++) {
    const p = stepToward(at(0, 0), at(10, 0), 1.3 * k);
    pts.push({ walk_id: 'w', t: k * 1000, lon: p[0], lat: p[1], accuracy_m: 8, speed: null, course: null });
  }
  const pace = movingPace(readTrace(pts, 0));
  assert.ok(Math.abs(pace - 1.3) < 0.2, `${pace.toFixed(2)} m/s`);
});
