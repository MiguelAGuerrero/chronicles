/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOutlines, type OutlineSource } from '../../areas/outlineRead';
import { outlineTileKey, outlineTileOf, type OutlineTile } from '../../areas/outlines';
import { fakePorts } from '../fakes';
import { O, square } from './hoodFixture';

// Neighborhood boundaries, the read and its cache (HB12), against fakePorts and a fake source.

function source(opts: { fail?: boolean } = {}) {
  const asked: string[] = [];
  const s: OutlineSource & { asked: string[]; fail: boolean } = {
    asked, fail: opts.fail ?? false,
    async release() { return '2026-10-21.0'; },
    async tile(release, x, y, z): Promise<OutlineTile> {
      asked.push(outlineTileKey(x, y, z));
      if (s.fail) throw new Error('offline');
      return {
        key: outlineTileKey(x, y, z), z, x, y, release, read_at: 0, points: [],
        pieces: [{ id: 'sq', name: 'Squareton', polygons: square(-60, -60, 60, 60) }],
        hoods: [{ id: 'h', name: 'Riverside', subtype: 'neighborhood', polygons: square(-5, -5, 5, 5) }],
      };
    },
  };
  return s;
}

test('HB12: unread shapes leave the set without neighborhoods and are tried again; kept ones answer with no request, and selecting reads the cache only', { todo: 'test first' }, async () => {
  const p = fakePorts();
  const src = source({ fail: true });
  const o = createOutlines({ ...p, source: src });
  const failed = await o.read([O]);
  assert.equal(failed.complete, false);
  assert.deepEqual(failed.set.hoods ?? [], []);
  assert.deepEqual(await p.db.getOutlineTiles([outlineTileKey(...outlineTileOf(O))]), [], 'a failed read keeps nothing, never "none"');
  src.fail = false;
  const ok = await o.read([O]);
  assert.equal(ok.complete, true);
  assert.deepEqual(ok.set.hoods?.map((h) => h.name), ['Riverside']);
  const asked = src.asked.length;
  // Selecting: known() answers from the cache, with no request.
  const known = await o.known([O]);
  assert.deepEqual(known.hoods?.map((h) => h.name), ['Riverside']);
  assert.equal(src.asked.length, asked);
  // A tile kept by the old decoder (no neighborhoods) is read again.
  const old: OutlineTile = { ...(await p.db.getOutlineTiles([outlineTileKey(...outlineTileOf(O))]))[0], release: '2026-10-21.0#sub1', hoods: undefined };
  await p.db.putOutlineTiles([old]);
  assert.deepEqual((await o.known([O])).hoods ?? [], []);
  await o.read([O]);
  assert.equal(src.asked.length, asked + 1);
  assert.equal((await o.known([O])).hoods?.length, 1);
});
