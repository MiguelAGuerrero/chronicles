/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deadZoneDue, deadZoneNudge, stripAt } from '../landing/walk';
import type { LngLat } from '../types';

// v1.5 slice 3 (on the walk), written from criteria L14-L15 before the code. The loop (L13, L16) was retired by explore.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];

test('walk: on a strip within 30 m, the chip names it (L14)', () => {
  const strips = [{ name: 'Thayer Street', lines: [[m(0, -100), m(0, 200)]] }];
  assert.equal(stripAt(m(20, 50), strips), 'Thayer Street');
  assert.equal(stripAt(m(40, 50), strips), null);
});

test('walk: a dead zone nudges once, after 10 min more than 400 m from every pocket, toward one within 1.5 km (L15)', () => {
  const pockets = [{ name: 'Thayer Street', centre: m(0, 600), strip: true }];
  const base = { here: m(0, 0), pockets, quiet: false, nudged: false };
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 9 * 60_000 }), null, 'not yet 10 min');
  const n = deadZoneNudge({ ...base, farSinceMs: 10 * 60_000 })!;
  assert.equal(n.text, 'Thayer Street strip, 600 m north');
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 11 * 60_000, nudged: true }), null, 'once a walk');
  assert.equal(deadZoneNudge({ ...base, farSinceMs: 11 * 60_000, quiet: true }), null, 'quiet walk');
  assert.equal(deadZoneNudge({ ...base, here: m(0, 300), farSinceMs: 11 * 60_000 }), null, 'within 400 m: not a dead zone');
  assert.equal(deadZoneNudge({ ...base, pockets: [{ name: 'Far', centre: m(0, 1700) }], farSinceMs: 11 * 60_000 }), null, 'none within 1.5 km');
  assert.equal(deadZoneNudge({ ...base, pockets: [{ name: 'A busy pocket', centre: m(-500, 0) }], farSinceMs: 11 * 60_000 })!.text, 'A busy pocket, 500 m west');
});

// Audit regressions (v1.5 slice 3).

test('walk: the strip chip holds until 45 m off, so jitter at 30 m doesn’t blink it (audit 11)', () => {
  const strips = [{ name: 'Thayer Street', lines: [[m(0, -100), m(0, 200)]] }];
  assert.equal(stripAt(m(40, 50), strips, 'Thayer Street'), 'Thayer Street');
  assert.equal(stripAt(m(50, 50), strips, 'Thayer Street'), null);
  assert.equal(stripAt(m(40, 50), strips, null), null);
});

test('walk: the dead-zone check is free until it could fire (audit 6, 8)', () => {
  const pockets = [{ name: 'Thayer Street', centre: m(0, 600), strip: true }];
  assert.equal(deadZoneDue({ here: m(0, 0), pockets, farSinceMs: 5 * 60_000 }), false, 'not yet 10 min');
  assert.equal(deadZoneDue({ here: m(0, 0), pockets: [{ name: 'Far', centre: m(0, 5000) }], farSinceMs: 11 * 60_000 }), false, 'none within reach');
  assert.equal(deadZoneDue({ here: m(0, 0), pockets, farSinceMs: 11 * 60_000 }), true);
});
