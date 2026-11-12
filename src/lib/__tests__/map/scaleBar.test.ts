/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metersPerPixel } from '../../pins';
import { creditsAt, scaleBar } from '../../scaleBar';

// Quality of life: the scale bar (QL5-QL6), written from the criteria before
// the code. The bar is the longest round length (1, 2 or 5 × a power of ten
// metres) that fits in the pixels given, at the map's zoom and latitude.

const MAX_PX = 100;

/** Whether `m` is 1, 2 or 5 times a power of ten. */
const isRound = (m: number) => {
  const e = Math.floor(Math.log10(m) + 1e-9);
  const lead = +(m / 10 ** e).toPrecision(6);
  return lead === 1 || lead === 2 || lead === 5;
};
/** The next round value up from a round `m`. */
const nextRound = (m: number) => {
  const e = Math.floor(Math.log10(m) + 1e-9);
  const lead = +(m / 10 ** e).toPrecision(6);
  return (lead === 1 ? 2 : lead === 2 ? 5 : 10) * 10 ** e;
};

for (const zoom of [16, 12, 2]) {
  for (const lat of [0, 60]) {
    test(`QL6: at z${zoom}, ${lat}°, the bar is the largest round length that fits in ${MAX_PX} px`, () => {
      const mpp = metersPerPixel(zoom, lat);
      const bar = scaleBar(mpp, MAX_PX);
      assert.ok(bar.px <= MAX_PX, `px ${bar.px} fits`);
      assert.ok(bar.px > 0);
      assert.ok(isRound(bar.meters), `${bar.meters} m is round`);
      assert.ok(Math.abs(bar.px - bar.meters / mpp) < 1e-6, 'px is the metres at this scale');
      assert.ok(nextRound(bar.meters) / mpp > MAX_PX, `${nextRound(bar.meters)} m would not fit`);
    });
  }
}

test('QL6: the values at the usual zooms', () => {
  // z16 at the equator: 1.19 m/px, so 100 px is 119 m and 100 m fits.
  assert.deepEqual(scaleBar(metersPerPixel(16, 0), MAX_PX).meters, 100);
  // Twice as fine at 60°: 50 m.
  assert.equal(scaleBar(metersPerPixel(16, 60), MAX_PX).meters, 50);
  assert.equal(scaleBar(metersPerPixel(12, 0), MAX_PX).meters, 1000);
  assert.equal(scaleBar(metersPerPixel(12, 60), MAX_PX).meters, 500);
  assert.equal(scaleBar(metersPerPixel(2, 0), MAX_PX).meters, 1_000_000);
  assert.equal(scaleBar(metersPerPixel(2, 60), MAX_PX).meters, 500_000);
});

test('QL5: the label says metres under a kilometre and kilometres from one', () => {
  assert.equal(scaleBar(metersPerPixel(16, 0), MAX_PX).label, '100 m');
  assert.equal(scaleBar(metersPerPixel(16, 60), MAX_PX).label, '50 m');
  assert.equal(scaleBar(metersPerPixel(12, 0), MAX_PX).label, '1 km');
  assert.equal(scaleBar(metersPerPixel(12, 60), MAX_PX).label, '500 m');
  assert.equal(scaleBar(2 * 1000 / MAX_PX, MAX_PX).label, '2 km');
  assert.equal(scaleBar(5 * 1000 / MAX_PX, MAX_PX).label, '5 km');
  assert.equal(scaleBar(metersPerPixel(2, 0), MAX_PX).label, '1,000 km');
  assert.equal(scaleBar(metersPerPixel(2, 60), MAX_PX).label, '500 km');
});

test('QL6: px never exceeds maxPx, at any maxPx', () => {
  for (const maxPx of [40, 100, 160]) {
    const bar = scaleBar(metersPerPixel(15, 41.8), maxPx);
    assert.ok(bar.px <= maxPx);
    assert.ok(nextRound(bar.meters) / metersPerPixel(15, 41.8) > maxPx);
  }
});

test('QL6: a length that fits exactly is kept', () => {
  // 1 m/px: 100 m is exactly 100 px.
  assert.deepEqual(scaleBar(1, 100), { meters: 100, px: 100, label: '100 m' });
});

