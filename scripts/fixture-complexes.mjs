#!/usr/bin/env node
/**
 * Saves a test fixture for complexes (CX1-CX3, CX14): from Overture's `buildings` and `places` tiles, the NAMED buildings
 * (a piece per z14 tile, with its building id, subtype and class, and its polygons to 6 decimals) and the places that lie
 * inside any of them (position and taxonomy hierarchy), which is all the rule reads. Run by hand, never by CI:
 *
 *   node scripts/fixture-complexes.mjs <release> <x0,y0,x1,y1> <out.json>
 *
 * The tile range is inclusive, z14. A piece is kept when it holds a place, touches its tile's edge (it may be one
 * part of a complex cut by the edge) or has a subtype the kinds read (medical, education, transportation, civic).
 */
import { writeFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';

const [release, range, out] = process.argv.slice(2);
if (!out) throw new Error('usage: fixture-complexes.mjs <release> <x0,y0,x1,y1> <out.json>');
const [x0, y0, x1, y1] = range.split(',').map(Number);
const base = `https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${release}`;
const buildings = new PMTiles(`${base}/buildings.pmtiles`);
const places = new PMTiles(`${base}/places.pmtiles`);
const layers = async (a, x, y) => {
  const t = await a.getZxy(14, x, y);
  return t ? new VectorTile(new PbfReader(new Uint8Array(t.data))).layers : null;
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
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const KINDS = new Set(['medical', 'education', 'transportation', 'civic']);

const tiles = [];
for (let x = x0; x <= x1; x++) {
  for (let y = y0; y <= y1; y++) {
    const B = (await layers(buildings, x, y))?.building;
    const P = (await layers(places, x, y))?.place;
    if (!B) continue;
    const pts = [];
    for (let i = 0; P && i < P.length; i++) {
      const f = P.feature(i);
      const g = f.toGeoJSON(x, y, 14);
      let tax = {};
      try { tax = JSON.parse(f.properties.taxonomy ?? '{}'); } catch {}
      pts.push({ at: g.geometry.coordinates, hierarchy: tax.hierarchy ?? [], name: f.properties['@name'] ?? null });
    }
    const n = 2 ** 14;
    const west = (x / n) * 360 - 180, east = ((x + 1) / n) * 360 - 180;
    const mercN = (t) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n))) * 180) / Math.PI;
    const north = mercN(y), south = mercN(y + 1);
    const pieces = [], held = new Set();
    for (let i = 0; i < B.length; i++) {
      const f = B.feature(i), p = f.properties;
      const name = typeof p['@name'] === 'string' ? p['@name'].trim() : '';
      if (!name) continue;
      const g = f.toGeoJSON(x, y, 14);
      const polygons = g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates;
      const inside = pts.filter((q) => inPoly(q.at, polygons));
      const edge = polygons.some((poly) => poly[0].some(([lo, la]) => Math.abs(lo - west) < 1e-6 || Math.abs(lo - east) < 1e-6 || Math.abs(la - north) < 1e-6 || Math.abs(la - south) < 1e-6));
      if (!inside.length && !edge && !KINDS.has(p.subtype)) continue;
      inside.forEach((q) => held.add(q));
      pieces.push({ id: String(p.id), name, subtype: p.subtype ?? null, class: p.class ?? null, polygons: polygons.map((poly) => poly.map((ring) => ring.map(([lo, la]) => [r6(lo), r6(la)]))) });
    }
    tiles.push({ x, y, buildings: pieces, places: [...held].map((q) => ({ at: [r6(q.at[0]), r6(q.at[1])], hierarchy: q.hierarchy, name: q.name })) });
    console.error(`z14 ${x}/${y}: ${pieces.length} named pieces, ${held.size} places inside`);
  }
}
writeFileSync(out, JSON.stringify({ release, tiles }));
