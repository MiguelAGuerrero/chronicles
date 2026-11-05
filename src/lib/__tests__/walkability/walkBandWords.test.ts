/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BAND_BADGE, bandTip, bandWords } from '../../walk/bandWords';
import type { Band } from '../../walk/types';

// Walkability (WK21-WK23), written from specs/walkability/spec.md before the code.

test('WK22: each drawn band has words for its tooltip and label; unknown has none', () => {
  assert.equal(bandWords('foot'), 'Easy on foot');
  assert.equal(bandWords('mixed'), 'Mixed');
  assert.equal(bandWords('car'), 'Built around cars');
  assert.equal(bandWords('unknown'), null);
  assert.equal(bandTip('unknown'), null);
  assert.ok(bandTip('car')!.startsWith('Built around cars'));
});

test('WK21: bands differ by shape: no badge, a caution badge, a car badge', () => {
  assert.equal(BAND_BADGE.foot, null);
  assert.equal(BAND_BADGE.mixed, 'caution');
  assert.equal(BAND_BADGE.car, 'car');
  assert.equal(BAND_BADGE.unknown, undefined);
});

test('WK23: the tooltip gives a reason in words and never a number', () => {
  for (const b of ['foot', 'mixed', 'car'] as Band[]) {
    const tip = bandTip(b)!;
    assert.ok(tip.length > bandWords(b)!.length, `${b} has a reason`);
    assert.ok(!/\d|%|mph|km/i.test(tip), tip);
  }
  assert.match(bandTip('car')!, /no sidewalk (is )?mapped/i);
});
