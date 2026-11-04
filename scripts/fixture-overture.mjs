#!/usr/bin/env node
/**
 * Saves a test fixture from Overture's real tiles: places and named streets
 * within a radius of a point, for one release (AD11). Run by hand, never by CI:
 *
 *   node scripts/fixture-overture.mjs <release> <lon> <lat> <radiusM> <out.json>
 *
 * Places keep only what the density reads (name, position, taxonomy, confidence,
 * operating status); streets become StreetSegment-like pieces with their class.
 */
import { writeFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';

const [release, lonS, latS, radiusS, out] = process.argv.slice(2);
if (!out) throw new Error('usage: fixture-overture.mjs <release> <lon> <lat> <radiusM> <out.json>');
const lon = Number(lonS), lat = Number(latS), radius = Number(radiusS);
const base = `https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}`;
const Z = 14;
const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 111320;
const dist = ([x, y]) => Math.hypot((x - lon) * kx, (y - lat) * ky);
const tileX = (lo) => Math.floor(((lo + 180) / 360) * 2 ** Z);
const tileY = (la) => Math.floor(((1 - Math.log(Math.tan((la * Math.PI) / 180) + 1 / Math.cos((la * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z);
const tiles = [];
for (let x = tileX(lon - radius / kx); x <= tileX(lon + radius / kx); x++)
  for (let y = tileY(lat + radius / ky); y <= tileY(lat - radius / ky); y++) tiles.push([x, y]);
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const json = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

const places = new Map();
const streets = [];
for (const theme of ['places', 'transportation']) {
  const p = new PMTiles(`${base}/${theme}.pmtiles`);
  for (const [x, y] of tiles) {
    const t = await p.getZxy(Z, x, y);
    if (!t) continue;
    const vt = new VectorTile(new PbfReader(new Uint8Array(t.data)));
    if (theme === 'places') {
      const L = vt.layers.place;
      for (let i = 0; L && i < L.length; i++) {
        const f = L.feature(i).toGeoJSON(x, y, Z);
        const pr = f.properties;
        const at = f.geometry.coordinates.map(r6);
        if (dist(at) > radius || places.has(pr.id)) continue;
        places.set(pr.id, {
          name: pr['@name'] ?? null, at,
          hierarchy: json(pr.taxonomy)?.hierarchy ?? [],
          confidence: Math.round(Number(pr.confidence) * 1000) / 1000,
          operating_status: pr.operating_status ?? null,
        });
      }
    } else {
      const L = vt.layers.segment;
      for (let i = 0; L && i < L.length; i++) {
        const f = L.feature(i).toGeoJSON(x, y, Z);
        const pr = f.properties;
        if (pr.subtype !== 'road' || !pr['@name']) continue;
        const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [];
        const kept = lines.map((l) => l.map(([a, b]) => [r6(a), r6(b)])).filter((l) => l.some((q) => dist(q) <= radius));
        if (kept.length) streets.push({ name: pr['@name'], class: pr.class ?? 'unknown', geometry: kept });
      }
    }
  }
}
writeFileSync(out, JSON.stringify({ release, centre: [lon, lat], radiusM: radius, places: [...places.values()], streets }));
console.log(`${places.size} places, ${streets.length} street pieces → ${out}`);
