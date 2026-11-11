import assert from 'node:assert/strict';
import test from 'node:test';
import { exploreSlots, SCALE_H, SCALE_LEFT } from '../../atlas/overlaySlots';

// tend explore 1: Explore's notice (a hint, "Looking around…", a town's note) and the Towns back pill sat over the map's
// scale bar at the bottom left, hiding its first line ("100 m" printed over "Busiest area: Thayer Street"). The slots
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

test('tend explore 1: nothing else moved: with no town the scale bar keeps its place, and the overlay keeps clear of the long press\'s choices', () => {
  assert.equal(exploreSlots({ spot: false, town: false }).scaleBottom, 6);
  assert.equal(exploreSlots({ spot: true, town: false }).scaleBottom, 6);
  assert.ok(exploreSlots({ spot: true, town: false }).overlayBottom >= SPOT_BOTTOM);
  assert.equal(SCALE_LEFT, 8);
});
