/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waitingDotsGeoJSON } from '../../../components/map/types';
import { dotAt, halfZoom, metresPerPx, PIN_ROOM, roomZoom, waitingPins } from '../../atlas/waitingPins';
import type { LngLat } from '../../types';

const O: LngLat = [-75.47, 40.6];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];
const north = (m: number, from: LngLat = O): LngLat => [from[0], from[1] + m / 110574];
const m = (key: string, at: LngLat) => ({ key, at });
// A block of eight places 20 m apart, and one alone 2 km away.
const BLOCK = [...Array.from({ length: 8 }, (_, i) => m(`b${i}`, east(i * 20, north(300)))), m('alone', east(2000))];
const overlap = (a: LngLat, b: LngLat, zoom: number) => {
  const gap = PIN_ROOM.px * metresPerPx(halfZoom(zoom), O[1]);
  return Math.abs(a[0] - b[0]) * 111320 * Math.cos((O[1] * Math.PI) / 180) < gap && Math.abs(a[1] - b[1]) * 110574 < gap;
};

// Whole towns (specs/whole-towns, decision 0127): a "?" where it has room on screen, a dot where it would crowd.

test('WT12: a "?" where it has room, a dot where it would overlap; no two "?" overlap; the same view gives the same split', () => {
  const out = waitingPins(BLOCK, O, 13, O[1]);
  assert.ok(out.pins.some((p) => p.key === 'alone'), 'a place with room is a "?"');
  assert.equal(out.pins.filter((p) => p.key.startsWith('b')).length, 1, 'zoomed out, the block is one "?" and dots');
  assert.equal(out.dots.length, 7);
  for (const z of [11, 13, 15, 17, 18]) {
    const { pins } = waitingPins(BLOCK, O, z, O[1]);
    for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) assert.ok(!overlap(pins[i].at, pins[j].at, z), `no two "?" overlap at ${z}`);
  }
  assert.ok(waitingPins(BLOCK, O, 19, O[1]).pins.length > out.pins.length, 'zoomed in, more of the block is "?"');
  // The same view, the same split: whatever order the places come in, and within a half level.
  const again = waitingPins([...BLOCK].reverse(), O, 13.2, O[1]);
  assert.deepEqual(again.pins.map((p) => p.key), out.pins.map((p) => p.key));
  assert.equal(halfZoom(13.2), 13);
  // Nearest the area's middle first: the middle's place is the "?".
  const fromEnd = waitingPins(BLOCK, east(140, north(300)), 13, O[1]);
  assert.ok(fromEnd.pins.some((p) => p.key === 'b7'));
});
test('WT13: a tap on a dot zooms to where it has room, at most 18', () => {
  const z = roomZoom(BLOCK[3], BLOCK, O[1]);
  assert.ok(z > 13 && z <= PIN_ROOM.maxZoom, `zooms in, at most ${PIN_ROOM.maxZoom} (${z})`);
  const wide = [m('a', O), m('b', east(400)), m('c', east(900))];
  const zb = roomZoom(wide[1], wide, O[1]);
  assert.ok(waitingPins(wide, wide[1].at, zb, O[1]).pins.some((p) => p.key === 'b'), 'at that zoom the dot is a "?"');
  assert.ok(!waitingPins(wide, wide[0].at, zb - 1, O[1]).pins.some((p) => p.key === 'b'), 'a level less and it would still crowd');
  assert.equal(roomZoom(m('x', O), [m('x', O), m('y', O)], O[1]), PIN_ROOM.maxZoom, 'two places on one spot: as close as the map goes');
  // The tap: the nearest dot within the press's reach, or none.
  const dots = [m('d1', east(30)), m('d2', east(60))];
  assert.equal(dotAt(O, 44, dots)?.key, 'd1');
  assert.equal(dotAt(east(-100), 44, dots), null);
});
test('WT14: a dot carries no name, number or icon; only the selected area\'s are drawn', () => {
  const fc = waitingDotsGeoJSON([{ id: 'p_secret', at: O, color: '#7a4fbf' }]);
  assert.equal(fc.features.length, 1);
  assert.deepEqual(fc.features[0].properties, { color: '#7a4fbf' }, 'a dot carries its colour only: no name, number, icon or id');
  assert.deepEqual(waitingDotsGeoJSON(undefined).features, []);
  // Only what it is given is split: the selected area's marks, never others in view.
  const { pins, dots } = waitingPins(BLOCK.slice(0, 3), O, 13, O[1]);
  assert.deepEqual(new Set([...pins, ...dots].map((d) => d.key)), new Set(['b0', 'b1', 'b2']));
});
