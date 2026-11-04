/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, distanceToLinesM } from '../../geo';
import { addPoint, drawnLine, startDraw, undoPoint } from '../../gaps/draw';
import { emptyGapAt, emptyGaps, gapLines, type Gap } from '../../gaps/infer';
import { deriveSegments, type RoadFeature } from '../../streets';
import type { LngLat } from '../../types';

// Drawing a gap's way (the concept doc's Filling gaps tab, "Drawing a gap's way", GW3-GW6),
// written from the criteria before the code. Streets are in-memory.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: props });

// An L of paths: east along y = 0 to x = 4, then north along x = 4 to y = 3; and a shortcut
// diagonal path from the corner's west, so the shortest way from end to end isn't the L.
const paths = deriveSegments([
  road([at(0, 0), at(4, 0)], { class: 'path', subclass: 'footway' }),
  road([at(4, 0), at(4, 3)], { class: 'path', subclass: 'footway' }),
  road([at(0, 0), at(4, 3)], { class: 'path', subclass: 'footway' }),
]);
const gap = (seconds: number): Gap => ({ t0: 0, t1: seconds * 1000, from: at(0, 0), to: at(4, 3) });
const L: LngLat[][] = [[at(0, 0), at(4, 0), at(4, 3)]];

test('GW3: each tap joins the one before along the paths', () => {
  const d = addPoint(startDraw(gap(600)), at(4.1, 0.1));
  const line = drawnLine(d, paths, { done: false });
  assert.ok(distanceM(line.path[0], at(0, 0)) < 1, 'starts at the fix before the gap');
  // Ends at the tap's point on the path, never out at the tap itself (gap-drawing audit 2).
  assert.ok(distanceM(line.path[line.path.length - 1], at(4.1, 0.1)) < 16, 'ends by the tap');
  // Along y = 0, not the diagonal: every point lies on the L.
  assert.ok(line.path.every((p) => distanceToLinesM(p, L) < 3), 'along the path');
  assert.ok(Math.abs(line.lengthM - 400) < 30, `${Math.round(line.lengthM)} m`);
  assert.equal(line.straight, 0);
});

test('GW3: a tap more than 40 m from any path joins straight', () => {
  const d = addPoint(startDraw(gap(600)), at(1, 2));
  const line = drawnLine(d, paths, { done: false });
  assert.equal(line.straight, 1);
  assert.equal(line.path.length, 2, 'a straight line from the fix to the tap');
  assert.ok(distanceM(line.path[1], at(1, 2)) < 1);
});

test('GW4: Undo removes the last point, and only that', () => {
  let d = startDraw(gap(600));
  d = addPoint(d, at(4, 0));
  d = addPoint(d, at(4, 2));
  d = undoPoint(d);
  assert.equal(d.points.length, 1);
  assert.ok(distanceM(d.points[0], at(4, 0)) < 1);
  assert.equal(undoPoint(undoPoint(d)).points.length, 0, 'never below the start');
});

test('GW5: Done joins the last point to the fix after the gap along the paths', () => {
  const d = addPoint(startDraw(gap(600)), at(4, 0));
  const line = drawnLine(d, paths, { done: true });
  assert.ok(distanceM(line.path[line.path.length - 1], at(4, 3)) < 1, 'ends at the fix after');
  assert.ok(line.path.every((p) => distanceToLinesM(p, L) < 3), 'round the L, as tapped');
  assert.ok(Math.abs(line.lengthM - 700) < 30, `${Math.round(line.lengthM)} m`);
  // Done with no taps at all: the fix before to the fix after along the paths.
  assert.ok(Math.abs(drawnLine(startDraw(gap(600)), paths, { done: true }).lengthM - 500) < 30, 'the diagonal');
});

test('GW6: a line faster than walking over the gap is flagged, not refused', () => {
  const d = addPoint(startDraw(gap(120)), at(4, 0));
  // 700 m in 2 min is 5.8 m/s.
  assert.equal(drawnLine(d, paths, { done: true }).fast, true);
  assert.equal(drawnLine(addPoint(startDraw(gap(600)), at(4, 0)), paths, { done: true }).fast, false);
});

test('GW7: with no paths read, every join is straight', () => {
  const d = addPoint(startDraw(gap(600)), at(4, 0));
  const line = drawnLine(d, [], { done: true });
  assert.equal(line.straight, 2);
  assert.equal(line.path.length, 3);
});

test('GW2: a gap with no line is found by a tap on its dotted join, away from its ends', () => {
  const g = { t0: 0, t1: 6 * 60_000, from: at(0, 0), to: at(4, 0) };
  const s = { t0: 0, t1: 1, path: [at(0, 1), at(4, 1)], lengthM: 400, street: null, how: 'offer' as const };
  assert.deepEqual(emptyGaps([g, { ...g, t0: 0, t1: 1 }], [s]), [g], 'the one with a stretch has a line');
  assert.equal(emptyGapAt([g], at(2, 0.1), 20), g);
  assert.equal(emptyGapAt([g], at(0.1, 0), 20), null, 'beside its start: the trace');
  assert.equal(gapLines(g).title, 'Not recorded for 6 min');
});

// After the audit (Nov 3): `gap-drawing audit N`.

test('gap-drawing audit 2: a tap beside a path adds no spike out to it', () => {
  const straight = deriveSegments([road([at(-1, 0), at(5, 0)], { class: 'path', subclass: 'footway' })]);
  const g: Gap = { t0: 0, t1: 600_000, from: at(0, 0), to: at(4, 0) };
  let d = startDraw(g);
  for (const x of [1, 2, 3]) d = addPoint(d, at(x, 0.35));
  const line = drawnLine(d, straight, { done: true });
  assert.ok(line.lengthM < 430, `${Math.round(line.lengthM)} m`);
  assert.ok(line.path.every((p) => Math.abs(p[1] - O[1]) * 111320 < 5), 'on the path');
});

test('gap-drawing audit 5: a short gap\'s dots open its card from their middle', () => {
  const g = { t0: 0, t1: 120_000, from: at(0, 0), to: at(0.5, 0) };
  assert.equal(emptyGapAt([g], at(0.25, 0), 15), g);
});

test('gap-drawing audit 9: one pass gives the line so far and the line done', () => {
  const d = addPoint(startDraw(gap(600)), at(4, 0));
  const both = drawnLine(d, paths, { done: true });
  assert.deepEqual(both.sofar, drawnLine(d, paths, { done: false }).path);
});
