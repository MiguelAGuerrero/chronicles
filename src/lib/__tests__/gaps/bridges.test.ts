/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundsOf, distanceM, stepToward } from '../../geo';
import { gapsOf, inferGap } from '../../gaps/infer';
import { drawnLine, startDraw } from '../../gaps/draw';
import { readTrace } from '../../rides';
import { deriveSegments, type RoadFeature } from '../../streets';
import type { LngLat, StreetSegment, TracePoint } from '../../types';

// Gaps on a bridge (GB1-GB5), written before the code. On Nov 11 a walk on the Harrisburg
// State Street bridge lost its fixes; the gap was filled down onto the streets under the
// bridge and back, because a fix joined every street within 40 m whatever level it ran on.
// The street under the bridge is the shorter way, so it won.

const O: LngLat = [-71.4, 41.812];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in units of 100 m east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const road = (coords: LngLat[], props: Record<string, unknown>): RoadFeature => ({ geometry: { type: 'LineString', coordinates: coords }, properties: props });

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

function withGap(before: LngLat[], after: LngLat[], gapS: number): TracePoint[] {
  const a = walk(before);
  return [...a, ...walk(after, a[a.length - 1].t + gapS * 1000)];
}

const everywhere = (segs: StreetSegment[]) => boundsOf(segs.flatMap((s) => s.geometry.flat()), 3000)!;

// An overpass that goes round in a U: up its west leg at x 0, along y 3, down its east leg at x 1.
// Under Street runs straight east under both legs (at (0, 1.5) and (1, 1.5)) and is the short
// way between them: 100 m, against 400 m round the bridge. No junction where they cross (NB2).
const overpass = { class: 'minor', name: 'Overpass' };
const town = [
  road([at(0, 0), at(0, 3)], { ...overpass, brunnel: 'bridge', layer: 1 }),
  road([at(0, 3), at(1, 3)], { ...overpass, brunnel: 'bridge', layer: 1 }),
  road([at(1, 3), at(1, 0)], { ...overpass, brunnel: 'bridge', layer: 1 }),
  road([at(-1, 1.5), at(2, 1.5)], { class: 'minor', name: 'Under Street' }),
];
const segs = deriveSegments(town);

const named = (path: LngLat[], tag: string) => assert.ok(path.length >= 2, tag);
/** How far the path runs along Under Street (ground) rather than the overpass. */
const onGround = (path: LngLat[]) => path.some((p) => Math.abs(p[1] - at(0, 1.5)[1]) < 1e-9 && distanceM(p, at(0, 1.5)) > 20 && distanceM(p, at(1, 1.5)) > 20);

function one(points: TracePoint[]) {
  const gaps = gapsOf(readTrace(points, 0));
  assert.equal(gaps.length, 1, 'one gap');
  return { gap: gaps[0], inf: inferGap(gaps[0], segs, everywhere(segs)) };
}

test('gap bridges: the pieces on a bridge carry their level, the ground none (GB1)', () => {
  const bridge = segs.filter((s) => s.name === 'Overpass');
  assert.ok(bridge.length > 0);
  assert.ok(bridge.every((s) => s.level === 1), 'a bridge piece is level 1');
  assert.ok(segs.filter((s) => s.name === 'Under Street').every((s) => s.level === undefined), 'a ground piece has no level');
});

test('gap bridges: a gap between two fixes on the bridge runs over the bridge, not down the street under it (GB2)', () => {
  // On the west leg, 50 m above Under Street, then on the east leg, 20 m above it: both on the bridge.
  const { inf } = one(withGap([at(0, 1.0), at(0, 1.7)], [at(1, 1.7), at(1, 1.0)], 300));
  assert.ok(inf, 'a way');
  assert.ok(inf!.lengthM > 300, `the way goes round the bridge (${Math.round(inf!.lengthM)} m)`);
  assert.ok(!onGround(inf!.path), 'and never along Under Street');
  assert.equal(inf!.street, 'Overpass');
});

test('gap bridges: a fix nearer the street under the bridge, walking along the bridge, joins the bridge (GB3, the heading)', () => {
  // Drifted 5 m east of the west leg and 3 m north of Under Street: the street is nearer, but the
  // walker was heading north (along the bridge, across the street) and leaves heading south on the east leg.
  const west = at(0.05, 1.5 + 0.03);
  const east = at(0.95, 1.5 + 0.03);
  const { gap, inf } = one(withGap([at(0.05, 1.0), west], [east, at(0.95, 1.0)], 300));
  assert.ok(gap.fromHeading != null && (gap.fromHeading < 15 || gap.fromHeading > 345), `heading north into the gap (${gap.fromHeading})`);
  assert.ok(gap.toHeading != null && Math.abs(gap.toHeading - 180) < 15, `heading south out of it (${gap.toHeading})`);
  assert.ok(inf, 'a way');
  assert.ok(inf!.lengthM > 300, `round the bridge (${Math.round(inf!.lengthM)} m)`);
  assert.equal(inf!.street, 'Overpass');
});

test('gap bridges: a walker on the street under the bridge still joins it, even right under a leg (GB4)', () => {
  // Under Street from x -0.2 to 1.3, heading east, through the point under the west leg.
  const { inf } = one(withGap([at(-0.4, 1.5), at(0, 1.5)], [at(1.0, 1.5), at(1.3, 1.5)], 120));
  assert.ok(inf, 'a way');
  assert.ok(inf!.lengthM < 150, `straight along the street (${Math.round(inf!.lengthM)} m)`);
  assert.equal(inf!.street, 'Under Street');
});

test('gap bridges: a town with no bridge joins as before (GB5)', () => {
  const flat = deriveSegments([
    road([at(0, 0), at(0, 3)], { class: 'minor', name: 'West' }),
    road([at(-1, 1.5), at(2, 1.5)], { class: 'minor', name: 'Cross' }),
  ]);
  assert.ok(flat.every((s) => s.level === undefined));
  const gaps = gapsOf(readTrace(withGap([at(0, 0.5), at(0, 1.0)], [at(0, 2.0), at(0, 2.5)], 200), 0));
  const inf = inferGap(gaps[0], flat, boundsOf(flat.flatMap((s) => s.geometry.flat()), 3000)!);
  assert.ok(inf && inf.lengthM > 90 && inf.lengthM < 130, 'straight up the street');
});

test('gap bridges: Draw my way from the same gap, with no taps, joins its ends to the bridge too (GB6)', () => {
  const { gap } = one(withGap([at(0.05, 1.0), at(0.05, 1.5 + 0.03)], [at(0.95, 1.5 + 0.03), at(0.95, 1.0)], 300));
  const line = drawnLine(startDraw(gap), segs, { done: true });
  assert.ok(line.lengthM > 300, `round the bridge (${Math.round(line.lengthM)} m)`);
  named(line.path, 'a line');
});
