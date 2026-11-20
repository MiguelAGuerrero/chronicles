/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CollectedFeatures } from '../../../components/map/types';
import { outlineSet, outlineTileKey, outlineTileOf, type OutlineSet, type OutlineTile } from '../../areas/outlines';
import { ATLAS_CODE, nearList, rowCurrent, type AtlasArea, type AtlasProfile } from '../../atlas/atlas';
import { createAtlasRead, type AtlasReadIo } from '../../atlas/readShell';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';

// fix duplicate-city (the owner, Nov 20: "Philadelphia got listed twice"). The town near read reads the outline tiles
// under you only; a city's label point (Philadelphia's City Hall) can lie in a tile not read, more than a town's 3 km from
// the piece of its outline that was. The outline was then a second "Philadelphia" at the middle of that piece. Reproduced
// on Overture's 2026-11-18 divisions tiles from much of Philadelphia more than about 3 km from City Hall.

const HERE: LngLat = [-71.4, 41.82];
const BUILD = 'b1';
const dLat = 1000 / 111320;
const dLon = 1000 / (111320 * Math.cos((HERE[1] * Math.PI) / 180));
/** A point `x` km east and `y` km north of you. */
const km = (x: number, y: number): LngLat => [HERE[0] + x * dLon, HERE[1] + y * dLat];
const square = (x0: number, y0: number, x1: number, y1: number): LngLat[][][] => [[[km(x0, y0), km(x1, y0), km(x1, y1), km(x0, y1), km(x0, y0)]]];

/** The z12 tile under you holds a 2 km piece of the city's outline around you, and not the city's own point. */
function setUnderYou(name = 'Bigcity'): OutlineSet {
  const [x, y] = outlineTileOf(HERE);
  const tile: OutlineTile = { key: outlineTileKey(x, y), z: 12, x, y, release: 'test', read_at: 1, pieces: [{ id: 'city', name, polygons: square(-1, -1, 1, 1) }], points: [] };
  return outlineSet([tile]);
}

/** The z11 place points: the city's label 8 km east, in a tile not read, past a town's reach of the piece read. */
function labelTiles(cls: string, east = 9, name = 'Bigcity'): CollectedFeatures {
  return { roads: [], places: [{ geometry: { type: 'Point', coordinates: km(east, 0) }, properties: { class: cls, name } }] } as unknown as CollectedFeatures;
}

const PROFILE = { steps: {}, strips: [], stripAt: null, marks: [], sketch: { paths: [] }, overture: null } as unknown as AtlasProfile;

function setup(cls: string, east = 9) {
  const p = fakePorts();
  const set = setUnderYou();
  const io: AtlasReadIo = {
    outlines: {
      borders: async () => ({ set, complete: true, tooMany: false }),
      read: async () => ({ set, complete: true, tooMany: false }),
      known: async () => set,
    } as unknown as AtlasReadIo['outlines'],
    fetchTiles: (async () => labelTiles(cls, east)) as unknown as AtlasReadIo['fetchTiles'],
    fetchTileBodies: async () => [],
    readOverture: async () => null,
    archive: { read: async () => null },
    ring: async () => ({ profile: PROFILE, extent: null }),
    exploreBusy: () => false,
  };
  return { p, set, read: createAtlasRead({ ...p, io }) };
}

async function listed(cls: string, east = 9): Promise<{ rows: AtlasArea[]; set: OutlineSet }> {
  const { p, set, read } = setup(cls, east);
  await p.db.setMeta('tile_url', 'https://tiles.test/{z}/{x}/{y}.pbf');
  assert.equal(await read.readNear(HERE, 'town', BUILD, 12_000, () => false), true);
  return { rows: (await p.db.listAtlasAreas()).filter((r) => r.level === 'town'), set };
}

test('fix duplicate-city: a city whose label lies past a town\'s reach of the outline read under you is one town, at its label', async () => {
  const { rows, set } = await listed('city');
  assert.deepEqual(rows.map((r) => r.name), ['Bigcity'], 'one row, not the label and the outline\'s middle');
  assert.deepEqual(rows[0].at, km(9, 0), 'at its own label point');
  const cards = nearList(rows, HERE, 'town', BUILD, set);
  assert.equal(cards.length, 1, 'one card');
  assert.equal(cards[0].here, true, 'you are in it: its outline holds you');
});

test('fix duplicate-city: a city whose label is past a city\'s 10 km of the piece read, yet within the town read, is one town (Philadelphia\'s far north)', async () => {
  const { rows, set } = await listed('city', 11.5);
  assert.deepEqual(rows.map((r) => r.at), [km(11.5, 0)]);
  assert.equal(nearList(rows, HERE, 'town', BUILD, set)[0].here, true);
});

test('fix duplicate-city: a town (a town\'s reach) 9 km from a same-named outline read is still its own town', async () => {
  const { rows } = await listed('town');
  assert.equal(rows.length, 2, 'the label and the outline holding you stay two towns, as before');
});

test('fix duplicate-city: the town rows listed under the old code are listed again; neighborhood rows stand', () => {
  const row = (level: 'town' | 'neighborhood') => ({ build: BUILD, code: `a15.${ATLAS_CODE.split('.')[1]}`, level });
  assert.notEqual(ATLAS_CODE.split('.')[0], 'a15');
  assert.equal(rowCurrent(row('town'), BUILD), false, 'a duplicate town row of a15 goes');
  assert.equal(rowCurrent(row('neighborhood'), BUILD), true, 'the fix lists neighborhoods as before');
});
