/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { findPockets, POCKET_RULES, type PocketPoint } from '../atlas/pockets';
import { distanceM } from '../geo';
import type { LngLat } from '../types';

// Town presence (TP4-TP6). The real cases run on Overture's places (release 2026-10-21.0) inside each
// town's whole outline, weighted as busy streets weigh them (scripts/fixture-town-points.mjs).
const require = createRequire(import.meta.url);
type Fixture = { points: [number, number, number][] };
const pointsOf = (name: string): PocketPoint[] => (require(`./${name}Points.json`) as Fixture).points.map(([lon, lat, weight]) => ({ at: [lon, lat], weight }));

const O: LngLat = [-75.5, 40.6];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];
/** A blob of weighted points around a spot. */
const blob = (at: LngLat, n: number, weight = 1): PocketPoint[] => Array.from({ length: n }, (_, i) => ({ at: east((i % 10) * 20, [at[0], at[1] + (Math.floor(i / 10) * 20) / 111320]), weight }));

test('TP4: peaks 1.5 km apart, busiest first, capped, above a floor', () => {
  const pts = [...blob(east(0), 120), ...blob(east(3000), 90), ...blob(east(6000), 60), ...blob(east(9000), 45)];
  const p = findPockets(pts);
  assert.equal(p.length, 4);
  assert.ok(distanceM(p[0].at, east(100)) < 400, 'the heaviest first');
  assert.ok(distanceM(p[1].at, east(3100)) < 400);
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) assert.ok(distanceM(p[i].at, p[j].at) >= POCKET_RULES.sepM, 'at least 1.5 km apart');
  const many = Array.from({ length: 9 }, (_, i) => blob(east(i * 3000), 100)).flat();
  assert.equal(findPockets(many).length, POCKET_RULES.cap, 'at most five');
});

test('TP4: one mass with two peaks gives two, and a thin town gives none', () => {
  // Two heavy spots 2 km apart with a continuous light carpet between them: connected cells would be one blob.
  const carpet = Array.from({ length: 80 }, (_, i) => ({ at: east(i * 30), weight: 0.5 }));
  const p = findPockets([...carpet, ...blob(east(0), 100), ...blob(east(2200), 100)]);
  assert.ok(p.length >= 2, 'two peaks inside one continuous mass');
  assert.deepEqual(findPockets(blob(east(0), 10)), [], 'nothing above the floor gives none');
  assert.deepEqual(findPockets([]), []);
  assert.ok(findPockets(blob(east(0), 120)).every((q) => q.name === null), 'the shell names them');
});

test('TP5: Whitehall\'s busiest pocket is the MacArthur Road corridor to the mall', () => {
  const p = findPockets(pointsOf('whitehall'));
  assert.ok(p.length >= 1);
  const corridor: LngLat = [-75.4841, 40.6342];
  assert.ok(distanceM(p[0].at, corridor) < 500, `the busiest pocket is ${Math.round(distanceM(p[0].at, corridor))} m from the corridor`);
  // Not the label point's quiet ring: the pocket is kilometres from it.
  assert.ok(distanceM(p[0].at, [-75.50749, 40.6574]) > 2500);
});

test('TP6: Allentown and Bethlehem give several pockets, at least 1.5 km apart', () => {
  for (const name of ['allentown', 'bethlehem']) {
    const p = findPockets(pointsOf(name));
    assert.ok(p.length >= 2, `${name} has more than one`);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) assert.ok(distanceM(p[i].at, p[j].at) >= POCKET_RULES.sepM, `${name} ${i}/${j}`);
  }
  // The busiest holds each town's downtown (Allentown's Hamilton and 7th; Bethlehem's Main and Broad).
  assert.ok(distanceM(findPockets(pointsOf('allentown'))[0].at, [-75.4714, 40.6029]) < 800);
  assert.ok(distanceM(findPockets(pointsOf('bethlehem'))[0].at, [-75.3774, 40.6217]) < 1000);
});
