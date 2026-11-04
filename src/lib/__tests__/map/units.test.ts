/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDistance } from '../../format';
import { metersPerPixel } from '../../pins';
import { scaleBar } from '../../scaleBar';
import { getUnits, onUnits, setUnits, unitsForLocale } from '../../units';

// Quality of life, round 2: distances in km or miles (QL13-QL15), written from
// the criteria before the code. Formatting goes through the units store;
// each formatter also takes the units outright, so tests never depend on
// the device's locale.

const FT = 0.3048;
const MI = 1609.344;

test('QL13 regression: a fresh store starts at km, whatever the machine\'s locale (round 2 broke the deploy on en-US)', async () => {
  // A fresh module instance, untouched by the other tests here: the region default is applied only at launch.
  const fresh = (await import(`../../units.ts?fresh=${Date.now()}`)) as typeof import('../../units');
  assert.equal(fresh.getUnits(), 'km');
});

test('QL13: the default follows the locale region: US, GB, LR and MM get miles', () => {
  for (const l of ['en-US', 'en-GB', 'en-LR', 'my-MM']) assert.equal(unitsForLocale(l), 'mi', l);
});

test('QL13: every other region, and no locale, gets km', () => {
  for (const l of ['en-CA', 'de-DE', 'fr', undefined, '']) assert.equal(unitsForLocale(l), 'km', String(l));
});

test('QL13: the store reads synchronously and tells its listeners of a change', () => {
  const was = getUnits();
  setUnits('km');
  const seen: string[] = [];
  const off = onUnits(() => seen.push(getUnits()));
  setUnits('mi');
  assert.equal(getUnits(), 'mi');
  setUnits('km');
  assert.equal(getUnits(), 'km');
  assert.deepEqual(seen, ['mi', 'km']);
  off();
  setUnits('mi');
  assert.deepEqual(seen, ['mi', 'km'], 'a removed listener hears nothing');
  setUnits(was);
});

test('QL14: imperial says whole feet under 0.1 mi, then miles with one decimal', () => {
  assert.equal(formatDistance(0, 'mi'), '0 ft');
  assert.equal(formatDistance(137, 'mi'), '449 ft');
  assert.equal(formatDistance(527 * FT, 'mi'), '527 ft');
  // 450 m is 1,476 ft: past a tenth of a mile, so it is said in miles.
  assert.equal(formatDistance(450, 'mi'), '0.3 mi');
  assert.equal(formatDistance(0.1 * MI, 'mi'), '0.1 mi');
  assert.equal(formatDistance(160.934, 'mi'), '0.1 mi');
  assert.equal(formatDistance(1931, 'mi'), '1.2 mi');
  assert.equal(formatDistance(16093, 'mi'), '10.0 mi');
});

test('QL14: metric is unchanged', () => {
  assert.equal(formatDistance(450, 'km'), '450 m');
  assert.equal(formatDistance(1200, 'km'), '1.2 km');
  assert.equal(formatDistance(0, 'km'), '0 m');
});

test('QL14: without the parameter, formatDistance reads the store', () => {
  const was = getUnits();
  setUnits('mi');
  assert.equal(formatDistance(450), '0.3 mi');
  assert.equal(formatDistance(137), '449 ft');
  setUnits('km');
  assert.equal(formatDistance(450), '450 m');
  setUnits(was);
});

const MAX_PX = 100;
/** The imperial ladder: feet in 1, 2, 5 × 10^n up to 2,000 ft, then miles in 1, 2, 5 × 10^n. */
const isImperialRound = (meters: number) => {
  const ft = meters / FT;
  const mi = meters / MI;
  const lead = (v: number) => {
    const e = Math.floor(Math.log10(v) + 1e-9);
    return +(v / 10 ** e).toPrecision(6);
  };
  if (ft <= 2000 + 1e-6 && Math.abs(ft - Math.round(ft)) < 1e-6) return [1, 2, 5].includes(lead(ft));
  return Math.abs(mi - Math.round(mi)) < 1e-6 && [1, 2, 5].includes(lead(mi));
};

