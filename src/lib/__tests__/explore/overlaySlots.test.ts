import assert from 'node:assert/strict';
import test from 'node:test';
import { exploreSlots, pressHintUp, SCALE_H, SCALE_LEFT } from '../../atlas/overlaySlots';

// tend explore 1: Explore's notice (a hint, "Looking around…", a town's note) and the Towns back pill sat over the map's
// scale bar at the bottom left, hiding its first line ("100 m" printed over "Densest area: Thayer Street"). The slots
// are measured from the map's bottom: the scale bar clears the back pill, and the overlay clears the scale bar.

const SPOT_BOTTOM = 86; // 10 + the long press's choices (68) + 8
const PILL_BOTTOM = 12;
const PILL_H = 44;

const cases = [
  { spot: false, town: false },
  { spot: false, town: true },
  { spot: true, town: false },
  { spot: true, town: true },
];

test('tend explore 1: the overlay clears the scale bar in every state', () => {
  for (const c of cases) {
    const s = exploreSlots(c);
    assert.ok(s.overlayBottom >= s.scaleBottom + SCALE_H, `overlay ${s.overlayBottom} over scale bar top ${s.scaleBottom + SCALE_H} (${JSON.stringify(c)})`);
  }
});

test('tend explore 1: the scale bar clears the Towns back pill on a town\'s page', () => {
  for (const spot of [false, true]) {
    const pillTop = (spot ? SPOT_BOTTOM : PILL_BOTTOM) + PILL_H;
    const s = exploreSlots({ spot, town: true });
    assert.ok(s.scaleBottom >= pillTop, `scale bar ${s.scaleBottom} under the pill's top ${pillTop} (spot ${spot})`);
  }
});

test('tend explore audit 1: the scale bar clears the long press\'s choices, which span the map\'s width over its bottom', () => {
  for (const town of [false, true]) {
    const s = exploreSlots({ spot: true, town });
    assert.ok(s.scaleBottom >= SPOT_BOTTOM, `scale bar ${s.scaleBottom} under the choices' top ${SPOT_BOTTOM} (town ${town})`);
  }
});

test('tend explore 1: nothing else moved: with no spot the scale bar keeps its place without a town, and the overlay keeps clear of the long press\'s choices', () => {
  assert.equal(exploreSlots({ spot: false, town: false }).scaleBottom, 6);
  assert.ok(exploreSlots({ spot: true, town: false }).overlayBottom >= SPOT_BOTTOM);
  assert.equal(SCALE_LEFT, 8);
});

// tend tabs audit 29 (the T36 review's auditor 1, ux 2, auditor 5): the hint's five seconds count toward its being seen
// only while it is drawn where a person can see it (EC14, "after a few seconds on screen it is marked seen"). The pill's
// Edit opened the media editor (a Modal) and the hint counted under it; Explore behind another tab, a full-screen card,
// an error, a notice, "Looking around…" or the map's credits in its place did the same.
const inView = { seen: false, spot: false, located: true, barOffer: false, focused: true, covered: false, folded: false, slotTaken: false };

test('tend tabs audit 29: the press hint is up, and counts its seconds, only while it is drawn in front', () => {
  assert.equal(pressHintUp(inView), true);
  assert.equal(pressHintUp({ ...inView, covered: true }), false, 'a Modal up (the pill\'s Edit opens the editor)');
  assert.equal(pressHintUp({ ...inView, focused: false }), false, 'Explore not in front');
  assert.equal(pressHintUp({ ...inView, folded: true }), false, 'a full-screen card over the tabs');
  assert.equal(pressHintUp({ ...inView, slotTaken: true }), false, 'an error, a notice, Looking around or the credits in its place');
  assert.equal(pressHintUp({ ...inView, barOffer: true }), false, 'the bar\'s Edit pill up (tend tabs T36)');
});

test('tend tabs audit 29: nothing else moves: seen, a long press open or no place keep it down as before', () => {
  assert.equal(pressHintUp({ ...inView, seen: true }), false);
  assert.equal(pressHintUp({ ...inView, spot: true }), false);
  assert.equal(pressHintUp({ ...inView, located: false }), false);
});
