/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOutlines, type OutlineSource } from '../../areas/outlineRead';
import { outlineTileKey, outlineTileOf, type OutlineTile } from '../../areas/outlines';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';

// Town outlines (TO8, TO12), the reader and its cache, against fakePorts and a fake source.

const GYM: LngLat = [-75.49368, 40.64787];
const WEST: LngLat = [-75.507445, 40.657413];

function fakeSource(opts: { fail?: boolean; release?: string | null } = {}) {
  const asked: string[] = [];
  const source: OutlineSource & { asked: string[]; fail: boolean } = {
    asked,
    fail: opts.fail ?? false,
    async release() {
      return opts.release === undefined ? '2026-10-21.0' : opts.release;
    },
    async tile(release, x, y, z): Promise<OutlineTile> {
      asked.push(outlineTileKey(x, y, z));
      if (source.fail) throw new Error('offline');
      return {
        key: outlineTileKey(x, y, z), z, x, y, release, read_at: 0,
        pieces: [{ id: 'wh', name: 'Whitehall', polygons: [[[[-75.6, 40.6], [-75.4, 40.6], [-75.4, 40.7], [-75.6, 40.7], [-75.6, 40.6]]]] }],
        points: [],
      };
    },
  };
  return source;
}

test('TO12: a read fetches only the tiles under its points, keeps them, and never fetches them again', async () => {
  const p = fakePorts();
  const source = fakeSource();
  const o = createOutlines({ ...p, source });
  const r = await o.read([GYM, WEST]);
  assert.equal(r.complete, true);
  assert.deepEqual(source.asked.sort(), [GYM, WEST].map((q) => outlineTileKey(...outlineTileOf(q))).sort());
  assert.deepEqual(r.set.towns.map((t) => t.name), ['Whitehall']);
  // Kept, with the time it was read.
  const kept = await p.db.getOutlineTiles([outlineTileKey(...outlineTileOf(GYM))]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].read_at, p.clock.now());
  // Read again: nothing fetched.
  const again = await o.read([GYM]);
  assert.equal(again.complete, true);
  assert.equal(source.asked.length, 2);
});

test('TO12: kept outlines answer offline; cleared with the derived stores', async () => {
  const p = fakePorts();
  const source = fakeSource();
  const o = createOutlines({ ...p, source });
  await o.read([GYM]);
  source.fail = true;
  const offline = createOutlines({ ...p, source: fakeSource({ release: null }) });
  assert.deepEqual((await offline.known([GYM])).towns.map((t) => t.name), ['Whitehall']);
  assert.equal((await offline.read([GYM])).complete, true, 'kept: no network needed');
  await p.db.purgeDerived();
  assert.deepEqual((await offline.known([GYM])).towns, []);
});

test('TO8: a failed or unreachable read is not complete, keeps nothing, and the next read tries again', async () => {
  const p = fakePorts();
  const source = fakeSource({ fail: true });
  const o = createOutlines({ ...p, source });
  const r = await o.read([GYM]);
  assert.equal(r.complete, false);
  assert.deepEqual(r.set.towns, []);
  assert.deepEqual(await p.db.getOutlineTiles([outlineTileKey(...outlineTileOf(GYM))]), []);
  source.fail = false;
  assert.equal((await o.read([GYM])).complete, true);
  assert.equal(source.asked.length, 2);
  // No release known (offline before the first check): not complete.
  const none = createOutlines({ ...fakePorts(), source: fakeSource({ release: null }) });
  assert.equal((await none.read([GYM])).complete, false);
  assert.equal((await none.read([GYM])).tooMany, false);
  // Too many tiles (TO12): not read, not complete.
  const many = Array.from({ length: 13 }, (_, i): LngLat => [-75 + i * 0.1, 40.6]);
  const wide = fakeSource();
  const tooWide = await createOutlines({ ...fakePorts(), source: wide }).read(many);
  assert.equal(tooWide.complete, false);
  assert.equal(tooWide.tooMany, true, 'final: placed by points, not retried');
  assert.equal(wide.asked.length, 0);
});

test('TO12: a stop asked for mid-read keeps what was read and is not complete', async () => {
  const p = fakePorts();
  const source = fakeSource();
  const o = createOutlines({ ...p, source });
  const r = await o.read([GYM, WEST], () => true);
  assert.equal(r.complete, false);
  assert.equal(source.asked.length, 0);
});
