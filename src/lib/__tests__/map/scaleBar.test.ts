/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metersPerPixel } from '../../pins';
import { scaleBar } from '../../scaleBar';

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
  assert.equal(scaleBar(metersPerPixel(2, 0), MAX_PX).label, '1000 km');
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
