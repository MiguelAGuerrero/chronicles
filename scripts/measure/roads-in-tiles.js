// Step 0 of the road engine's plan: what do real OpenMapTiles tiles hold for roads at low zooms? Reads an .mbtiles given as argv[2].
const path = require('path');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');
const root = process.argv[3];
const { VectorTile } = require(path.join(root, 'node_modules/@mapbox/vector-tile'));
let Pbf;
(async () => { Pbf = (await import(path.join(root, 'node_modules/pbf/index.js'))).PbfReader;
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const meta = Object.fromEntries(db.prepare('select name, value from metadata').all().map((r) => [r.name, r.value]));
console.log('bounds', meta.bounds, 'minzoom', meta.minzoom, 'maxzoom', meta.maxzoom);
const R = 6371008.8, D = Math.PI / 180;
const dist = (a, b) => { const x = (b[0] - a[0]) * D * Math.cos(((a[1] + b[1]) / 2) * D), y = (b[1] - a[1]) * D; return Math.hypot(x, y) * R; };
const KEEP = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
function tileRect(z, x, y) { const n = 2 ** z; const lon = (v) => (v / n) * 360 - 180; const lat = (v) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * v) / n))) * 180) / Math.PI; return [lon(x), lat(y + 1), lon(x + 1), lat(y)]; }
function clip(line, [w, s, e, n]) { // keep the parts inside the tile's own rectangle (Liang-Barsky per piece)
  const out = []; let cur = [];
  for (let i = 0; i < line.length - 1; i++) {
    let [x0, y0] = line[i], [x1, y1] = line[i + 1]; let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0; let ok = true;
    for (const [p, q] of [[-dx, x0 - w], [dx, e - x0], [-dy, y0 - s], [dy, n - y0]]) {
      if (p === 0) { if (q < 0) ok = false; } else { const r = q / p; if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; } }
    }
    if (!ok) { if (cur.length > 1) out.push(cur); cur = []; continue; }
    const a = [x0 + t0 * dx, y0 + t0 * dy], b = [x0 + t1 * dx, y0 + t1 * dy];
    if (!cur.length) cur.push(a); else if (t0 > 0) { if (cur.length > 1) out.push(cur); cur = [a]; }
    cur.push(b); if (t1 < 1) { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur); return out;
}
for (const z of [9, 10, 11, 12, 13, 14]) {
  const rows = db.prepare('select tile_column x, tile_row y, tile_data d from tiles where zoom_level = ?').all(z);
  if (!rows.length) { console.log(`z${z}: no tiles`); continue; }
  const t0 = Date.now();
  const cls = {}, props = { oneway: 0, ramp: 0, ref: 0, name: 0 }; let feats = 0, kept = 0, verts = 0, km = 0; const roads = []; let named = 0, nameLayer = 0;
  for (const r of rows) {
    const y = 2 ** z - 1 - r.y; let buf = Buffer.from(r.d); if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
    const vt = new VectorTile(new Pbf(buf)); const layer = vt.layers.transportation; const rect = tileRect(z, r.x, y);
    if (vt.layers.transportation_name) nameLayer += vt.layers.transportation_name.length;
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i); if (f.type !== 2) continue; feats++; const p = f.properties; cls[p.class] = (cls[p.class] ?? 0) + 1;
      if (!KEEP.has(p.class)) continue; kept++;
      for (const k of Object.keys(props)) if (p[k] !== undefined && p[k] !== 0 && p[k] !== '') props[k]++;
      const g = f.toGeoJSON(r.x, y, z).geometry; const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
      for (const l of lines) for (const c of clip(l, rect)) { roads.push({ c, oneway: p.oneway ?? 0, cls: p.class, ramp: p.ramp ? 1 : 0 }); verts += c.length; for (let j = 1; j < c.length; j++) km += dist(c[j - 1], c[j]) / 1000; }
    }
  }
  const line = [`z${z}: tiles ${rows.length}, line features ${feats}, kept ${kept}, pieces ${roads.length}, vertices ${verts}, km ${km.toFixed(0)}`,
    `classes ${Object.entries(cls).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k}:${v}`).join(' ')}`,
    `of kept: oneway ${props.oneway}, ramp ${props.ramp}, ref ${props.ref}, name ${props.name}; name-layer features ${nameLayer}`];
  // Connectivity: join piece ENDS within tol metres (grid of tol-sized cells, 9-cell look), inner vertices by identity; then components by road km.
  for (const tol of [1, 3, 10, 30]) {
    const cell = (p) => [Math.floor((p[0] * D * R * Math.cos(47.4 * D)) / tol), Math.floor((p[1] * D * R) / tol)];
    const ids = new Map(); const pts = []; const parent = [];
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const node = (p) => { const [cx, cy] = cell(p); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const b = ids.get(`${cx + dx},${cy + dy}`); if (b) for (const i of b) if (dist(pts[i], p) <= tol) return i; } const i = pts.length; pts.push(p); parent.push(i); const k = `${cx},${cy}`; (ids.get(k) ?? ids.set(k, []).get(k)).push(i); return i; };
    const len = new Map();
    const ends = roads.map((r) => { const a = node(r.c[0]), b = node(r.c[r.c.length - 1]); const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; return [a, b]; });
    // junctions in the middle of a piece: any end that lies on another piece's inner vertex within tol
    const inner = new Map(); roads.forEach((r, ri) => { for (let j = 1; j < r.c.length - 1; j++) { const [cx, cy] = cell(r.c[j]); const k = `${cx},${cy}`; (inner.get(k) ?? inner.set(k, []).get(k)).push([ri, j]); } });
    roads.forEach((r, ri) => { for (const e of [0, r.c.length - 1]) { const p = r.c[e]; const [cx, cy] = cell(p); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [oi, j] of inner.get(`${cx + dx},${cy + dy}`) ?? []) if (oi !== ri && dist(roads[oi].c[j], p) <= tol) { const a = find(ends[ri][0]), b = find(ends[oi][0]); if (a !== b) parent[a] = b; } } });
    roads.forEach((r, ri) => { let m = 0; for (let j = 1; j < r.c.length; j++) m += dist(r.c[j - 1], r.c[j]); const k = find(ends[ri][0]); len.set(k, (len.get(k) ?? 0) + m); });
    const parts = [...len.values()].sort((a, b) => b - a); const total = parts.reduce((a, b) => a + b, 0);
    line.push(`  join ${tol} m: parts ${parts.length}, largest ${(100 * parts[0] / total).toFixed(1)}% of road km, next ${(100 * (parts[1] ?? 0) / total).toFixed(1)}%, nodes ${pts.length}`);
  }
  console.log(line.join('\n  '), `\n  (${Date.now() - t0} ms)`);
}
})();
