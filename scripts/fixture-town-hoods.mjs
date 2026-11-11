#!/usr/bin/env node
/**
 * Saves a test fixture for a town's whole list of neighborhoods (whole towns, WT1-WT6): the z10 Overture
 * divisions tile under a point (the localities whose outline meets the town's box, as the app's decoder
 * receives them) and the place points of the OpenMapTiles z14 tiles over the town's box (neighbourhood,
 * suburb, quarter, hamlet, village, town, city), with their class and name only. Run by hand, never by CI:
 *
 *   node scripts/fixture-town-hoods.mjs <overture release> <tiles build> <town> <lon,lat> <out.json>
 *
 * The tiles build is OpenFreeMap's folder name, e.g. 20261101_080013_pt.
 */
import { writeFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';

const [release, build, town, ptS, out] = process.argv.slice(2);
if (!out) throw new Error('usage: fixture-town-hoods.mjs <release> <build> <town> <lon,lat> <out.json>');
const pt = ptS.split(',').map(Number);
const tileOf = (Z, [lon, lat]) => {
  const n = 2 ** Z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const r6 = (v) => (Array.isArray(v) ? v.map(r6) : Math.round(v * 1e6) / 1e6);
const boxOf = (coords) => {
  const flat = JSON.stringify(coords).match(/-?\d+(\.\d+)?(e-?\d+)?/g).map(Number);
  const xs = flat.filter((_, i) => i % 2 === 0), ys = flat.filter((_, i) => i % 2 === 1);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const meets = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

const archive = new PMTiles(`https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}/divisions.pmtiles`);
const [x, y] = tileOf(10, pt);
const t = await archive.getZxy(10, x, y);
if (!t) throw new Error('no divisions tile');
const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
const all = (id) => Array.from({ length: vt.layers[id]?.length ?? 0 }, (_, i) => vt.layers[id].feature(i).toGeoJSON(x, y, 10));
const areas = all('division_area').filter((f) => f.properties.subtype === 'locality');
const own = areas.filter((f) => f.properties['@name'] === town);
if (!own.length) throw new Error(`no outline named ${town}`);
const box = own.map((f) => boxOf(f.geometry.coordinates)).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
const kept = areas.filter((f) => meets(boxOf(f.geometry.coordinates), box));
const ids = new Set(kept.map((f) => f.properties.division_id));
const keep = (f) => ({ geometry: { type: f.geometry.type, coordinates: r6(f.geometry.coordinates) }, properties: f.properties });
const division = all('division').filter((f) => ids.has(f.properties.id)).map(keep);

const CLASSES = new Set(['neighbourhood', 'suburb', 'quarter', 'hamlet', 'village', 'town', 'city']);
const [x0, y0] = tileOf(14, [box[0], box[3]]);
const [x1, y1] = tileOf(14, [box[2], box[1]]);
const places = new Map();
for (let tx = x0; tx <= x1; tx++) {
  for (let ty = y0; ty <= y1; ty++) {
    const res = await fetch(`https://tiles.openfreemap.org/planet/${build}/14/${tx}/${ty}.pbf`);
    if (!res.ok) throw new Error(`tile 14/${tx}/${ty}: ${res.status}`);
    const L = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer()))).layers.place;
    for (let i = 0; L && i < L.length; i++) {
      const f = L.feature(i).toGeoJSON(tx, ty, 14);
      const { class: cls, name } = f.properties;
      if (!CLASSES.has(cls) || !name || f.geometry.type !== 'Point') continue;
      places.set(`${cls}|${name}`, { geometry: { type: 'Point', coordinates: r6(f.geometry.coordinates) }, properties: { class: cls, name } });
    }
  }
}
writeFileSync(out, JSON.stringify({ release, build, town, box: r6(box), tile: { x, y, division_area: kept.map(keep), division }, places: [...places.values()] }));
console.log(`wrote ${out}: ${kept.length} outlines, ${places.size} place points`);
