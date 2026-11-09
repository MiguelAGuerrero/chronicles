// The coverage benchmark (Remarkable and public, RP17, decision 0104): the Nov 9 measurement, kept. For a fixed set of
// areas it reads the map tiles (OpenFreeMap's current build) and Wikidata, runs the app's own rules over them, and
// prints, per area, the destinations, those shown, those the archive's rule would add, and those still missed with
// why; places the archive would add with no street or path within 60 m are flagged "may not be reachable" (RP20).
// Network only; never in `npm test` or CI. Its reports are the owner's, in words and lists, never a percentage.
//
//   npm run places:coverage [-- --area bethlehem] [-- --review out/review-us-20261109.json]
import { readFileSync } from 'node:fs';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { isMarkable } from '../src/lib/discovery/noise';
import { placesFromTilePois } from '../src/lib/discovery/tilePois';
import { wayNear } from '../src/lib/explore/reach/rule';
import type { LngLat } from '../src/lib/types';
import { isDestination, outcome } from './places-archive/coverage.mjs';
import { keep, NHL, NRHP } from './places-archive/classify.mjs';

const AGENT = 'Chronicles places coverage (+github.com/MiguelAGuerrero/chronicles; owner-run, one query at a time)';
/** The Nov 9 areas: three Lehigh Valley towns, a small tourist town, two cities' cores and one outside the US. */
const AREAS: Record<string, LngLat> = {
  bethlehem: [-75.372, 40.617], allentown: [-75.47, 40.603], easton: [-75.212, 40.69], jimthorpe: [-75.737, 40.866],
  pittsburgh: [-79.993, 40.443], philadelphia: [-75.148, 39.95], zurich: [8.542, 47.372],
};
const HALF_M = 1670;

type Item = { id: string; name: string; at: LngLat; lon: number; lat: number; p31: string[]; heritage: string[]; listed: boolean; nhl: boolean; dissolved: boolean };
type Feature = { type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown>; zoom: number };

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
};
const boxOf = ([lon, lat]: LngLat): [number, number, number, number] => {
  const dLat = HALF_M / 110540;
  const dLon = HALF_M / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
};
const tileOf = (lon: number, lat: number, z: number) => {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};

async function wikidata([w, s, e, n]: number[]): Promise<Item[]> {
  const q = `SELECT ?item ?itemLabel ?coord (GROUP_CONCAT(DISTINCT ?c;separator="|") AS ?cls) (GROUP_CONCAT(DISTINCT ?h;separator="|") AS ?her) (SAMPLE(?d) AS ?dis) WHERE {
    SERVICE wikibase:box { ?item wdt:P625 ?coord . bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral . bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral . }
    OPTIONAL { ?item wdt:P31 ?c } OPTIONAL { ?item wdt:P1435 ?h } OPTIONAL { ?item wdt:P576 ?d }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,de". }
  } GROUP BY ?item ?itemLabel ?coord`;
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { 'user-agent': AGENT, accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
  const qid = (u: string) => u.replace(/^.*\//, '');
  const rows = (await res.json()).results.bindings as Record<string, { value: string } | undefined>[];
  return rows.flatMap((r) => {
    const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.coord?.value ?? '');
    const name = r.itemLabel?.value ?? '';
    if (!m || /^Q\d+$/.test(name)) return [];
    const heritage = r.her?.value ? r.her.value.split('|').map(qid) : [];
    const at: LngLat = [Number(m[1]), Number(m[2])];
    return [{ id: qid(r.item!.value), name, at, lon: at[0], lat: at[1], p31: r.cls?.value ? r.cls.value.split('|').map(qid) : [], heritage, listed: heritage.includes(NRHP), nhl: heritage.includes(NHL), dissolved: !!r.dis }];
  });
}

async function tiles(box: number[]) {
  const json = await (await fetch('https://tiles.openfreemap.org/planet')).json();
  const url = String(json.tiles[0]);
  const [xa, ya] = tileOf(box[0], box[3], 14);
  const [xb, yb] = tileOf(box[2], box[1], 14);
  const pois: Feature[] = [];
  const ways: LngLat[][] = [];
  for (let x = xa; x <= xb; x++)
    for (let y = ya; y <= yb; y++) {
      const res = await fetch(url.replace('{z}', '14').replace('{x}', String(x)).replace('{y}', String(y)));
      if (!res.ok) continue;
      const vt = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer())));
      const poi = vt.layers.poi;
      for (let i = 0; poi && i < poi.length; i++) pois.push({ ...(poi.feature(i).toGeoJSON(x, y, 14) as unknown as Feature), zoom: 14 });
      const tr = vt.layers.transportation;
      for (let i = 0; tr && i < tr.length; i++) {
        const g = tr.feature(i).toGeoJSON(x, y, 14).geometry;
        if (g.type === 'LineString') ways.push(g.coordinates as LngLat[]);
        if (g.type === 'MultiLineString') ways.push(...(g.coordinates as LngLat[][]));
      }
    }
  return { build: url.split('/')[4] ?? 'unknown', pois, ways };
}

const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'none');

async function main() {
  const only = arg('area');
  const review = arg('review') ? (JSON.parse(readFileSync(arg('review')!, 'utf8')) as { areas: { name: string; places: { name: string; at: LngLat }[] }[] }) : null;
  for (const [area, centre] of Object.entries(AREAS)) {
    if (only && only !== area) continue;
    const box = boxOf(centre);
    const [items, t] = await Promise.all([wikidata(box), tiles(box)]);
    const places = placesFromTilePois(t.pois as never, t.build).map((p) => ({ name: p.name, at: p.at, mark: isMarkable(p) }));
    const raw = t.pois.map((f) => ({ name: String(f.properties.name ?? ''), at: f.geometry.coordinates as LngLat }));
    const by: Record<string, string[]> = { shown: [], 'stopped by the name rule': [], 'dropped by the adapter': [], 'not in the tiles': [] };
    const adds: string[] = [];
    const far: string[] = [];
    for (const it of items.filter(isDestination)) {
      const o = outcome(it, { places, raw });
      by[o].push(it.name);
      if (o !== 'shown' && keep(it)) {
        adds.push(it.name);
        if (wayNear(it.at, t.ways) === false) far.push(it.name);
      }
    }
    for (const p of review?.areas.find((a) => a.name.toLowerCase() === area)?.places ?? [])
      if (wayNear(p.at, t.ways) === false && !far.includes(p.name)) far.push(p.name);
    const n = Object.values(by).reduce((a, b) => a + b.length, 0);
    console.log(`\n## ${area} (tiles ${t.build})\n${n} destinations.`);
    console.log(`Shown: ${list(by.shown)}`);
    console.log(`The archive's rule would add: ${list(adds)}`);
    console.log(`Still missed, not in the tiles: ${list(by['not in the tiles'].filter((x) => !adds.includes(x)))}`);
    console.log(`Still missed, dropped by the adapter: ${list(by['dropped by the adapter'].filter((x) => !adds.includes(x)))}`);
    console.log(`Still missed, stopped by the name rule: ${list(by['stopped by the name rule'].filter((x) => !adds.includes(x)))}`);
    console.log(`May not be reachable (no street or path within 60 m): ${list(far)}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
