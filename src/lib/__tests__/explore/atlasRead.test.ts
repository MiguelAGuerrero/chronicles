/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../../components/map/types';
import type { AtlasArea } from '../../atlas/atlas';
import { createAtlasRead, type AtlasReadIo } from '../../atlas/readShell';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';

// The atlas's reads (atlas/readShell.ts) against fake ports: the tiles are handed over, nothing is fetched.

const HERE: LngLat = [-71.4, 41.82];
const BUILD = 'b1';

/** The z11 place points around you: two towns within reach. */
function townTiles(): CollectedFeatures {
  const point = (name: string, at: LngLat) => ({ geometry: { type: 'Point', coordinates: at }, properties: { class: 'town', name } });
  return { roads: [], places: [point('Cranston', [-71.43, 41.78]), point('East Providence', [-71.37, 41.81])] } as unknown as CollectedFeatures;
}

function setup() {
  const p = fakePorts();
  const io: AtlasReadIo = {
    outlines: {
      borders: async () => {
        throw new Error('no outlines here');
      },
      read: async () => {
        throw new Error('no outlines here');
      },
      known: async () => {
        throw new Error('no outlines here');
      },
    } as unknown as AtlasReadIo['outlines'],
    fetchTiles: (async () => townTiles()) as unknown as AtlasReadIo['fetchTiles'],
    fetchTileBodies: async () => [],
    readOverture: async () => null,
    archive: { read: async () => null },
    ring: async () => {
      throw new Error('no ring here');
    },
    exploreBusy: () => false,
  };
  return { p, read: createAtlasRead({ ...p, io }) };
}

const names = (rows: AtlasArea[]) => rows.map((r) => r.name).sort();

test('tend explore 25: a near read whose write fails resolves with the areas it read, unkept, and frees the next read (never a throw retried every 1.5 s)', async () => {
  for (const failing of ['putAtlasAreas', 'setMeta'] as const) {
    const { p, read } = setup();
    await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
    p.db.failNext(failing);
    const out = await read.readNear(HERE, 'town', BUILD, 12_000, () => false);
    // A throw here reached useAtlas's catch, which took it for a read still running and asked again in 1.5 s, reading the tiles each time.
    assert.ok(out && typeof out === 'object', `${failing}: resolved with the read, not a throw (${String(out)})`);
    // The areas still show, from the read itself.
    assert.deepEqual(names(out.unkept), ['Cranston', 'East Providence'], failing);
    assert.ok(out.unkept.every((r) => r.level === 'town' && r.build === BUILD && r.profile == null), failing);
    // The read is not recorded as done, so it is asked for again after the wait; and one() is free for it.
    assert.deepEqual(await read.nearReads('town'), [], failing);
    assert.equal(read.atlasBusy(), false, failing);
    assert.equal(await read.readNear(HERE, 'town', BUILD, 12_000, () => false), true, `${failing}: the next read keeps its areas`);
    assert.deepEqual(names(await p.db.listAtlasAreas()), ['Cranston', 'East Providence'], failing);
    assert.equal((await read.nearReads('town')).length, 1, failing);
  }
});

test('tend explore 25: a near read whose write succeeds keeps its areas and its read, and resolves true', async () => {
  const { p, read } = setup();
  await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
  assert.equal(await read.readNear(HERE, 'town', BUILD, 12_000, () => false), true);
  assert.deepEqual(names(await p.db.listAtlasAreas()), ['Cranston', 'East Providence']);
  assert.deepEqual((await read.nearReads('town')).map((r) => [r.build, r.radiusM]), [[BUILD, 12_000]]);
});
