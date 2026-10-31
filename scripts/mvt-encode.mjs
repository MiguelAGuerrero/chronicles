// Test harness only: encodes the e2e's fake GeoJSON world as Mapbox Vector
// Tiles, so the app's own tile decoder (landing, ambient) can read it the way
// it reads OpenFreeMap's tiles. Points and lines, string properties.
import { PbfWriter } from 'pbf';

const EXTENT = 4096;
const zig = (v) => (v << 1) ^ (v >> 31);

function toTile([lon, lat], z, x, y) {
  const n = 2 ** z;
  const tx = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const ty = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return [Math.round((tx - x) * EXTENT), Math.round((ty - y) * EXTENT)];
}

function geometry(points, line) {
  const out = [];
  let cx = 0;
  let cy = 0;
  points.forEach(([px, py], i) => {
    if (i === 0) out.push(1 | (1 << 3));
    else if (i === 1) out.push(2 | ((points.length - 1) << 3));
    out.push(zig(px - cx), zig(py - cy));
    cx = px;
    cy = py;
  });
  return line ? out : out.slice(0, 3);
}

/** The OpenMapTiles layer a fake feature belongs to. */
function layersOf(f) {
  const p = f.properties ?? {};
  if (f.geometry.type === 'LineString') return p.name ? ['transportation', 'transportation_name'] : ['transportation'];
  if (f.geometry.type === 'Point') return p.subclass ? ['poi'] : ['place'];
  return [];
}

export function encodeTile(features, z, x, y) {
  const byLayer = new Map();
  for (const f of features)
    for (const l of layersOf(f)) {
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l).push(f);
    }
  const pbf = new PbfWriter();
  for (const [name, fs] of byLayer) {
    const keys = [];
    const values = [];
    const index = (list, v) => {
      const i = list.indexOf(v);
      if (i >= 0) return i;
      list.push(v);
      return list.length - 1;
    };
    const encoded = fs.map((f) => {
      const tags = [];
      for (const [k, v] of Object.entries(f.properties ?? {})) tags.push(index(keys, k), index(values, String(v)));
      const line = f.geometry.type === 'LineString';
      const pts = (line ? f.geometry.coordinates : [f.geometry.coordinates]).map((p) => toTile(p, z, x, y));
      return { tags, type: line ? 2 : 1, geom: geometry(pts, line) };
    });
    pbf.writeMessage(3, (_, p) => {
      p.writeVarintField(15, 2);
      p.writeStringField(1, name);
      for (const f of encoded)
        p.writeMessage(2, (__, q) => {
          q.writePackedVarint(2, f.tags);
          q.writeVarintField(3, f.type);
          q.writePackedVarint(4, f.geom);
        }, null);
      for (const k of keys) p.writeStringField(3, k);
      for (const v of values) p.writeMessage(4, (__, q) => q.writeStringField(1, v), null);
      p.writeVarintField(5, EXTENT);
    }, null);
  }
  return pbf.finish();
}