test('QL15: at z16, 41.8°, the imperial bar is 200 ft', () => {
  const mpp = metersPerPixel(16, 41.8);
  const bar = scaleBar(mpp, MAX_PX, 'mi');
  assert.equal(bar.label, '200 ft');
  assert.ok(Math.abs(bar.meters - 200 * FT) < 1e-6, 'meters stays in metres');
  assert.ok(bar.px <= MAX_PX && bar.px > 0);
  assert.ok(Math.abs(bar.px - bar.meters / mpp) < 1e-6);
});

test('QL15: at z11, 41.8°, the imperial bar is 1 mi; at z10, 2 mi', () => {
  const z11 = scaleBar(metersPerPixel(11, 41.8), MAX_PX, 'mi');
  assert.equal(z11.label, '1 mi');
  assert.ok(Math.abs(z11.meters - MI) < 1e-6);
  const z10 = scaleBar(metersPerPixel(10, 41.8), MAX_PX, 'mi');
  assert.equal(z10.label, '2 mi');
  assert.ok(Math.abs(z10.meters - 2 * MI) < 1e-6);
});

test('QL15: feet stop at 2,000 ft, then miles take over', () => {
  // z12 at 41.8°: about 1,425 m fit, short of a mile, so the bar is 2,000 ft.
  const z12 = scaleBar(metersPerPixel(12, 41.8), MAX_PX, 'mi');
  assert.equal(z12.label, '2000 ft');
  // Never 5,000 ft: once over 2,000 ft, the next step is a mile.
  const mpp = (5000 * FT) / MAX_PX;
  assert.equal(scaleBar(mpp, MAX_PX, 'mi').label, '2000 ft');
  assert.equal(scaleBar((MI * 1.01) / MAX_PX, MAX_PX, 'mi').label, '1 mi');
  assert.equal(scaleBar((5 * MI * 1.01) / MAX_PX, MAX_PX, 'mi').label, '5 mi');
  assert.equal(scaleBar((50 * MI * 1.01) / MAX_PX, MAX_PX, 'mi').label, '50 mi');
});

for (const zoom of [18, 16, 14, 12, 10, 6, 2]) {
  for (const lat of [0, 41.8, 60]) {
    test(`QL15: at z${zoom}, ${lat}°, the imperial bar is the largest round length that fits in ${MAX_PX} px`, () => {
      const mpp = metersPerPixel(zoom, lat);
      const bar = scaleBar(mpp, MAX_PX, 'mi');
      assert.ok(bar.px > 0 && bar.px <= MAX_PX + 1e-9, `px ${bar.px}`);
      assert.ok(isImperialRound(bar.meters), `${bar.meters} m is not a round imperial length`);
      assert.ok(bar.meters <= mpp * MAX_PX * (1 + 1e-9), 'fits');
      // Nothing longer on the ladder would fit.
      const ft = bar.meters / FT;
      const next = ft < 2000 - 1e-6
        ? (ft / 10 ** Math.floor(Math.log10(ft) + 1e-9) < 1.5 ? 2 : ft / 10 ** Math.floor(Math.log10(ft) + 1e-9) < 3 ? 5 : 10) * 10 ** Math.floor(Math.log10(ft) + 1e-9) * FT
        : ft <= 2000 + 1e-6
          ? MI
          : (() => {
              const mi = bar.meters / MI;
              const e = Math.floor(Math.log10(mi) + 1e-9);
              const lead = +(mi / 10 ** e).toPrecision(6);
              return (lead === 1 ? 2 : lead === 2 ? 5 : 10) * 10 ** e * MI;
            })();
      assert.ok(next > mpp * MAX_PX * (1 + 1e-9), `${next} m would also fit`);
      assert.match(bar.label, /^\d+ (ft|mi)$/);
    });
  }
}

test('QL15: metric is unchanged, with the units given or from the store', () => {
  assert.equal(scaleBar(metersPerPixel(16, 0), MAX_PX, 'km').label, '100 m');
  assert.equal(scaleBar(metersPerPixel(12, 0), MAX_PX, 'km').label, '1 km');
  const was = getUnits();
  setUnits('mi');
  assert.equal(scaleBar(metersPerPixel(16, 0), MAX_PX).label, '200 ft');
  setUnits('km');
  assert.equal(scaleBar(metersPerPixel(16, 0), MAX_PX).label, '100 m');
  setUnits(was);
});
