/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
// @ts-expect-error: a plain ES module script, no types
import { writeArchive } from '../../../../scripts/places-archive/archive.mjs';

// Places worth the stop: the build script's archive writer (PW14), written from the spec before the code.

/** pmtiles' own reader over bytes in memory, as the app reads them over the network. */
const memory = (buf: Uint8Array): Source => ({
  getKey: () => 'memory',
  getBytes: async (offset: number, length: number): Promise<RangeResponse> => ({ data: buf.slice(offset, offset + length).buffer }),
});

const place = (name: string, lon: number, lat: number, cls = 'folly') => ({ name, lon, lat, class: cls, src: 'wd', id: `Q${name.length}${Math.round(lon * 1000)}` });

async function featuresAt(buf: Uint8Array, z: number, x: number, y: number) {
  const t = await new PMTiles(memory(buf)).getZxy(z, x, y);
  if (!t) return [];
  const layer = new VectorTile(new PbfReader(new Uint8Array(t.data))).layers.places;
  return Array.from({ length: layer?.length ?? 0 }, (_, i) => layer!.feature(i).toGeoJSON(x, y, z));
}

test('PW14: the archive is the same bytes each time, and the app\'s reader finds each place in its z12 tile', async () => {
  const places = [place('Bushkill Folly', -75.2, 40.7), place('Odd Rock', -75.19, 40.69, 'natural_oddity')];
  const a = writeArchive(places);
  const b = writeArchive([...places].reverse());
  assert.deepEqual(Buffer.from(a), Buffer.from(b), 'the same bytes, whatever order the inputs came in');
  const header = await new PMTiles(memory(a)).getHeader();
  assert.deepEqual([header.minZoom, header.maxZoom, header.tileType, header.clustered], [12, 12, 1, true]);
  const z = 12;
  const n = 2 ** z;
  const x = Math.floor(((-75.2 + 180) / 360) * n);
  const r = (40.7 * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  const got = await featuresAt(a, z, x, y);
  const names = got.map((f) => f.properties.name).sort();
  assert.deepEqual(names, ['Bushkill Folly', 'Odd Rock']);
  const folly = got.find((f) => f.properties.name === 'Bushkill Folly')!;
  assert.deepEqual(Object.keys(folly.properties).sort(), ['class', 'id', 'name', 'src'], 'PW7: nothing else rides along');
  const [lon, lat] = (folly.geometry as { coordinates: number[] }).coordinates;
  assert.ok(Math.abs(lon + 75.2) < 0.0002 && Math.abs(lat - 40.7) < 0.0002, `within a few metres (${lon}, ${lat})`);
});

test('PW14: the root directory always fits in the reader\'s first read; leaf directories hold the rest, and every tile is found', async () => {
  // Places scattered over the US, as real ones are: their tile ids compress poorly, so the root alone won't fit.
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const places = Array.from({ length: 80000 }, (_, i) => place(`P${i}`, -124 + rand() * 57, 25 + rand() * 24));
  const us = await new PMTiles(memory(writeArchive(places))).getHeader();
  assert.ok(us.rootDirectoryOffset + us.rootDirectoryLength <= 16384, 'a US-sized root fits in the 16 KB first read');
  // A smaller first read forces leaf directories, so the path a larger archive takes is read for real.
  const buf = writeArchive(places, { firstRead: 2048 });
  const header = await new PMTiles(memory(buf)).getHeader();
  assert.ok(header.rootDirectoryOffset + header.rootDirectoryLength <= 2048, 'the root fits the smaller read');
  assert.ok(header.leafDirectoryLength > 0, 'leaf directories hold the rest');
  for (const i of [0, 12345, 79999]) {
    const p = places[i];
    const n = 2 ** 12;
    const x = Math.floor(((p.lon + 180) / 360) * n);
    const r = (p.lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
    assert.ok((await featuresAt(buf, 12, x, y)).some((f) => f.properties.name === p.name), `tile of ${p.name}`);
  }
});
