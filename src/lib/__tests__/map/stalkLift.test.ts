/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ENDS_RING_PAINT } from '../../../components/map/types';
import { END_MARK_R, stalkLift } from '../../pins';
import type { LngLat } from '../../types';

// tend map 13 (decision 0172, O13; amends QL3's placement): a capture pin standing on a walk's start or end put its
// stalk inside the marker (the "2" pin's stalk in the solid end, a note's half filling the start's hollow, the end read
// as a power glyph since tend map T25). The owner's answer: the stalk stops at the marker's edge. A pin whose foot falls
// inside a marker is drawn lifted until its foot meets the marker's edge above it; any other pin stands on its point.

const Z = 16;
const AT: LngLat = [-71.4, 41.82];
const SIZE = 512 * 2 ** Z;
/** A point `x` px right and `y` px down from AT on screen at zoom Z, north up. */
const px = (x: number, y: number): LngLat => {
  const lat = (AT[1] * Math.PI) / 180;
  const my = (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2 + y / SIZE;
  return [AT[0] + (x / SIZE) * 360, (Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180) / Math.PI];
};
const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 0.05, `${what}: ${a} vs ${b}`);

test('tend map 13: the markers\' outer radius is what both paints draw, 22 px across', () => {
  const r = (kind: 'start' | 'end') => {
    const pick = (v: unknown) => (Array.isArray(v) ? (kind === 'start' ? v[3] : v[4]) : v) as number;
    return pick(ENDS_RING_PAINT['circle-radius']) + pick(ENDS_RING_PAINT['circle-stroke-width']);
  };
  assert.equal(r('start'), END_MARK_R);
  assert.equal(r('end'), END_MARK_R);
});

test('tend map 13: a pin standing on a start or end stops its stalk at the marker\'s edge, by the marker\'s radius', () => {
  // On the marker's middle: lifted by the whole radius, its foot at the top of the ring.
  near(stalkLift(AT, [AT, null], Z), END_MARK_R, 'on the middle');
  near(stalkLift(AT, [null, AT], Z), END_MARK_R, 'on the end');
  // 5 px to one side: up to the edge above it, sqrt(11² - 5²).
  near(stalkLift(px(5, 0), [AT, null], Z), Math.sqrt(121 - 25), '5 px right');
  near(stalkLift(px(-5, 0), [AT, null], Z), Math.sqrt(121 - 25), '5 px left');
  // 4 px below the middle: its 4 px and the radius.
  near(stalkLift(px(0, 4), [AT, null], Z), 4 + END_MARK_R, '4 px below');
  // 4 px above the middle: the rest of the way, 11 - 4.
  near(stalkLift(px(0, -4), [AT, null], Z), END_MARK_R - 4, '4 px above');
  // Outside the marker, the pin stands on its point: just past the edge, beside it, below it.
  assert.equal(stalkLift(px(11.5, 0), [AT, null], Z), 0);
  assert.equal(stalkLift(px(0, 12), [AT, null], Z), 0);
  assert.equal(stalkLift(px(0, -12), [AT, null], Z), 0);
  // No markers drawn (hidden while navigating, or none yet): none.
  assert.equal(stalkLift(AT, [], Z), 0);
  assert.equal(stalkLift(AT, [null, null], Z), 0);
});

test('tend map 13: the lift follows the zoom and the bearing, on screen', () => {
  // The same 8 px at zoom 16 is 16 px at zoom 17: outside the marker there.
  const p = px(0, 8);
  near(stalkLift(p, [AT, null], Z), 8 + END_MARK_R, 'zoom 16');
  assert.equal(stalkLift(p, [AT, null], Z + 1), 0, 'zoom 17');
  near(stalkLift(p, [AT, null], Z - 1), 4 + END_MARK_R, 'zoom 15: 4 px below');
  // Turned 180°, the point 4 px south of the marker is 4 px above it on screen.
  near(stalkLift(px(0, 4), [AT, null], Z, 180), END_MARK_R - 4, 'bearing 180');
  // Turned 90° (east up), a point 5 px east is 5 px above.
  near(stalkLift(px(5, 0), [AT, null], Z, 90), END_MARK_R - 5, 'bearing 90');
});

test('tend map 13: on a loop walk, a pin on the start clears the end over it too', () => {
  // The end 6 px above the start: a foot on the start rises past the start's edge into the end, then to the end's edge.
  const end = px(0, -6);
  near(stalkLift(AT, [AT, end], Z), 6 + END_MARK_R, 'past both');
  near(stalkLift(AT, [end, AT], Z), 6 + END_MARK_R, 'whichever comes first');
});

test('tend map 13: both maps place a pin by its lift over the markers drawn', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  assert.match(web, /stalkLift\(/, 'the web map lifts its pins');
  // The lift is padding under the stem's foot: the marker stays anchored at its point, so the pin's target still covers
  // the marker below it, which never takes a tap (QL3).
  assert.equal((web.match(/style\.paddingBottom = `\$\{PIN_FOOT \+ lift\}px`/g) ?? []).length, 2, 'drawn with it, and moved as the map zooms or turns');
  assert.match(web, /map\.on\('zoom', place\);\s*map\.on\('rotate', place\);/);
  assert.match(native, /const liftOf = \(at: LngLat\) => stalkLift\(at, standOn,/, 'native lifts its pins');
  assert.equal((native.match(/style=\{\[styles\.pinHit, \{ paddingBottom: liftOf\(pin\.lngLat\) \}\]\}/g) ?? []).length, 2, 'this walk\'s pins and memories');
});
