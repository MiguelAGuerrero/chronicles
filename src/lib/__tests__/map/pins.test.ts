/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { metersPerPixel, PIN_GROUP_PX, pinsFor } from '../../pins';

import { at, O } from '../foxPoint';

// Capture pins on the map, grouped by screen distance (.claude/rules/map.md).

test('pins: grouped by screen distance at the zoom, joining the nearest pin', () => {
  const cap = (id: string, x: number, kind: Faced['kind'], t = 0): Faced => facedOf({
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

// tend map 4: pinsFor compared each capture with every pin so far, O(captures x pins) on every half-zoom step; on
// Chronicle's map, every placed moment in the world (54-59 ms for 2,000 on a desktop, 340 ms for 5,000).
test('tend map 4: pinsFor over 20,000 spread captures stays near-linear, and groups as before', () => {
  const cap = (id: string, x: number, y: number, t: number): Faced => facedOf({
    id, walk_id: 'w', t, lat: at(x, y)[1], lon: at(x, y)[0], kind: 'photo', file_path: null, body: null, segment_id: null,
  });
  // 20,000 moments 100 m apart (a 141 x 142 grid, about 14 km across), none within reach of another at z16.
  const many: Faced[] = [];
  for (let i = 0; i < 20000; i++) many.push(cap(`m${i}`, (i % 141) * 1, Math.floor(i / 141) * 1, i));
  const r = PIN_GROUP_PX * metersPerPixel(16, O[1]);
  const t0 = performance.now();
  const pins = pinsFor(many, r);
  const ms = performance.now() - t0;
  assert.equal(pins.length, 20000);
  // Comparing each with every pin so far is 2 x 10^8 distances: seconds. Near-linear is milliseconds.
  assert.ok(ms < 1500, `pinsFor took ${ms.toFixed(0)} ms for 20,000`);
  // The grouping is the one the plain rule gives (the nearest pin within reach, the later one on a tie), on a
  // crowd where reaches overlap.
  const brute = (caps: Faced[], radius: number) => {
    const out: { id: string; at: [number, number]; ids: string[] }[] = [];
    for (const c of [...caps].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
      const p: [number, number] = [c.lon!, c.lat!];
      let best: (typeof out)[number] | null = null;
      let bestD = Math.min(radius, 5000);
      for (const q of out) {
        const d = distanceM(q.at, p);
        if (d <= bestD) {
          best = q;
          bestD = d;
        }
      }
      if (best) best.ids.push(c.id);
      else out.push({ id: c.id, at: p, ids: [c.id] });
    }
    return out.map((q) => q.ids);
  };
  const crowd: Faced[] = [];
  // A fixed scatter (no randomness in a test): 600 moments within about 400 m, on a quasi-random sequence.
  for (let i = 0; i < 600; i++) crowd.push(cap(`c${i}`, ((i * 0.618034) % 1) * 4, ((i * 0.754878) % 1) * 4, i % 97));
  for (const radius of [15, 30, 120, 400]) {
    assert.deepEqual(pinsFor(crowd, radius).map((p) => p.captures.map((c) => c.id)), brute(crowd, radius), `radius ${radius}`);
  }
});
