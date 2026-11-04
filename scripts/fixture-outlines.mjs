#!/usr/bin/env node
/**
 * Saves a test fixture from Overture's real divisions tiles (town outlines,
 * TO1-TO4): the z12 tiles under the given points, keeping only the features
 * whose name is listed, as the app's decoder receives them (GeoJSON features
 * from `toGeoJSON`). Run by hand, never by CI:
 *
 *   node scripts/fixture-outlines.mjs <release> <out.json> <names,comma,separated> <lon,lat> [<lon,lat> ...]
 */
import { writeFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';

const [release, out, namesS, ...pts] = process.argv.slice(2);
if (!pts.length) throw new Error('usage: fixture-outlines.mjs <release> <out.json> <names> <lon,lat> ...');
const names = new Set(namesS.split(','));
const Z = 12;
const tileOf = ([lon, lat]) => {
  const n = 2 ** Z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const r6 = (v) => (Array.isArray(v) ? v.map(r6) : Math.round(v * 1e6) / 1e6);
const keys = new Set(pts.map((s) => tileOf(s.split(',').map(Number)).join('/')));
const archive = new PMTiles(`https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}/divisions.pmtiles`);
const tiles = [];
for (const key of keys) {
  const [x, y] = key.split('/').map(Number);
  const t = await archive.getZxy(Z, x, y);
  if (!t) continue;
  const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
  const layers = {};
  for (const id of ['division_area', 'division']) {
    const L = vt.layers[id];
    layers[id] = [];
    for (let i = 0; L && i < L.length; i++) {
      const f = L.feature(i).toGeoJSON(x, y, Z);
      if (!names.has(f.properties['@name'])) continue;
      layers[id].push({ geometry: { type: f.geometry.type, coordinates: r6(f.geometry.coordinates) }, properties: f.properties });
    }
  }
  tiles.push({ x, y, ...layers });
}
writeFileSync(out, JSON.stringify({ release, z: Z, tiles }));
console.log(`wrote ${out}: ${tiles.length} tiles`);
