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

// tend map audit 5: the bands were of latitude only, so captures along one parallel all fell in one band and were
// measured against each other: 5,000 of them 100 m apart took 468 ms. Pins are now kept in cells of latitude and
// longitude, the longitude scaled by the band's pole-most latitude and wrapped at ±180.
test('tend map audit 5: 5,000 captures along one parallel group in under 50 ms, and as the plain rule does everywhere', () => {
  const capAt = (id: string, lon: number, lat: number, t: number): Faced => facedOf({
    id, walk_id: 'w', t, lat, lon, kind: 'photo', file_path: null, body: null, segment_id: null,
  });
  const brute = (caps: Faced[], radius: number) => {
    const r = Math.min(radius, 5000);
    const out: { at: [number, number]; ids: string[] }[] = [];
    for (const c of [...caps].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
      const p: [number, number] = [c.lon!, c.lat!];
      let best: (typeof out)[number] | null = null;
      let bestD = r;
      for (const q of out) {
        const d = distanceM(q.at, p);
        if (d <= bestD) {
          best = q;
          bestD = d;
        }
      }
      if (best) best.ids.push(c.id);
      else out.push({ at: p, ids: [c.id] });
    }
    return out.map((q) => q.ids);
  };
  const ids = (caps: Faced[], radius: number) => pinsFor(caps, radius).map((p) => p.captures.map((c) => c.id));

  // 5,000 along the parallel of Fox Point, 100 m apart (about 500 km of it), at z16's reach.
  const r16 = PIN_GROUP_PX * metersPerPixel(16, O[1]);
  const lonStep = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
  const line: Faced[] = [];
  for (let i = 0; i < 5000; i++) line.push(capAt(`p${i}`, O[0] + i * lonStep, O[1], i));
  pinsFor(line, r16);
  const t0 = performance.now();
  const pins = pinsFor(line, r16);
  const ms = performance.now() - t0;
  assert.equal(pins.length, 5000);
  assert.ok(ms < 50, `pinsFor took ${ms.toFixed(0)} ms for 5,000 along one parallel`);

  // The same grouping as the plain rule: across the antimeridian, at the poles, on a crowd along a parallel, at a reach
  // of zero, and an unknown reach (none joins).
  const scatter = (n: number, lon0: number, lat0: number, spanLon: number, spanLat: number, tag: string) => {
    const out: Faced[] = [];
    for (let i = 0; i < n; i++) {
      let lon = lon0 + ((i * 0.618034) % 1) * spanLon - spanLon / 2;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      const lat = Math.max(-90, Math.min(90, lat0 + ((i * 0.754878) % 1) * spanLat - spanLat / 2));
      out.push(capAt(`${tag}${i}`, lon, lat, i % 89));
    }
    return out;
  };
  const cases: [string, Faced[]][] = [
    ['antimeridian', scatter(400, 180, 10, 0.02, 0.01, 'a')],
    ['north pole', scatter(400, 0, 89.9995, 360, 0.001, 'n')],
    ['south pole', scatter(400, 0, -89.9995, 360, 0.001, 's')],
    ['parallel', scatter(400, O[0], O[1], 0.05, 0.0002, 'q')],
  ];
  for (const [name, caps] of cases) {
    for (const radius of [0, 15, 30, 120, 400, 5000, Number.NaN]) {
      assert.deepEqual(ids(caps, radius), brute(caps, radius), `${name}, radius ${radius}`);
    }
  }
  // Two captures at one spot share a pin at a reach of zero.
  assert.equal(pinsFor([capAt('x', 1, 1, 0), capAt('y', 1, 1, 1)], 0).length, 1);
});
