/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../../components/map/types';
import { ATLAS_CODE, ATLAS_RULES, atlasStep, heldNears, heldUntil, newRows, type AtlasArea, type AtlasProfile, type NearRead } from '../../atlas/atlas';
import { townsListedAfter } from '../../atlas/carousel';
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
    ring: async () => ({ profile: PROFILE, extent: null }),
    exploreBusy: () => false,
  };
  return { p, read: createAtlasRead({ ...p, io }) };
}

/** A ring's profile as the compute hands it over (only its presence matters here). */
const PROFILE = { steps: {}, strips: [], stripAt: null, marks: [], sketch: { paths: [] }, overture: null } as unknown as AtlasProfile;

const names = (rows: AtlasArea[]) => rows.map((r) => r.name).sort();

test('tend explore 25: a near read whose write fails resolves with the areas it read, unkept, and frees the next read (never a throw retried every 1.5 s)', async () => {
  for (const failing of ['putAtlasAreas', 'setMeta'] as const) {
    const { p, read } = setup();
    await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
    p.db.failNext(failing);
    const out = await read.readNear(HERE, 'town', BUILD, 12_000, () => false);
    // A throw here reached useAtlas's catch, which took it for a read still running and asked again in 1.5 s, reading the tiles each time.
    assert.ok(out && typeof out === 'object', `${failing}: resolved with the read, not a throw (${String(out)})`);
    // The areas still show, from the read itself, and the read it made is handed back to be held (tend explore audit 32).
    assert.deepEqual(names(out.unkept), ['Cranston', 'East Providence'], failing);
    assert.deepEqual([out.near.build, out.near.radiusM, out.near.code, out.near.at], [BUILD, 12_000, ATLAS_CODE, HERE], failing);
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

test('tend explore audit 32: a near read kept only in memory stands for its level until retryMs, so the town read follows a neighborhood read whose write failed', () => {
  const now = Date.UTC(2026, 10, 18, 9);
  const held: NearRead = { at: HERE, build: BUILD, code: ATLAS_CODE, radiusM: ATLAS_RULES.nearNeighborhoodM };
  const nears = (nb: NearRead[], tw: NearRead[]) => [
    { level: 'neighborhood' as const, at: HERE, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: nb },
    { level: 'town' as const, at: HERE, radiusM: ATLAS_RULES.nearTownM, reads: tw },
  ];
  const step = (nb: NearRead[], tw: NearRead[], t: number) => atlasStep({ build: BUILD, latest: BUILD, nears: nears(nb, tw), list: [], now: t });
  // Without the held read the neighborhood read is asked again, before the towns, every time.
  assert.equal((step([], [], now) as { level?: string }).level, 'neighborhood');
  // Held, it stands for its level: the town read follows.
  const nb = heldNears([], [{ read: held, at: now }], now + 1000);
  assert.deepEqual(nb, [held]);
  assert.deepEqual(step(nb, [], now + 1000), { kind: 'near', level: 'town', at: HERE, radiusM: ATLAS_RULES.nearTownM });
  // A held town read lists the towns (townsListedAfter): the row never says no towns are named while it stands.
  const town: NearRead = { at: HERE, build: BUILD, code: ATLAS_CODE, radiusM: ATLAS_RULES.nearTownM };
  assert.equal(townsListedAfter(false, { reads: heldNears([], [{ read: town, at: now }], now + 1000), at: HERE, build: BUILD }), true);
  // Kept reads come first and stay; at retryMs the held one goes, and the level is read again.
  const kept: NearRead = { ...held, at: [-71.5, 41.9] };
  assert.deepEqual(heldNears([kept], [{ read: held, at: now }], now + 1000), [kept, held]);
  assert.deepEqual(heldNears([kept], [{ read: held, at: now }], now + ATLAS_RULES.retryMs), [kept]);
  assert.equal((step(heldNears([], [{ read: held, at: now }], now + ATLAS_RULES.retryMs), [], now + ATLAS_RULES.retryMs) as { level?: string }).level, 'neighborhood');
  // The loop wakes when the first held read stops standing; none held, nothing to wake for.
  assert.equal(heldUntil([{ read: held, at: now }, { read: town, at: now + 5000 }], now + 1000), ATLAS_RULES.retryMs - 1000);
  assert.equal(heldUntil([{ read: held, at: now }], now + ATLAS_RULES.retryMs), null);
  assert.equal(heldUntil([], now), null);
  // Read again with the write still failing, the unkept rows join those shown, never in their place: a row whose ring
  // was read keeps its profile, and the same town read at another zoom is no second card.
  const shown = newRows([], [{ level: 'town', name: 'Cranston', at: [-71.43, 41.78], reachM: 5000 }], BUILD, now).map((r) => ({ ...r, profile: PROFILE }));
  const again = newRows([], [{ level: 'town', name: 'Cranston', at: [-71.4302, 41.7801], reachM: 5000 }, { level: 'town', name: 'East Providence', at: [-71.37, 41.81], reachM: 5000 }], BUILD, now);
  assert.deepEqual(names([...shown, ...newRows(shown, again, BUILD, now)]), ['Cranston', 'East Providence']);
});

const AREA: AtlasArea = newRows([], [{ level: 'neighborhood', name: 'Fox Point', at: [-71.4, 41.82], reachM: 1000 }], BUILD, 1)[0];

test('tend explore audit 33: a ring whose write fails resolves its profile, unkept, and waits retryMs', async () => {
  const { p, read } = setup();
  await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
  p.db.failNext('putAtlasAreas');
  const row = await read.readRing(AREA, () => false);
  assert.ok(row, 'resolved a row');
  // The card shows its bars from the read, never "Reading this area…" while nothing reads it.
  assert.equal(row.profile, PROFILE);
  assert.equal(row.failed_at, p.clock.now(), 'it waits retryMs before its write is tried again');
  assert.deepEqual(await p.db.listAtlasAreas(), [], 'nothing kept');
  // A ring that reads and writes keeps it, with no failure.
  const kept = await read.readRing(AREA, () => false);
  assert.equal(kept?.profile, PROFILE);
  assert.equal(kept?.failed_at, null);
  assert.deepEqual(names(await p.db.listAtlasAreas()), ['Fox Point']);
});

test('tend explore audit 34: a near read that cannot list the kept areas resolves false and writes nothing', async () => {
  const { p, read } = setup();
  await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
  await read.readNear(HERE, 'town', BUILD, 12_000, () => false);
  const before = await p.db.listAtlasAreas();
  p.db.failNext('listAtlasAreas');
  // A second read near by (a new build's read would be the same): with the kept rows unknown it cannot tell new from known.
  assert.equal(await read.readNear(HERE, 'town', 'b2', 12_000, () => false), false);
  assert.deepEqual(await p.db.listAtlasAreas(), before, 'no row rewritten with no profile');
  assert.deepEqual((await read.nearReads('town')).map((r) => r.build), [BUILD], 'no read recorded');
});

test('tend explore audit 35: a tile_url read that fails resolves false, never a throw', async () => {
  const { p, read } = setup();
  await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
  p.db.failNext('getMeta');
  assert.equal(await read.readNear(HERE, 'town', BUILD, 12_000, () => false), false);
  p.db.failNext('getMeta');
  const row = await read.readRing(AREA, () => false);
  assert.equal(row?.failed_at, p.clock.now(), 'a ring with no tile URL is a failed read, waiting retryMs');
  assert.equal(row?.profile, null);
});
