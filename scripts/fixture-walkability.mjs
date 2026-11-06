// Real fixtures for the walkability rule (specs/walkability-urban-form UF4): the streets, crossings, sidewalks and
// junctions within 800 m of five places, cut from Overture's transportation tiles (release 2026-10-21.0) and rounded to
// about a metre. Service ways, paths and steps are left out: they count for nothing (UF2) and are the bulk of a tile.
//
//   npx tsx scripts/fixture-walkability.mjs        (needs the network; writes src/lib/__tests__/walkability/walkFixtures.json)

import { writeFileSync } from 'node:fs';
import { PMTiles } from 'pmtiles';
import { gunzipSync } from 'node:zlib';
import { distanceM } from '../src/lib/geo';
import { tileAt, tileRect } from '../src/lib/tileMath';
import { midOf } from '../src/lib/walk/match';
import { tilesAround } from '../src/lib/walk/layer';
import { junctionsFromOvertureTile, waysFromOvertureTile } from '../src/lib/walk/overtureSegments';

const RELEASE = '2026-10-21.0';
const archive = new PMTiles(`https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/${RELEASE}/transportation.pmtiles`);
const PLACES = {
  allentownDowntown: { name: 'Allentown downtown (Hamilton Street at 7th)', at: [-75.4714, 40.6023] },
  allentownGrid: { name: 'Allentown residential grid (19th and Liberty)', at: [-75.5, 40.6] },
  lvMall: { name: 'Lehigh Valley Mall (big-box, car-oriented)', at: [-75.4925, 40.6455] },
  suburb: { name: 'Upper Macungie suburb (cul-de-sacs)', at: [-75.575, 40.555] },
  zurich: { name: 'Zurich, Altstadt', at: [8.5417, 47.3769] },
};
const KEEP = new Set(['residential', 'living_street', 'tertiary', 'unclassified', 'primary', 'secondary', 'trunk', 'motorway']);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const pt = (p) => [r5(p[0]), r5(p[1])];

const out = { release: RELEASE, places: {} };
for (const [key, place] of Object.entries(PLACES)) {
  const tiles = {};
  for (const [x, y] of tilesAround(place.at, 800)) {
    const t = await archive.getZxy(14, x, y);
    const k = `${x}/${y}`;
    tiles[k] = { ways: [], junctions: [] };
    if (!t) continue;
    let b = Buffer.from(t.data);
    if (b[0] === 0x1f) b = gunzipSync(b);
    const bytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    for (const w of waysFromOvertureTile(bytes, x, y)) {
      const keep = KEEP.has(w.cls) || (w.cls === 'footway' && (w.sub === 'sidewalk' || w.sub === 'crosswalk'));
      if (!keep || distanceM(midOf(w.line), place.at) > 800) continue;
      tiles[k].ways.push({ id: `${tiles[k].ways.length}`, cls: w.cls, ...(w.sub ? { sub: w.sub } : {}), ...(w.speedKmh ? { speedKmh: w.speedKmh } : {}), level: w.level, line: w.line.map(pt) });
    }
    for (const j of junctionsFromOvertureTile(bytes, x, y)) if (distanceM(j, place.at) <= 800) tiles[k].junctions.push(pt(j));
  }
  out.places[key] = { name: place.name, at: place.at, tiles };
  const n = Object.values(tiles).reduce((a, t) => a + t.ways.length, 0);
  console.log(`${key}: ${Object.keys(tiles).length} tiles, ${n} ways`);
}
void tileAt; void tileRect;
writeFileSync(new URL('../src/lib/__tests__/walkability/walkFixtures.json', import.meta.url), JSON.stringify(out));
