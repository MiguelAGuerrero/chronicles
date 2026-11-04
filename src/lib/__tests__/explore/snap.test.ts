/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrowSwipe, nextArea, releaseSwipe, revealTo, SNAP, snapScope, swipeHeading, swipeOf, tapClears, zoomStart, type SnapPoint } from '../../atlas/snap';
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

test('DN2: only areas within 45° count, the nearest wins', () => {
  const from = pt('here', 0, 0);
  const areas = [
    from,
    pt('far east', 1500, 0),
    pt('near north-east', 600, 650), // 47° off east: outside the cone
    pt('east-ish', 900, 400), // 24° off east: inside, and nearer than far east
    pt('west', -300, 0),
  ];
  assert.equal(nextArea(from.at, 'here', areas, 90)?.key, 'east-ish');
  assert.equal(nextArea(from.at, 'here', areas, 270)?.key, 'west');
  // The selected area itself is never the answer.
  assert.notEqual(nextArea(from.at, 'here', areas, 0)?.key, 'here');
});

test('DN2: under 24 px is not a swipe; a long press, two fingers or a pinch never are', () => {
  assert.equal(SNAP.minSwipePx, 24);
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 110, y: 115 }), null);
  assert.deepEqual(swipeOf({ x: 100, y: 100 }, { x: 70, y: 100 }), { dx: -30, dy: 0 });
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 40, y: 100 }, { multi: true }), null);
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 40, y: 100 }, { held: true }), null);
});

test('DN3: with nothing selected, a step starts from the map\'s middle', () => {
  const middle = at(0, 0);
  // An area at the middle is where you are looking: the swipe goes past it, to the next one that way.
  const areas = [pt('at middle', 40, 0), pt('east', 700, 0), pt('west', -700, 0)];
  assert.equal(nextArea(middle, null, areas, 90)?.key, 'east');
  assert.equal(nextArea(middle, null, areas, 270)?.key, 'west');
  // Further than SNAP.hereM from the middle, it is a step of its own.
  assert.equal(nextArea(middle, null, [pt('close east', SNAP.hereM + 50, 0), pt('east', 700, 0)], 90)?.key, 'close east');
});

test('DN4: nothing that way returns null', () => {
  const from = pt('here', 0, 0);
  assert.equal(nextArea(from.at, 'here', [from, pt('west', -500, 0), pt('north', 0, 500)], 90), null);
  assert.equal(nextArea(from.at, 'here', [from], 0), null);
  assert.equal(nextArea(from.at, 'here', [], 0), null);
});

test('DN5: the opposite swipe returns where it came from, though another is nearer', () => {
  const a = pt('a', 0, 0);
  const b = pt('b', 800, 0);
  // From b, going west, 'c' is nearer than a; but the last step was a → b eastwards.
  const c = pt('c', 500, 150);
  const areas = [a, b, c];
  const last = { from: a.key, to: b.key, heading: 90 };
  assert.equal(nextArea(b.at, 'b', areas, 270)?.key, 'c');
  assert.equal(nextArea(b.at, 'b', areas, 270, last)?.key, 'a');
  // Roughly opposite counts too (within the cone).
  assert.equal(nextArea(b.at, 'b', areas, 250, last)?.key, 'a');
  // Not opposite: the trail plays no part.
  assert.equal(nextArea(b.at, 'b', areas, 0, last), null);
  // The trail is only for the area it ended on: from c, west goes to the nearest (d), never back to a.
  const d = pt('d', 200, 120);
  assert.equal(nextArea(c.at, 'c', [...areas, d], 270, last)?.key, 'd');
  // An origin no longer listed is not brought back.
  assert.equal(nextArea(b.at, 'b', [b, c], 270, last)?.key, 'c');
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
