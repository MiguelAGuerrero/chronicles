// The coverage benchmark (Remarkable and public, RP17, decision 0109): the Nov 9 measurement, kept. For a fixed set of
// areas it reads the map tiles (OpenFreeMap's current build) and Wikidata, runs the app's own rules over them, and
// prints, per area, the destinations, those shown, and those still missed with why; a missed destination, or a place
// of the owner's review (--review), with no street or path within 60 m is flagged "may not be reachable" (RP20).
// What the archive's rule would add is measured where the rule lives, in chronicles-data (decision 0108).
// Network only; never in `npm test` or CI. Its reports are the owner's, in words and lists, never a percentage.
//
//   npm run places:coverage [-- --area bethlehem] [-- --review out/review-us-20261109.json]
//   npm run places:coverage -- --gate <chronicles-data checkout> [--area coplay]
//
// `--gate` (Presence and kinds, PK15): for the gate's areas, small towns first, the listed places chronicles-data's
// classifier (read from the checkout given) holds back until a source says they are open, by name, and whether History
// and Culture are lit apart, with what the classifier admits counted as the archive would hold it.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { ringOf } from '../src/lib/atlas/atlas';
import { archivePlace } from '../src/lib/discovery/archivePois';
import { isMarkable } from '../src/lib/discovery/noise';
import type { Place } from '../src/lib/discovery/types';
import { placesFromTilePois } from '../src/lib/discovery/tilePois';
import { wayNear } from '../src/lib/explore/reach/rule';
import type { LngLat } from '../src/lib/types';
import { areaKey, gateReport, isDestination, NHL, NRHP, outcome, walkable } from './places-archive/coverage.mjs';

const AGENT = 'Chronicles places coverage (+github.com/MiguelAGuerrero/chronicles; owner-run, one query at a time)';
/** The Nov 9 areas: three Lehigh Valley towns, a small tourist town, two cities' cores and one outside the US. */
const AREAS: Record<string, LngLat> = {
  bethlehem: [-75.372, 40.617], allentown: [-75.47, 40.603], easton: [-75.212, 40.69], jimthorpe: [-75.737, 40.866],
  pittsburgh: [-79.993, 40.443], philadelphia: [-75.148, 39.95], zurich: [8.542, 47.372],
};
const HALF_M = 1670;
/** PK15: the gate's areas: the Nov 10 small towns (each at its map point) and two cities' cores. */
const GATE_AREAS: Record<string, LngLat> = {
  coplay: [-75.4955, 40.6701], lititz: [-76.307, 40.157], galena: [-90.4295, 42.4157], andalusia: [-86.4824, 31.3081], luray: [-78.46, 38.665],
  edenton: [-76.609, 36.058], jefferson: [-94.346, 32.757], bethlehem: [-75.372, 40.617], philadelphia: [-75.148, 39.95],
};

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
        if (!walkable(tr.feature(i).properties.class)) continue;
        const g = tr.feature(i).toGeoJSON(x, y, 14).geometry;
        if (g.type === 'LineString') ways.push(g.coordinates as LngLat[]);
        if (g.type === 'MultiLineString') ways.push(...(g.coordinates as LngLat[][]));
      }
    }
  return { build: url.split('/')[4] ?? 'unknown', pois, ways };
}

const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'none');

type Classifier = {
  keep: (i: Item) => string | null;
  listing: (i: Item) => { needsOpen: boolean } | null;
  ORDER: string[];
  CLASSES: Record<string, string[]>;
};

/** PK15: the gate measured, in words and lists (`gateReport`). */
async function gate(dataRepo: string, only: string | null) {
  const c = (await import(resolve(dataRepo, 'src/adapters/wikidata/classify.mjs'))) as Classifier;
  const byType = (i: Item) => c.ORDER.some((k) => c.CLASSES[k].some((q) => i.p31.includes(q)));
  const waits = (i: Item) => !!c.keep(i) && !byType(i) && !!c.listing(i)?.needsOpen;
  const out = [];
  for (const [area, centre] of Object.entries(GATE_AREAS)) {
    if (only && only !== area) continue;
    const box = boxOf(centre);
    const [items, t] = await Promise.all([wikidata(box), tiles(box)]);
    const admitted = items.flatMap((i) => {
      const cls = c.keep(i);
      const p = cls && !waits(i) ? archivePlace(i.name, cls, i.at, 'gate') : null;
      return p ? [p] : [];
    });
    const s = ringOf(placesFromTilePois(t.pois as never, t.build), admitted as Place[], centre).steps;
    out.push({
      name: area,
      // One name per item: Wikidata answers a row per coordinate.
      held: [...new Map(items.filter(waits).map((i) => [i.id, i.name])).values()],
      apart: { historyAlone: Number(s.history > 0 && !s.culture), cultureAlone: Number(s.culture > 0 && !s.history), both: Number(s.history > 0 && s.culture > 0) },
    });
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(gateReport(out));
}

async function main() {
  const only = arg('area');
  if (arg('gate')) return gate(arg('gate')!, only);
  const review = arg('review') ? (JSON.parse(readFileSync(arg('review')!, 'utf8')) as { areas: { name: string; places: { name: string; at: LngLat }[] }[] }) : null;
  for (const [area, centre] of Object.entries(AREAS)) {
    if (only && only !== area) continue;
    const box = boxOf(centre);
    const [items, t] = await Promise.all([wikidata(box), tiles(box)]);
    const places = placesFromTilePois(t.pois as never, t.build).map((p) => ({ name: p.name, at: p.at, mark: isMarkable(p) }));
    const raw = t.pois.map((f) => ({ name: String(f.properties.name ?? ''), at: f.geometry.coordinates as LngLat }));
    const by: Record<string, string[]> = { shown: [], 'stopped by the name rule': [], 'dropped by the adapter': [], 'not in the tiles': [] };
    const far: string[] = [];
    for (const it of items.filter(isDestination)) {
      const o = outcome(it, { places, raw });
      by[o].push(it.name);
      if (o !== 'shown' && wayNear(it.at, t.ways) === false) far.push(it.name);
    }
    for (const p of review?.areas.find((a) => areaKey(a.name) === area)?.places ?? [])
      if (wayNear(p.at, t.ways) === false && !far.includes(p.name)) far.push(p.name);
    const n = Object.values(by).reduce((a, b) => a + b.length, 0);
    console.log(`\n## ${area} (tiles ${t.build})\n${n} destinations.`);
    console.log(`Shown: ${list(by.shown)}`);
    console.log(`Missed, not in the tiles: ${list(by['not in the tiles'])}`);
    console.log(`Missed, dropped by the adapter: ${list(by['dropped by the adapter'])}`);
    console.log(`Missed, stopped by the name rule: ${list(by['stopped by the name rule'])}`);
    console.log(`May not be reachable (no street or path within 60 m): ${list(far)}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
