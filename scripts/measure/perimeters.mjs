#!/usr/bin/env node
/**
 * Step 0 of "places from the road" (specs/drive-in-the-outing, DO12, DO15): where could a large place's perimeter come from?
 * For one city it takes the large places the map's own tiles name as points, and counts how many lie inside a shape in
 * (a) the same tiles' park, landuse and landcover layers, and (b) Overture's base theme (land_use), and how many of those shapes
 * carry a name that matches the place's. Run by hand, never by CI:
 *
 *   node scripts/measure/perimeters.mjs <an OpenMapTiles .mbtiles> <west,south,east,north>
 *
 * The tiles used were tileserver-gl's test_data.zip (Zurich); Overture is read by byte range from its public bucket.
 */
import { gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { DatabaseSync } from 'node:sqlite';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';

const [file, boxS, release = '2026-10-21.0'] = process.argv.slice(2);
const [W, S, E, N] = boxS.split(',').map(Number);
const LARGE = new Set(['park', 'zoo', 'cemetery', 'stadium', 'golf', 'garden', 'college', 'university', 'hospital', 'pitch', 'attraction', 'theme_park', 'campsite']);
const tileOf = (lon, lat, z) => {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const inRing = (p, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPoly = (p, polys) => polys.some((rings) => inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h)));
const polysOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// (a) the map's own tiles
const db = new DatabaseSync(file, { readOnly: true });
const get = db.prepare('select tile_data d from tiles where zoom_level = ? and tile_column = ? and tile_row = ?');
const Z = 14;
const [x0, y0] = tileOf(W, N, Z);
const [x1, y1] = tileOf(E, S, Z);
const places = [];
const tileShapes = [];
const shapeClasses = {};
for (let x = x0; x <= x1; x++) {
  for (let y = y0; y <= y1; y++) {
    const row = get.get(Z, x, 2 ** Z - 1 - y);
    if (!row) continue;
    let buf = Buffer.from(row.d);
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
    const vt = new VectorTile(new PbfReader(buf));
    const poi = vt.layers.poi;
    for (let i = 0; poi && i < poi.length; i++) {
      const f = poi.feature(i);
      const p = f.properties;
      if (!p.name || !(LARGE.has(p.class) || LARGE.has(p.subclass))) continue;
      const g = f.toGeoJSON(x, y, Z).geometry;
      if (g.type !== 'Point' || tileOf(g.coordinates[0], g.coordinates[1], Z).join() !== `${x},${y}`) continue;
      places.push({ name: p.name, kind: LARGE.has(p.subclass) ? p.subclass : p.class, at: g.coordinates });
    }
    for (const layer of ['park', 'landuse', 'landcover']) {
      const l = vt.layers[layer];
      for (let i = 0; l && i < l.length; i++) {
        const f = l.feature(i);
        if (f.type !== 3) continue;
        const key = `${layer}:${f.properties.class ?? ''}`;
        shapeClasses[key] = (shapeClasses[key] ?? 0) + 1;
        tileShapes.push({ layer, cls: f.properties.class, name: f.properties.name ?? null, polys: polysOf(f.toGeoJSON(x, y, Z).geometry) });
      }
    }
  }
}

// (b) Overture's base theme
const pm = new PMTiles(`https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}/base.pmtiles`);
const head = await pm.getHeader();
const oz = Math.min(head.maxZoom, 13);
const [ox0, oy0] = tileOf(W, N, oz);
const [ox1, oy1] = tileOf(E, S, oz);
const overture = [];
const oClasses = {};
const layersSeen = new Set();
for (let x = ox0; x <= ox1; x++) {
  for (let y = oy0; y <= oy1; y++) {
    const t = await pm.getZxy(oz, x, y);
    if (!t) continue;
    const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
    for (const name of Object.keys(vt.layers)) {
      layersSeen.add(name);
      if (name !== 'land_use' && name !== 'land') continue;
      const l = vt.layers[name];
      for (let i = 0; i < l.length; i++) {
        const f = l.feature(i);
        if (f.type !== 3) continue;
        const p = f.properties;
        const key = `${name}:${p.subtype ?? ''}/${p.class ?? ''}`;
        oClasses[key] = (oClasses[key] ?? 0) + 1;
        const nm = p['@name'] ?? p.name ?? (typeof p.names === 'string' ? (JSON.parse(p.names).primary ?? null) : null);
        overture.push({ key, name: nm, id: p.id ?? null, polys: polysOf(f.toGeoJSON(x, y, oz).geometry) });
      }
    }
  }
}

const top = (o, n = 14) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ');
console.log(`box ${boxS}; map tiles z${Z}: ${places.length} named large places, ${tileShapes.length} shapes`);
console.log(`  kinds: ${top(places.reduce((o, p) => ((o[p.kind] = (o[p.kind] ?? 0) + 1), o), {}))}`);
console.log(`  shape classes: ${top(shapeClasses)}`);
console.log(`  shapes with a name: ${tileShapes.filter((s) => s.name).length}`);
console.log(`Overture base (${release}) z${oz}, maxzoom ${head.maxZoom}; layers: ${[...layersSeen].join(', ')}; ${overture.length} land shapes, ${overture.filter((s) => s.name).length} with a name, ${overture.filter((s) => s.id).length} with an id`);
console.log(`  classes: ${top(oClasses)}`);
let inTile = 0;
let inOv = 0;
let inOvNamed = 0;
let ovMatch = 0;
let neither = 0;
const byKind = {};
for (const p of places) {
  const a = tileShapes.some((s) => inPoly(p.at, s.polys));
  const hits = overture.filter((s) => inPoly(p.at, s.polys));
  const b = hits.length > 0;
  const named = hits.some((s) => s.name);
  const match = hits.some((s) => s.name && (norm(s.name) === norm(p.name) || norm(s.name).includes(norm(p.name)) || norm(p.name).includes(norm(s.name))));
  if (a) inTile++;
  if (b) inOv++;
  if (named) inOvNamed++;
  if (match) ovMatch++;
  if (!a && !b) neither++;
  const k = (byKind[p.kind] ??= { n: 0, tile: 0, ov: 0, match: 0 });
  k.n++;
  if (a) k.tile++;
  if (b) k.ov++;
  if (match) k.match++;
}
const pct = (n) => `${n} (${places.length ? Math.round((100 * n) / places.length) : 0}%)`;
console.log(`of ${places.length} places: inside a map-tile shape ${pct(inTile)}; inside an Overture shape ${pct(inOv)}, a named one ${pct(inOvNamed)}, one whose name matches ${pct(ovMatch)}; inside neither ${pct(neither)}`);
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k}: ${v.n} places; map tiles ${v.tile}; Overture ${v.ov}; name matched ${v.match}`);
