#!/usr/bin/env node
/**
 * Saves a test fixture for a town's pockets (TP4-TP6): the weighted activity points of Overture's places
 * inside the town's whole outline (the z10 division_area, as the borders read it), as [lon, lat, weight]
 * to 5 decimals. Run by hand with tsx, never by CI:
 *
 *   npx tsx scripts/fixture-town-points.mjs <release> <town name> <lon,lat inside it> <out.json>
 */
import { writeFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import { countsOverture, overturePlacesFromTile } from '../src/lib/activity/points';
import { overtureWeight } from '../src/lib/activity/weights';

const [release, name, ptS, out] = process.argv.slice(2);
if (!out) throw new Error('usage: fixture-town-points.mjs <release> <name> <lon,lat> <out.json>');
const pt = ptS.split(',').map(Number);
const base = `https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}`;
const tileXY = (Z, [lon, lat]) => {
  const n = 2 ** Z, r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const inRing = (p, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const inPoly = (p, polys) => polys.some((r) => inRing(p, r[0]) && !r.slice(1).some((h) => inRing(p, h)));

const div = new PMTiles(`${base}/divisions.pmtiles`);
const [x, y] = tileXY(10, pt);
const all = [];
for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
  const t = await div.getZxy(10, x + dx, y + dy);
  if (!t) continue;
  const L = new VectorTile(new PbfReader(new Uint8Array(t.data))).layers.division_area;
  for (let i = 0; L && i < L.length; i++) {
    const f = L.feature(i).toGeoJSON(x + dx, y + dy, 10);
    if (f.properties['@name'] !== name || f.properties.subtype !== 'locality') continue;
    all.push(...(f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
  }
}
const mine = all.filter((p) => inPoly(pt, [p]));
if (!mine.length) throw new Error(`no ${name} outline holds ${ptS}`);
let bb = [1e9, 1e9, -1e9, -1e9];
for (const p of mine) for (const [a, b] of p[0]) bb = [Math.min(bb[0], a), Math.min(bb[1], b), Math.max(bb[2], a), Math.max(bb[3], b)];
const [x0, y1] = tileXY(14, [bb[0], bb[1]]), [x1, y0] = tileXY(14, [bb[2], bb[3]]);
const pl = new PMTiles(`${base}/places.pmtiles`);
const seen = new Set(), points = [];
for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) {
  const t = await pl.getZxy(14, a, b);
  if (!t) continue;
  const L = new VectorTile(new PbfReader(new Uint8Array(t.data))).layers.place;
  const feats = [];
  for (let i = 0; L && i < L.length; i++) { const f = L.feature(i).toGeoJSON(a, b, 14); feats.push({ geometry: f.geometry, properties: f.properties }); }
  for (const p of overturePlacesFromTile(feats)) {
    if (seen.has(p.id) || !countsOverture(p) || !inPoly(p.at, mine)) continue;
    seen.add(p.id);
    points.push([Math.round(p.at[0] * 1e5) / 1e5, Math.round(p.at[1] * 1e5) / 1e5, overtureWeight(p.hierarchy)]);
  }
}
writeFileSync(out, JSON.stringify({ release, name, at: pt, bbox: bb, tiles: (x1 - x0 + 1) * (y1 - y0 + 1), points }));
console.log(`${name}: ${points.length} points, ${(x1 - x0 + 1) * (y1 - y0 + 1)} z14 tiles → ${out}`);
