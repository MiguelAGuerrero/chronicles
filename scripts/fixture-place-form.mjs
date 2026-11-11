// Real fixtures for the place-form rule (specs/place-form PF15): for each place in scripts/fixtures/placeFormPlaces.json, the streets, street junctions,
// counted places (with their taxonomy) and building centroids within the card's 800 m ring, cut from Overture's tiles (the pinned release) and rounded to
// about a metre, with the owner's confirmed word beside them. A way keeps its street name: the busy-street features need it (PF25). Service ways, paths and steps are left out except sidewalks and crosswalks, kept so PF9 can remove them.
//
//   npx tsx scripts/fixture-place-form.mjs calibration|heldOut      (needs the network; writes src/lib/__tests__/walkability/placeForm<Set>.json)

import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles } from 'pmtiles';
import { overtureWeight } from '../src/lib/activity/weights';
import { countsOverture, overturePlacesFromTile } from '../src/lib/activity/points';
import { distanceM } from '../src/lib/geo';
import { tilesAround } from '../src/lib/walk/layer';
import { midOf } from '../src/lib/walk/match';
import { junctionsFromOvertureTile, waysFromOvertureTile } from '../src/lib/walk/overtureSegments';

// The ring is 800 m; the data goes 300 m beyond it so a test can move the centre that far (PF22).
const RING_M = 800;
const DATA_M = 1100;
const set = process.argv[2];
if (set !== 'calibration' && set !== 'heldOut') throw new Error('say calibration or heldOut');
const list = JSON.parse(readFileSync(new URL('./fixtures/placeFormPlaces.json', import.meta.url), 'utf8'));
const base = (n) => new PMTiles(`https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${list.release}/${n}.pmtiles`);
const [T, P, B] = [base('transportation'), base('places'), base('buildings')];
const KEEP = new Set(['residential', 'living_street', 'tertiary', 'unclassified', 'primary', 'secondary', 'trunk', 'motorway']);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const pt = (p) => [r5(p[0]), r5(p[1])];
const bytesOf = async (a, x, y) => {
  const t = await a.getZxy(14, x, y);
  if (!t) return null;
  let b = Buffer.from(t.data);
  if (b[0] === 0x1f) b = gunzipSync(b);
  return b;
};
const out = { release: list.release, confirmed: list.confirmed, ringM: RING_M, dataM: DATA_M, places: {} };
// --missing cuts only the places not already in the file and merges them in (so adding places does not recut the rest).
const file = new URL(`../src/lib/__tests__/walkability/placeForm${set === 'heldOut' ? 'HeldOut' : 'Calibration'}.json`, import.meta.url);
const merge = process.argv.includes('--missing') && existsSync(file);
const have = merge ? JSON.parse(readFileSync(file, 'utf8')) : null;
for (const place of list.places.filter((p) => p.set === set && !(have && have.places[p.id]))) {
  const tiles = tilesAround(place.at, DATA_M);
  const kx = 111320 * Math.cos((place.at[1] * Math.PI) / 180);
  const off = (q) => [Math.round((q[0] - place.at[0]) * kx), Math.round((q[1] - place.at[1]) * 110540)];
  const rec = { name: place.name, at: place.at, word: place.word, ...(place.accept !== undefined ? { accept: place.accept } : {}), tiles: tiles.map(([x, y]) => `${x}/${y}`), ways: [], junctions: [], places: [], buildings: [] };
  // Offsets are metres east and north of `at`, to the metre: junctions [dx, dy]; places [dx, dy, weight]; buildings flat [dx, dy, dx, dy, ...].
  for (const [x, y] of tiles) {
    const tb = await bytesOf(T, x, y);
    if (tb) {
      const ab = tb.buffer.slice(tb.byteOffset, tb.byteOffset + tb.byteLength);
      for (const w of waysFromOvertureTile(ab, x, y)) {
        const keep = KEEP.has(w.cls) || (w.cls === 'footway' && (w.sub === 'sidewalk' || w.sub === 'crosswalk'));
        if (!keep || distanceM(midOf(w.line), place.at) > DATA_M) continue;
        rec.ways.push({ id: `${x}/${y}:${rec.ways.length}`, cls: w.cls, ...(w.sub ? { sub: w.sub } : {}), ...(w.name ? { name: w.name } : {}), ...(w.speedKmh ? { speedKmh: w.speedKmh } : {}), level: w.level, line: w.line.map(pt) });
      }
      for (const j of junctionsFromOvertureTile(ab, x, y)) if (distanceM(j, place.at) <= DATA_M) rec.junctions.push(off(j));
    }
    const pb = await bytesOf(P, x, y);
    if (pb) {
      const l = new VectorTile(new PbfReader(new Uint8Array(pb))).layers.place;
      const fs = [];
      if (l) for (let i = 0; i < l.length; i++) fs.push(l.feature(i).toGeoJSON(x, y, 14));
      for (const p of overturePlacesFromTile(fs)) if (countsOverture(p) && distanceM(p.at, place.at) <= DATA_M) rec.places.push([...off(p.at), overtureWeight(p.hierarchy), p.hierarchy.slice(0, 2).join('>')]);
    }
    const bb = await bytesOf(B, x, y);
    if (bb) {
      const l = new VectorTile(new PbfReader(new Uint8Array(bb))).layers.building;
      if (l)
        for (let i = 0; i < l.length; i++) {
          const g = l.feature(i).toGeoJSON(x, y, 14).geometry;
          const ring = g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiPolygon' ? g.coordinates[0][0] : null;
          if (!ring) continue;
          let sx = 0;
          let sy = 0;
          for (const q of ring) {
            sx += q[0];
            sy += q[1];
          }
          const c = [sx / ring.length, sy / ring.length];
          if (distanceM(c, place.at) <= DATA_M) rec.buildings.push(off(c));
        }
    }
  }
  // A place on a tile edge can come from two tiles: once each.
  const seen = new Set();
  rec.places = rec.places.filter((p) => !seen.has(`${p[0]},${p[1]}`) && seen.add(`${p[0]},${p[1]}`));
  const bseen = new Set();
  rec.buildings = rec.buildings.filter((b) => !bseen.has(b.join()) && bseen.add(b.join())).flat();
  out.places[place.id] = rec;
  console.log(`${place.id}: ${tiles.length} tiles, ${rec.ways.length} ways, ${rec.junctions.length} junctions, ${rec.places.length} places, ${rec.buildings.length / 2} buildings`);
}
if (have) out.places = { ...have.places, ...out.places };
writeFileSync(file, JSON.stringify(out));
