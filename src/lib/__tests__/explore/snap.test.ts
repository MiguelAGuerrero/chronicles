/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrowSwipe, releaseSwipe, SNAP, swipeOf, zoomStart } from '../../atlas/snap';
import { rowStep } from '../../atlas/carousel';

test('DN2: under 24 px is not a swipe; a long press, two fingers or a pinch never are', () => {
  assert.equal(SNAP.minSwipePx, 24);
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 110, y: 115 }), null);
  assert.deepEqual(swipeOf({ x: 100, y: 100 }, { x: 70, y: 100 }), { dx: -30, dy: 0 });
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 40, y: 100 }, { multi: true }), null);
  assert.equal(swipeOf({ x: 100, y: 100 }, { x: 40, y: 100 }, { held: true }), null);
});

test('DN11: arrow keys are swipes that step the row (ArrowRight next, ArrowLeft previous); other keys are not', () => {
  const step = (key: string) => {
    const s = arrowSwipe(key);
    return s ? rowStep(s.dx, s.dy, SNAP.minSwipePx) : null;
  };
  assert.equal(step('ArrowRight'), 1);
  assert.equal(step('ArrowLeft'), -1);
  assert.equal(step('ArrowUp'), 0);
  assert.equal(step('ArrowDown'), 0);
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
