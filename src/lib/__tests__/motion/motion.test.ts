/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buzzOffered, durationFor, HAPTIC_PATTERNS, MOTION, nudgeAllowed, PRESS_SCALE, type FeedbackKind } from '../../motionTokens';
import { zoomOutFor } from '../../zoomOut';

test('motion M1: one set of timings', () => {
  assert.equal(MOTION.fast, 120);
  assert.equal(MOTION.base, 220);
  assert.equal(MOTION.camera, 600);
  assert.equal(MOTION.lift, 180);
  assert.ok(MOTION.spring.damping > 0 && MOTION.spring.stiffness > 0);
  assert.equal(PRESS_SCALE, 0.97);
});

test('motion M2: reduce motion makes every effect instant', () => {
  for (const k of ['fast', 'base', 'camera', 'lift'] as const) {
    assert.equal(durationFor(k, true), 0);
    assert.equal(durationFor(k, false), MOTION[k]);
  }
});

test('motion audit 9: the camera ease and the pulse are tokens too', () => {
  assert.equal(MOTION.ease, 400);
  assert.equal(MOTION.pulse, 500);
});

// Audit 7: the walks list zooms out only when the view doesn't already hold every place, and never zooms in.
const cam = { center: [-71.4, 41.82] as [number, number], zoom: 15 };
const size = { width: 390, height: 844 };
const pad = { top: 60, right: 48, bottom: 518, left: 48 };

test('motion audit 7: no zoom-out when every place is already in view', () => {
  assert.equal(zoomOutFor({ camera: cam, size, padding: pad, places: [-71.401, 41.822, -71.399, 41.823] }), null);
});

test('motion audit 7: places out of view are framed, never closer than the current zoom', () => {
  const far = zoomOutFor({ camera: cam, size, padding: pad, places: [-71.45, 41.80, -71.39, 41.83] });
  assert.ok(far);
  assert.equal(far.maxZoom, 15);
  // One place out of view still frames it, at most at the current zoom: a point never zooms in to street level.
  const point = zoomOutFor({ camera: cam, size, padding: pad, places: [-71.5, 41.9, -71.5, 41.9] });
  assert.equal(point?.maxZoom, 15);
  // Below the sheet counts as out of view.
  const under = zoomOutFor({ camera: cam, size, padding: pad, places: [-71.4, 41.812, -71.4, 41.812] });
  assert.ok(under, 'a place hidden under the sheet is framed');
});

test('motion audit 7: with no camera known yet, it frames the places', () => {
  assert.ok(zoomOutFor({ camera: null, size, padding: pad, places: [-71.4, 41.82, -71.4, 41.82] }));
});

// ——— Pocket alert nudge (PA1, PA4) ———

test('PA1: the nudge is two firmer taps a token gap apart; a tap is one light tap', () => {
  const tap = HAPTIC_PATTERNS.tap;
  assert.deepEqual(tap, [{ at: 0, weight: 'light' }]);
  const nudge = HAPTIC_PATTERNS.nudge;
  assert.equal(nudge.length, 2);
  assert.equal(nudge[0].at, 0);
  assert.equal(nudge[1].at, MOTION.nudgeGap);
  assert.ok(MOTION.nudgeGap >= 80 && MOTION.nudgeGap <= 200, 'close enough to read as one nudge, apart enough to feel two');
  for (const s of nudge) assert.equal(s.weight, 'medium', 'each tap firmer than a button press');
});

test('PA4: every feedback kind has a pattern', () => {
  const kinds: FeedbackKind[] = ['tap', 'success', 'warning', 'nudge'];
  for (const k of kinds) assert.ok(HAPTIC_PATTERNS[k].length > 0, k);
});

test('pocket-alert-nudge audit 4: a desktop browser with navigator.vibrate and a fine pointer is not offered the pocket alert', () => {
  assert.equal(buzzOffered({ vibrate: true, coarse: false }), false, 'desktop Chrome: vibrate exists, no motor');
  assert.equal(buzzOffered({ vibrate: false, coarse: false }), false, 'desktop Safari');
  assert.equal(buzzOffered({ vibrate: true, coarse: true }), true, 'Android Chrome');
  assert.equal(buzzOffered({ vibrate: false, coarse: true }), false, 'iPhone Safari: no vibrate, and its switch haptic needs a tap, so a location update never reaches it (fix pocket-alert-hide)');
});

test('pocket-alert-nudge audit 6: a nudge within the last one is dropped, so two never run together', () => {
  assert.equal(nudgeAllowed(null, 1000), true);
  assert.equal(nudgeAllowed(1000, 1000 + MOTION.nudgeGap), false, 'inside the double-tap');
  assert.equal(nudgeAllowed(1000, 1000 + MOTION.nudgeGap * 2), false, 'right after it: would read as one long buzz');
  assert.equal(nudgeAllowed(1000, 1000 + MOTION.nudgeGap * 3), true);
});
