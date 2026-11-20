/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { formatDistance, formatDistanceNear, formatRange } from '../../format';
import { destLine } from '../../startPlan';
import { getUnits, setUnits, type Units } from '../../units';
import type { Waypoint } from '../../nav/types';
import type { LngLat } from '../../types';

// tend map audit 55 (the diff review's auditor 9): the units a view passes (tend map 23) win over the store, and with
// the store's own units they say what the store's default says, so nothing a person sees changes until a switch.
const dest: Waypoint = { label: 'Your spot', at: [-71.4, 41.82], kind: 'point' };
const froms: (LngLat | null)[] = [[-71.4, 41.82], [-71.401, 41.8205], [-71.41, 41.83], [-71.5, 41.9], null];
const metres = [0, 0.4, 9.6, 12, 99.5, 160, 527, 528, 999.4, 999.6, 1000, 1609.344, 2500, 12345.6, 160934];

test('tend map audit 55: destLine with the units given ignores the store (store km, units mi: mi)', () => {
  const was = getUnits();
  try {
    setUnits('km');
    assert.equal(destLine(dest, [-71.41, 41.83], 'mi'), 'Your spot · 0.9\u00a0mi away');
    assert.equal(destLine(dest, [-71.41, 41.83]), 'Your spot · 1.4\u00a0km away');
    setUnits('mi');
    assert.equal(destLine(dest, [-71.401, 41.8205], 'km'), 'Your spot · 100\u00a0m away');
  } finally {
    setUnits(was);
  }
});

test('tend map audit 55: with the store\'s own units, a bound formatter and destLine say what the store\'s default says', () => {
  const was = getUnits();
  try {
    for (const u of ['km', 'mi'] as Units[]) {
      setUnits(u);
      for (const m of metres) {
        assert.equal(formatDistance(m, u), formatDistance(m), `formatDistance ${m}`);
        assert.equal(formatDistanceNear(m, u), formatDistanceNear(m), `formatDistanceNear ${m}`);
        assert.equal(formatRange(m, u), formatRange(m), `formatRange ${m}`);
      }
      for (const f of froms) assert.equal(destLine(dest, f, u), destLine(dest, f), `destLine ${f}`);
    }
  } finally {
    setUnits(was);
  }
});

test('tend map audit 55: passNote hands its units to formatRange (it lives in a view, so it is read, not run)', () => {
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'ExploreSettings.tsx'), 'utf8');
  assert.match(src, /export const passNote = \(m: number, units\?: Units\) => `A place is passed when you come within \$\{formatRange\(m, units\)\} of it\.`;/);
});
