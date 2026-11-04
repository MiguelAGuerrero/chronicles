/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrowSwipe, landing, nextArea, releaseSwipe, revealTo, SNAP, snapScope, swipeHeading, swipeOf, tapClears, zoomStart, type SnapPoint } from '../../atlas/snap';
import type { LngLat } from '../../types';

const O: LngLat = [-71.4, 41.82];
const at = (eastM: number, northM: number): LngLat => [O[0] + eastM / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1] + northM / 111320];
const pt = (key: string, eastM: number, northM: number): SnapPoint => ({ key, at: at(eastM, northM) });

const near = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) < 0.5;

test('DN2: a drag left goes east, up goes south; turned 90° it follows the map', () => {
  // The finger moves left: the map would pan to show what is to the right, east when north is up.
  assert.ok(near(swipeHeading(-60, 0, 0), 90));
  assert.ok(near(swipeHeading(60, 0, 0), 270));
  // The finger moves up: the map would show what is below, south.
  assert.ok(near(swipeHeading(0, -60, 0), 180));
  assert.ok(near(swipeHeading(0, 60, 0), 0));
  // Turned so east is up (bearing 90): a drag down shows what is above the screen, which is east.
  assert.ok(near(swipeHeading(0, 60, 90), 90));
  // And a drag left shows the screen's right, which is south.
  assert.ok(near(swipeHeading(-60, 0, 90), 180));
});