// tend map 3: the map's credits (i) sat bottom right, under the walk's strip, the replay's card, Locate and the
// capture stack. They now sit beside the scale bar, on the strip each screen keeps clear for it.
test('tend map 3: the credits sit right of the scale bar at its widest, level with it, and stop short of the edge column', () => {
  for (const width of [320, 390, 1024]) {
    const inset = { bottom: 140, left: 12 };
    const at = creditsAt(inset, MAX_PX, width);
    // The bar's pill: 8 px padding each side of a line up to MAX_PX; the (i) starts past it.
    assert.ok(at.left >= inset.left + 8 + MAX_PX + 8, `${width}: left ${at.left}`);
    // Level with the bar's content: its bottom on the line's bottom (the pill's 4 px padding).
    assert.equal(at.bottom, inset.bottom + 4);
    // Opened, the credits end before the right column of round buttons, the widest the walk's 56 px capture stack
    // (12 px from the edge, or from a 640 column).
    const column = Math.max(12, (width - 640) / 2 + 12) + 56;
    assert.ok(at.left + at.maxWidth <= width - column, `${width}: right edge ${at.left + at.maxWidth} vs column at ${width - column}`);
    assert.ok(at.maxWidth >= 100, `${width}: room for the credits (${at.maxWidth})`);
  }
  // A screen's own left inset moves them with the bar.
  assert.equal(creditsAt({ bottom: 12, left: 40 }, MAX_PX, 390).left - creditsAt({ bottom: 12, left: 12 }, MAX_PX, 390).left, 28);
  // Without a left inset, the bar's default 12.
  assert.equal(creditsAt({ bottom: 12 }, MAX_PX, 390).left, creditsAt({ bottom: 12, left: 12 }, MAX_PX, 390).left);
});

// tend map 7: a scale bar over the world read "2000 km" where the specs write "2,000 km" (QL15: "2,000 ft").
test('tend map 7: the scale bar marks thousands', () => {
  assert.equal(scaleBar(2_000_000 / MAX_PX, MAX_PX, 'km').label, '2,000 km');
  assert.equal(scaleBar(10_000_000 / MAX_PX, MAX_PX, 'km').label, '10,000 km');
  assert.equal(scaleBar((2000 * 0.3048) / MAX_PX, MAX_PX, 'mi').label, '2,000 ft');
  assert.equal(scaleBar((1000 * 1609.344) / MAX_PX, MAX_PX, 'mi').label, '1,000 mi');
  assert.equal(scaleBar(500 / MAX_PX, MAX_PX, 'km').label, '500 m');
  assert.equal(scaleBar(0.5 * 1000 / MAX_PX, MAX_PX, 'km').label, '500 m');
});

// tend map audit 2: opened, the credits kept the closed (i)'s left edge, so at 320 px their text had about 72 px a
// line and "OpenStreetMap" broke mid-word; and the (i) jumped to the box's top. Opened, the box now starts further
// left, over the scale bar but clear of a round control standing over its start (the walk's Layers), and ends where
// it did; the (i) keeps its place on the box's bottom row.
test('tend map audit 2: the open credits start clear of a control over the scale bar, with room for a long word at 320', () => {
  for (const width of [320, 390]) {
    for (const left of [12, 28]) {
      const at = creditsAt({ bottom: 12, left }, MAX_PX, width);
      assert.ok(at.openLeft >= left + 44 + 8, `${width} px, inset ${left}: opens at ${at.openLeft}, over the control at ${left}-${left + 44}`);
      assert.ok(at.openLeft < at.left, `${width} px, inset ${left}: opens left of the (i) at ${at.left}`);
      assert.equal(at.openLeft + at.openMaxWidth, at.left + at.maxWidth, `${width} px, inset ${left}: the right edge stays`);
      // "OpenStreetMap |" at 12 px is about 95 px; the box pads 8 px each side.
      assert.ok(at.openMaxWidth - 16 >= 110, `${width} px, inset ${left}: ${at.openMaxWidth - 16} px a line`);
    }
  }
});
