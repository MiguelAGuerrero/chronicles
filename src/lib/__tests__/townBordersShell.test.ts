/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOutlines, type OutlineSource } from '../areas/outlineRead';
import { BORDER_ZOOM, OUTLINE_ZOOM, outlineTileKey, outlineTileOf, type OutlineTile } from '../areas/outlines';
import type { LngLat } from '../types';
import { fakePorts } from './fakes';

// Town borders (TB7): the z10 tiles borders are drawn from, read once, kept, and drawn offline.

const GYM: LngLat = [-75.49368, 40.64787];

function source(opts: { fail?: boolean } = {}) {
  const asked: string[] = [];
  const s: OutlineSource & { asked: string[]; fail: boolean } = {
    asked,
    fail: opts.fail ?? false,
    release: async () => '2026-10-21.0',
    async tile(release, x, y, z): Promise<OutlineTile> {
      asked.push(outlineTileKey(x, y, z));
      if (s.fail) throw new Error('offline');
      return {
        key: '', z, x, y, release, read_at: 0, points: [],
        pieces: [{ id: 'wh', name: 'Whitehall', polygons: [[[[-75.6, 40.6], [-75.4, 40.6], [-75.4, 40.7], [-75.6, 40.7], [-75.6, 40.6]]]] }],
      };
    },
  };
  return s;
}

test('TB7: borders read the z10 tile, keep it, and draw from it offline; deciding keeps its own z12 tile', async () => {
  const p = fakePorts();
  const src = source();
  const o = createOutlines({ ...p, source: src });
  const b = await o.borders([GYM]);
  assert.equal(b.complete, true);
  assert.deepEqual(src.asked, [outlineTileKey(...outlineTileOf(GYM, BORDER_ZOOM), BORDER_ZOOM)]);
  assert.deepEqual(b.set.towns.map((t) => t.name), ['Whitehall']);
  // Offline afterwards: drawn from the phone, nothing fetched.
  src.fail = true;
  const again = await o.borders([GYM]);
  assert.equal(again.complete, true);
  assert.equal(src.asked.length, 1);
  assert.deepEqual((await o.known([GYM], BORDER_ZOOM)).towns.map((t) => t.name), ['Whitehall']);
  // The z12 tile is its own: not answered by the z10 one.
  assert.deepEqual((await o.known([GYM], OUTLINE_ZOOM)).towns, []);
});

test('TB7: no tile kept and none readable: no borders, and the next read tries again', async () => {
  const p = fakePorts();
  const src = source({ fail: true });
  const o = createOutlines({ ...p, source: src });
  const b = await o.borders([GYM]);
  assert.equal(b.complete, false);
  assert.deepEqual(b.set.towns, []);
  src.fail = false;
  assert.equal((await o.borders([GYM])).complete, true);
});