// A swipe (owner, Nov 4, after Fountain Hill never reached Bethlehem): the map lands where the swipe would
// have panned it, coasting on a flick as a pan does, and snaps to the nearest area on that side, never the selected one.
const slow = (dx: number, dy: number) => ({ dx, dy, vx: 0, vy: 0 });
const metres = (a: LngLat, b: LngLat) => {
  const k = 111320 * Math.cos((O[1] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * k, (a[1] - b[1]) * 111320);
};

test('DN2: a swipe lands where it would have panned the map, turned with it', () => {
  // 100 px left at 10 m a pixel: the middle lands 1 km east (what was on the right comes into view).
  assert.ok(metres(landing(at(0, 0), slow(-100, 0), 0, 10), at(1000, 0)) < 1);
  // 100 px down: 1 km north.
  assert.ok(metres(landing(at(0, 0), slow(0, 100), 0, 10), at(0, 1000)) < 1);
  // Turned so east is up (bearing 90): a drag left brings in the screen's right, which is south.
  assert.ok(metres(landing(at(0, 0), slow(-100, 0), 90, 10), at(0, -1000)) < 1);
});

test('DN2: a flick coasts further than a slow drag of the same length, as a pan does', () => {
  const still = landing(at(0, 0), slow(-100, 0), 0, 10);
  const flick = landing(at(0, 0), { dx: -100, dy: 0, vx: -2000, vy: 0 }, 0, 10);
  assert.ok(metres(flick, at(0, 0)) > metres(still, at(0, 0)) + 500);
  // Along the swipe, and capped like the map's own coast.
  assert.ok(flick[1] - at(0, 0)[1] < 1e-9 && flick[0] > still[0]);
  const wild = landing(at(0, 0), { dx: -100, dy: 0, vx: -1e6, vy: 0 }, 0, 10);
  assert.ok(metres(wild, at(0, 0)) < 1000 + SNAP.inertia.maxSpeed ** 2 / (2 * SNAP.inertia.deceleration * SNAP.inertia.linearity) * 10 + 1);
});

test('DN2: the nearest area to where the swipe lands wins, past a nearer one beside the way (Fountain Hill to Bethlehem)', () => {
  const fountainHill = pt('fountain-hill', 0, 0);
  const bethlehem = pt('bethlehem', 1300, 1550); // 40° east of north, 2 km
  const hellertown = pt('hellertown', 170, 980); // 10° east of north, 1 km: nearer, and inside any cone that held Bethlehem
  const towns = [fountainHill, bethlehem, hellertown];
  // A drag of 200 px toward Bethlehem (down and left, at 10 m a pixel) lands 2 km that way.
  const toward = { dx: -130, dy: 155, vx: 0, vy: 0 };
  assert.equal(nextArea(fountainHill.at, fountainHill.key, towns, toward, 0, 10)?.key, 'bethlehem');
  // A short one the same way lands nearer Hellertown.
  assert.equal(nextArea(fountainHill.at, fountainHill.key, towns, { dx: -20, dy: 95, vx: 0, vy: 0 }, 0, 10)?.key, 'hellertown');
});

test('DN2: a short swipe always moves, to the nearest other area on that side', () => {
  const here = pt('here', 0, 0);
  const areas = [here, pt('east', 900, 100), pt('west', -400, 0)];
  // 30 px at 10 m a pixel lands 300 m east, still nearest 'here': it moves on to 'east', never back to 'west'.
  assert.equal(nextArea(here.at, 'here', areas, slow(-30, 0), 0, 10)?.key, 'east');
});

test('DN3: with nothing selected, a swipe starts from the map\'s middle and goes past the area under it', () => {
  const middle = at(0, 0);
  const areas = [pt('at middle', 40, 0), pt('east', 700, 0), pt('west', -700, 0)];
  assert.equal(nextArea(middle, null, areas, slow(-50, 0), 0, 10)?.key, 'east');
  assert.equal(nextArea(middle, null, areas, slow(50, 0), 0, 10)?.key, 'west');
  // Further than SNAP.hereM from the middle, it is a step of its own.
  assert.equal(nextArea(middle, null, [pt('close east', SNAP.hereM + 50, 0), pt('east', 700, 0)], slow(-15, 0), 0, 10)?.key, 'close east');
});

test('DN4: with no area on the side swiped toward, nothing changes', () => {
  const here = pt('here', 0, 0);
  // Only areas behind (west) and beside (due north, 90° off): a swipe east lands nowhere, never on them.
  assert.equal(nextArea(here.at, 'here', [here, pt('west', -500, 0), pt('north', 0, 500)], slow(-50, 0), 0, 10), null);
  assert.equal(nextArea(here.at, 'here', [here], slow(-50, 0), 0, 10), null);
  assert.equal(nextArea(here.at, 'here', [], slow(-50, 0), 0, 10), null);
});

test('DN7, DN8: the page near you steps neighborhoods; a town\'s page steps towns until one of its neighborhoods is selected', () => {
  assert.equal(snapScope({ townPage: null, selected: null }), 'neighborhoods');
  assert.equal(snapScope({ townPage: null, selected: 'fox-point' }), 'neighborhoods');
  assert.equal(snapScope({ townPage: 'providence', selected: null }), 'towns');
  // The town's own wide tile selected is still the town.
  assert.equal(snapScope({ townPage: 'providence', selected: 'providence' }), 'towns');
  assert.equal(snapScope({ townPage: 'providence', selected: 'fox-point' }), 'neighborhoods');
});

test('DN11: arrow keys are swipes that way; other keys are not', () => {
  // ArrowRight goes east (north up): the same as a drag to the left.
  const right = arrowSwipe('ArrowRight');
  assert.ok(right && near(swipeHeading(right.dx, right.dy, 0), 90));
  const left = arrowSwipe('ArrowLeft');
  assert.ok(left && near(swipeHeading(left.dx, left.dy, 0), 270));
  const up = arrowSwipe('ArrowUp');
  assert.ok(up && near(swipeHeading(up.dx, up.dy, 0), 0));
  const down = arrowSwipe('ArrowDown');
  assert.ok(down && near(swipeHeading(down.dx, down.dy, 0), 180));
  assert.equal(arrowSwipe('+'), null);
  assert.equal(arrowSwipe('a'), null);
});

test('discrete-navigation audit 2: a tap-drag zoom and a shift box-zoom never start a swipe', () => {
  // maplibre's tap-drag zoom: a second touch within its tap window; the box zoom: shift held.
  assert.equal(zoomStart({ shift: false, sinceTapMs: Infinity }), false);
  assert.equal(zoomStart({ shift: false, sinceTapMs: 200 }), true);
  assert.equal(zoomStart({ shift: false, sinceTapMs: SNAP.tapDragMs + 1 }), false);
  assert.equal(zoomStart({ shift: true, sinceTapMs: Infinity }), true);
});

test('discrete-navigation audit 3: a native release is a swipe only for one finger that never long-pressed', () => {
  assert.deepEqual(releaseSwipe({ dx: -40, dy: 0, maxTouches: 1, held: false }), { dx: -40, dy: 0 });
  assert.equal(releaseSwipe({ dx: -40, dy: 0, maxTouches: 2, held: false }), null);
  assert.equal(releaseSwipe({ dx: -40, dy: 0, maxTouches: 1, held: true }), null);
  assert.equal(releaseSwipe({ dx: -10, dy: 5, maxTouches: 1, held: false }), null);
});

test('discrete-navigation audit 6: a tap on an area\'s point never clears the selection; one away from every point does', () => {
  const points = [at(0, 0), at(800, 0)];
  assert.equal(tapClears(at(10, 5), 30, points), false);
  assert.equal(tapClears(at(805, 0), 30, points), false);
  assert.equal(tapClears(at(400, 0), 30, points), true);
  assert.equal(tapClears(at(400, 0), 30, []), true);
});

test('discrete-navigation audit 8: a revealed row clears what covers the grid\'s bottom, and scrolls only when out of view', () => {
  // In view: nothing to do.
  assert.equal(revealTo({ top: 100, h: 200, viewH: 580, scrollY: 50, insetBottom: 0 }), null);
  // Below the view: scrolled up just enough, plus a margin.
  assert.equal(revealTo({ top: 500, h: 200, viewH: 580, scrollY: 50, insetBottom: 0 }), 50 + 120 + 8);
  // In view but under a 68 px back pill: scrolled clear of it.
  assert.equal(revealTo({ top: 350, h: 200, viewH: 580, scrollY: 0, insetBottom: 68 }), 38 + 8);
  // Above the view: scrolled down to it.
  assert.equal(revealTo({ top: -120, h: 200, viewH: 580, scrollY: 300, insetBottom: 0 }), 300 - 120 - 8);
  // Never above the content's top.
  assert.equal(revealTo({ top: -20, h: 200, viewH: 580, scrollY: 10, insetBottom: 0 }), 0);
});
