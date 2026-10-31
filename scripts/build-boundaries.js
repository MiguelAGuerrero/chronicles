#!/usr/bin/env node
// Builds a boundary pack (src/lib/areas/boundaryPack.ts) from Natural Earth's
// admin-1 states and provinces (public domain, naturalearthdata.com).
//
//   node scripts/build-boundaries.js <ne_10m_admin_1_states_provinces.geojson> <ISO_A2,...> <out.json> [edition]
//
// The app never reads Natural Earth's format: another dataset gets its own
// script that writes the same pack. Outlines are simplified to about 300 m and
// rounded to about 10 m, which is plenty for "which state is this walk in".
const fs = require('fs');

const [src, codes, out, edition = 'v5.1.1'] = process.argv.slice(2);
if (!src || !codes || !out) {
  console.error('usage: build-boundaries.js <admin1.geojson> <ISO_A2,...> <out.json> [edition]');
  process.exit(1);
}
const wanted = new Set(codes.split(','));
const TOLERANCE = 0.003;
const round = (v) => Math.round(v * 1e4) / 1e4;

// Douglas-Peucker on one ring, keeping its closure.
function simplify(ring) {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const len = Math.hypot(bx - ax, by - ay);
    let best = -1;
    let bestD = 0;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on one point: measure from it, not from a line.
      const d = len < 1e-12
        ? Math.hypot(ring[i][0] - ax, ring[i][1] - ay)
        : Math.abs((by - ay) * ring[i][0] - (bx - ax) * ring[i][1] + bx * ay - by * ax) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best > 0 && bestD > TOLERANCE) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  const outRing = ring.filter((_, i) => keep[i]).map(([x, y]) => [round(x), round(y)]);
  return outRing.length >= 4 ? outRing : null;
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const states = [];
const countries = new Map();
for (const f of data.features) {
  const p = f.properties;
  if (!wanted.has(p.iso_a2)) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const polygons = polys.map((rings) => rings.map(simplify).filter(Boolean)).filter((rings) => rings.length && rings[0]);
  if (!polygons.length) continue;
  const xs = polygons.flatMap((r) => r[0].map((c) => c[0]));
  const ys = polygons.flatMap((r) => r[0].map((c) => c[1]));
  const at = [round(p.longitude), round(p.latitude)];
  states.push({ name: p.name, code: p.iso_3166_2, country: p.iso_a2, at, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], polygons });
  const c = countries.get(p.iso_a2) ?? { name: p.admin, code: p.iso_a2, xs: 0, ys: 0, n: 0 };
  c.xs += at[0];
  c.ys += at[1];
  c.n++;
  countries.set(p.iso_a2, c);
}
const pack = {
  id: `naturalearth-10m-admin1-${edition}/${[...wanted].join(',')}`,
  countries: [...countries.values()].map((c) => ({ name: c.name, code: c.code, at: [round(c.xs / c.n), round(c.ys / c.n)] })),
  states,
};
fs.writeFileSync(out, JSON.stringify(pack));
console.log(`${states.length} states in ${countries.size} countries, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
