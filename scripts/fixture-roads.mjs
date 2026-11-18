#!/usr/bin/env node
/**
 * Saves a test fixture for the road engine (RE5, RE6, RE10-RE12): the main roads of a block of real z12 tiles, as the map's tiles
 * give them (the `transportation` layer's line features of the kinds the engine reads, with class, oneway, ramp and brunnel, and
 * their geometry to 5 decimals, not clipped). Run by hand, never by CI:
 *
 *   node scripts/fixture-roads.mjs <an OpenMapTiles .mbtiles> <lon,lat at the block's middle> <tiles across> <out.json>
 *
 * The data used is tileserver-gl's `test_data.zip` (Zurich, a planetiler build), from its GitHub release.
 */
import { writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { DatabaseSync } from 'node:sqlite';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';

const [file, ptS, acrossS, out] = process.argv.slice(2);
if (!out) throw new Error('usage: fixture-roads.mjs <mbtiles> <lon,lat> <tiles across> <out.json>');
const Z = 12;
const KINDS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
const [lon, lat] = ptS.split(',').map(Number);
const n = 2 ** Z;
const r = (lat * Math.PI) / 180;
const cx = Math.floor(((lon + 180) / 360) * n);
const cy = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
const half = Math.floor(Number(acrossS) / 2);
const db = new DatabaseSync(file, { readOnly: true });
const get = db.prepare('select tile_data d from tiles where zoom_level = ? and tile_column = ? and tile_row = ?');
const round = (v) => Math.round(v * 1e5) / 1e5;
const tiles = [];
for (let x = cx - half; x <= cx + half; x++) {
  for (let y = cy - half; y <= cy + half; y++) {
    const row = get.get(Z, x, n - 1 - y);
    if (!row) continue;
    let buf = Buffer.from(row.d);
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
    const layer = new VectorTile(new PbfReader(buf)).layers.transportation;
    const features = [];
    for (let i = 0; layer && i < layer.length; i++) {
      const f = layer.feature(i);
      const p = f.properties;
      if (f.type !== 2 || !KINDS.has(p.class)) continue;
      const g = f.toGeoJSON(x, y, Z).geometry;
      const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
      features.push({ class: p.class, oneway: p.oneway ?? 0, ramp: p.ramp ? 1 : 0, brunnel: p.brunnel ?? null, lines: lines.map((l) => l.map(([a, b]) => [round(a), round(b)])) });
    }
    tiles.push({ z: Z, x, y, features });
  }
}
writeFileSync(out, `${JSON.stringify({ source: 'tileserver-gl test_data.zip (Zurich), z12', tiles })}\n`);
console.log(`${tiles.length} tiles, ${tiles.reduce((a, t) => a + t.features.length, 0)} features -> ${out}`);
