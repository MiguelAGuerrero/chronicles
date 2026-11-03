/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitWithMoments, MOMENT_FRAME_M, placedMoments, upsertMoment } from '../momentPins';
import type { Capture } from '../types';

const cap = (id: string, o: Partial<Capture> = {}): Capture => ({
  id, walk_id: null, t: 1000, lat: 41.812, lon: -71.4, kind: 'text', file_path: null, body: 'A blue door', segment_id: null, ...o,
});

test('M16 moment pins 1: only placed moments outside walks are pins', () => {
  const got = placedMoments([
    cap('loose'),
    cap('walked', { walk_id: 'w1' }),
    cap('placeless', { lat: null, lon: null }),
    cap('half', { lon: null }),
  ]);
  assert.deepEqual(got.map((c) => c.id), ['loose']);
});

test('M16 moment pins 2: a moment placed after it was kept replaces its unplaced row, a new one is added', () => {
  const kept = cap('m', { lat: null, lon: null });
  const list = [cap('a'), kept];
  const placed = upsertMoment(list, { ...kept, lat: 41.9, lon: -71.5 });
  assert.equal(placed.length, 2);
  assert.equal(placed[1].lat, 41.9);
  assert.equal(list[1].lat, null, 'the list given is never changed');
  const added = upsertMoment(list, cap('b'));
  assert.deepEqual(added.map((c) => c.id), ['a', 'm', 'b']);
});

test('M16 moment pins 3: Chronicle frames placed moments with the places walked', () => {
  const places: [number, number, number, number] = [-71.41, 41.81, -71.40, 41.82];
  assert.deepEqual(fitWithMoments(places, []), places, 'no moments: the places alone');
  assert.equal(fitWithMoments(null, []), null, 'nothing at all: no fit');
  // A lone moment, nothing walked: a frame around it, so its pin shows (it is not a point).
  const lone = fitWithMoments(null, [cap('m', { lat: 48.85, lon: 2.35 })])!;
  assert.ok(lone[0] < 2.35 && lone[2] > 2.35 && lone[1] < 48.85 && lone[3] > 48.85);
  const heightM = (lone[3] - lone[1]) * 111320;
  assert.ok(Math.abs(heightM - 2 * MOMENT_FRAME_M) < 1, `framed ${MOMENT_FRAME_M} m around (${heightM})`);
  // A moment away from the places widens the frame to hold both; walked moments and placeless ones don't count.
  const both = fitWithMoments(places, [cap('m', { lat: 41.85, lon: -71.45 }), cap('w', { walk_id: 'w1', lat: 10, lon: 10 }), cap('p', { lat: null, lon: null })])!;
  assert.ok(both[0] < -71.45 && both[3] > 41.85, 'holds the moment');
  assert.equal(both[2], places[2], 'still holds the places');
  assert.equal(both[1], places[1]);
});
