/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WALK_CODE } from '../../walk/bands';
import { createWalkReader, MAX_TILES, OVERPASS_KEEP_MS, RETRY_MS } from '../../walk/reader';
import type { TileFacts, WalkSource, WayFacts } from '../../walk/types';
import { fakePorts } from '../fakes';

// Walkability (WK2, WK3, WK4, WK18), written from specs/walkability/spec.md before the code.

const way = (id: string): WayFacts => ({ id, cls: 'residential', level: 0, line: [[-75.19, 40.69], [-75.189, 40.69]] });
type Spy = WalkSource & { calls: [number, number][]; busy: number; maxBusy: number; from: TileFacts['from']; fail: boolean; hang: boolean };
const spy = (): Spy => {
  const s: Spy = {
    calls: [], busy: 0, maxBusy: 0, from: 'overture', fail: false, hang: false,
    async read(x, y) {
      s.calls.push([x, y]);
      s.busy++;
      s.maxBusy = Math.max(s.maxBusy, s.busy);
      try {
        if (s.hang) return await new Promise<never>(() => {});
        await new Promise((r) => setTimeout(r, 1));
        return s.fail ? null : { x, y, from: s.from, ways: [way(`${x}/${y}`)] };
      } finally {
        s.busy--;
      }
    },
  };
  return s;
};

test('WK2: a tile is read once, then served from the device, also after a reload', async () => {
  const p = fakePorts();
  const s = spy();
  const r = createWalkReader(p, s);
  const a = await r.read([[1, 2], [3, 4]], 'rel1');
  assert.deepEqual([...a.tiles.keys()].sort(), ['1/2', '3/4']);
  assert.equal(s.calls.length, 2);
  await r.read([[1, 2]], 'rel1');
  assert.equal(s.calls.length, 2, 'cached');
  const reloaded = createWalkReader(p, s);
  assert.equal((await reloaded.read([[3, 4]], 'rel1')).tiles.get('3/4')![0].id, '3/4');
  assert.equal(s.calls.length, 2, 'survives a reload (WK20)');
  const kept = (await p.db.getWalkTiles(['1/2']))[0];
  assert.deepEqual([kept.build, kept.code, kept.from], ['rel1', WALK_CODE, 'overture']);
});

test('WK2: concurrent reads of one tile ask once; a new build or a new code reads again', async () => {
  const p = fakePorts();
  const s = spy();
  const r = createWalkReader(p, s);
  await Promise.all([r.read([[1, 2]], 'rel1'), r.read([[1, 2]], 'rel1'), r.read([[1, 2]], 'rel1')]);
  assert.equal(s.calls.length, 1);
  await r.read([[1, 2]], 'rel2');
  assert.equal(s.calls.length, 2, 'a new Overture release');
  const old = (await p.db.getWalkTiles(['1/2']))[0];
  await p.db.putWalkTiles([{ ...old, code: 'w0' }]);
  // A code changes between launches, never inside one: a new session reads the tile again.
  await createWalkReader(p, s).read([[1, 2]], 'rel2');
  assert.equal(s.calls.length, 3, 'a new WALK_CODE');
});

test('WK3: a failing source never fails a read; the tile is asked again only after the wait', async () => {
  const p = fakePorts();
  const s = spy();
  s.fail = true;
  const r = createWalkReader(p, s);
  const a = await r.read([[1, 2]], 'rel1');
  assert.equal(a.tiles.size, 0);
  assert.equal(a.failed, 1);
  await r.read([[1, 2]], 'rel1');
  assert.equal(s.calls.length, 1, 'not again at once');
  p.clock.advance(RETRY_MS + 1);
  s.fail = false;
  const b = await r.read([[1, 2]], 'rel1');
  assert.equal(s.calls.length, 2);
  assert.equal(b.tiles.size, 1);
  assert.equal(b.failed, 0);
});

test('WK3: a source that never answers is given up on at the deadline', async () => {
  const s = spy();
  s.hang = true;
  const r = createWalkReader(fakePorts(), s, { tileMs: 30 });
  const a = await r.read([[1, 2]], 'rel1');
  assert.equal(a.failed, 1);
});

test('WK4: one request at a time, and no more than 12 tiles in a read', async () => {
  const s = spy();
  const r = createWalkReader(fakePorts(), s);
  const many: [number, number][] = Array.from({ length: 20 }, (_, i) => [i, i]);
  const a = await r.read(many, 'rel1');
  assert.equal(MAX_TILES, 12);
  assert.equal(s.calls.length, 12);
  assert.equal(a.tiles.size, 12);
  assert.equal(s.maxBusy, 1);
  await Promise.all([r.read([[50, 50], [51, 51]], 'rel1'), r.read([[52, 52], [53, 53]], 'rel1')]);
  assert.equal(s.maxBusy, 1, 'also across reads');
});

test('WK1b: a tile Overpass gave is read from Overture again later; kept meanwhile; used if Overture still fails', async () => {
  const p = fakePorts();
  const s = spy();
  s.from = 'overpass';
  const r = createWalkReader(p, s);
  await r.read([[1, 2]], 'rel1');
  assert.equal((await p.db.getWalkTiles(['1/2']))[0].from, 'overpass');
  await r.read([[1, 2]], 'rel1');
  assert.equal(s.calls.length, 1, 'kept for a while');
  p.clock.advance(OVERPASS_KEEP_MS + 1);
  s.fail = true;
  const a = await r.read([[1, 2]], 'rel1');
  assert.equal(s.calls.length, 2);
  assert.equal(a.tiles.size, 1, 'the older Overpass tile is better than none');
  s.fail = false;
  s.from = 'overture';
  p.clock.advance(RETRY_MS + 1);
  await r.read([[1, 2]], 'rel1');
  assert.equal((await p.db.getWalkTiles(['1/2']))[0].from, 'overture');
});

test('WK18: the source is asked for a tile and nothing else', async () => {
  const s = spy();
  await createWalkReader(fakePorts(), s).read([[7, 8]], 'rel1');
  assert.deepEqual(s.calls, [[7, 8]]);
});
