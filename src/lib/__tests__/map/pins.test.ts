/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metersPerPixel, PIN_GROUP_PX, pinsFor } from '../../pins';
import type { Capture } from '../../types';
import { at, O } from '../foxPoint';

// Capture pins on the map, grouped by screen distance (.claude/rules/map.md).

test('pins: grouped by screen distance at the zoom, joining the nearest pin', () => {
  const cap = (id: string, x: number, kind: Capture['kind'], t = 0): Capture => ({
    id, walk_id: 'w', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: null, segment_id: null,
  });
  const caps = [cap('a', 0, 'photo'), cap('b', 0.1, 'photo', 5), cap('c', 0.15, 'voice', 9), cap('d', 2, 'text', 20)];
  // Zoomed in (44 px ~ 30 m at z16 here): the three captures 10-15 m apart share a pin.
  const near = pinsFor(caps, PIN_GROUP_PX * metersPerPixel(16, O[1]));
  assert.equal(near.length, 2);
  assert.deepEqual(near[0].captures.map((c) => c.id), ['a', 'b', 'c']);
  assert.equal(near[0].kind, 'mixed');
  // Zoomed out to fit a whole walk (z13: 44 px ~ 260 m): everything 200 m apart merges.
  assert.equal(pinsFor(caps, PIN_GROUP_PX * metersPerPixel(13, O[1])).length, 1);
  // A capture joins the nearest pin, not merely the first within reach.
  const ab = pinsFor([cap('p', 0, 'photo'), cap('q', 0.4, 'photo', 1), cap('r', 0.38, 'text', 2)], 30);
  assert.deepEqual(ab.map((p) => p.captures.map((c) => c.id)), [['p'], ['q', 'r']]);
  // The same captures in any order make the same pins.
  assert.deepEqual(
    pinsFor([...caps].reverse(), 30).map((p) => p.id),
    pinsFor(caps, 30).map((p) => p.id),
  );
  // A capture without a position has no pin.
  assert.equal(pinsFor([{ ...cap('e', 0, 'photo'), lat: null, lon: null }], 30).length, 0);
});
