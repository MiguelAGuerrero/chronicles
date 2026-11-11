#!/usr/bin/env node
/**
 * Saves the fixtures of Presence and kinds (PK5, PK6): real map tiles (OpenFreeMap's current build) and the places a v2
 * places archive holds, for rings of 800 m around area points. Run by hand with tsx, never by CI (network):
 *
 *   npx tsx scripts/fixture-presence.mjs towns  <chronicles-data checkout> src/lib/__tests__/explore/presenceTowns.json
 *   npx tsx scripts/fixture-presence.mjs sample <chronicles-data checkout> src/lib/__tests__/explore/presenceSample.json
 *
 * The archive's places are what chronicles-data's own Wikidata query and classifier admit (its `cellQuery`, `keep`,
 * `listing`), read from the checkout given, so the fixture follows the data repo's rule as it stands, not a copy of it.
 * A listed place that waits for a sign it is open (its RD8) is left out: the OpenStreetMap corroboration is not run here.
 *
 * `towns`: Coplay PA, Galena IL, Andalusia AL and Philadelphia's Old City, each at the map's own point for it, with the
 * History and Culture steps the app gave them when recorded (`before`, PK6's control).
 * `sample`: the Nov 10 draw: 17 regions, the tiles' town and village points (neighbourhoods in five cities) drawn with a
 * seeded generator, five and then six a region, as the measurement that set PK5 was drawn.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { placesFromArchive } from '../src/lib/discovery/archivePois';
import { categoryOfPoi, placesFromTilePois } from '../src/lib/discovery/tilePois';
import { ringOf } from '../src/lib/atlas/atlas';

const [mode, dataRepo, out] = process.argv.slice(2);
if (!out || !['towns', 'sample'].includes(mode)) throw new Error('usage: fixture-presence.mjs towns|sample <chronicles-data checkout> <out.json>');
const wd = resolve(dataRepo, 'src/adapters/wikidata');
const { cellQuery, itemsFrom, parseAnswer } = await import(resolve(wd, 'query.ts'));
const { keep, listing, ORDER, CLASSES } = await import(resolve(wd, 'classify.mjs'));

const UA = { 'user-agent': 'Chronicles fixture (owner-run, one query at a time)' };
const RING_M = 800;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const metres = ([a, b], [c, d]) => {
  const r = Math.PI / 180;
  return Math.hypot((c - a) * r * Math.cos(((b + d) / 2) * r), (d - b) * r) * 6371008.8;
};
const tileOf = (lon, lat, z) => {
  const n = 2 ** z, r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tilejson = await (await fetch('https://tiles.openfreemap.org/planet', { headers: UA })).json();
const url = String(tilejson.tiles[0]);
const build = url.split('/')[4] ?? 'unknown';
async function layer(z, x, y, id) {
  const res = await fetch(url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)), { headers: UA });
  if (!res.ok) return [];
  const l = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer()))).layers[id];
  const outF = [];
  for (let i = 0; l && i < l.length; i++) outF.push(l.feature(i).toGeoJSON(x, y, z));
  return outF;
}

/** The ring's POIs as the adapter reads them: the classes it maps, community centres, and the unnamed it keeps. */
async function poisAround(at) {
  const dLat = (RING_M + 100) / 110540, dLon = (RING_M + 100) / (111320 * Math.cos((at[1] * Math.PI) / 180));
  const [xa, ya] = tileOf(at[0] - dLon, at[1] + dLat, 14), [xb, yb] = tileOf(at[0] + dLon, at[1] - dLat, 14);
  const seen = new Set();
  const rows = [];
  for (let x = xa; x <= xb; x++)
    for (let y = ya; y <= yb; y++)
      for (const f of await layer(14, x, y, 'poi')) {
        if (f.geometry.type !== 'Point') continue;
        const c = f.geometry.coordinates;
        if (metres(c, at) > RING_M + 50) continue;
        const p = f.properties;
        const name = typeof p.name === 'string' ? p.name : '';
        const cls = String(p.class ?? ''), sub = String(p.subclass ?? '');
        const kept = categoryOfPoi(cls, sub) || (cls === 'town_hall' && sub === 'community_centre');
        if (!kept || (!name && !['artwork', 'viewpoint'].includes(sub))) continue;
        const k = `${name}|${cls}|${sub}|${c[0].toFixed(6)}|${c[1].toFixed(6)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        rows.push([name, cls, sub, r6(c[0]), r6(c[1])]);
      }
  return rows;
}

/** What a v2 archive holds around a point: chronicles-data's query and classifier, without RD8's waiting places. */
async function archiveAround(at) {
  const h = (RING_M + 50) / 110540;
  const box = [at[0] - h * 1.4, at[1] - h, at[0] + h * 1.4, at[1] + h];
  for (let a = 0; a < 4; a++) {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { ...UA, accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(cellQuery(box))}`,
    });
    const b = parseAnswer(await res.text());
    if (b) {
      return itemsFrom(b).flatMap((i) => {
        const cls = keep(i);
        const byType = ORDER.some((c) => CLASSES[c].some((q) => i.p31.includes(q)));
        if (!cls || (!byType && listing(i)?.needsOpen) || metres([i.lon, i.lat], at) > RING_M + 50) return [];
        return [[i.name, cls, r6(i.lon), r6(i.lat), i.id]];
      });
    }
    await sleep(4000);
  }
  throw new Error(`Wikidata gave no answer for ${at}`);
}

const asFeatures = (pois) => pois.map(([name, cls, sub, lon, lat]) => ({ geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, class: cls, subclass: sub }, zoom: 14 }));
const archiveFeatures = (rows) => rows.map(([name, cls, lon, lat]) => ({ geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, class: cls } }));

async function area(name, at, extra = {}) {
  const pois = await poisAround(at);
  const archive = await archiveAround(at);
  await sleep(1500);
  return { name, at: [r6(at[0]), r6(at[1])], ...extra, pois, archive };
}

/** The map's own point for a named place near a guess (the place layer at z14, as the card's area). */
async function pointOf(name, guess) {
  const [cx, cy] = tileOf(guess[0], guess[1], 14);
  let best = null;
  for (let x = cx - 2; x <= cx + 2; x++)
    for (let y = cy - 2; y <= cy + 2; y++)
      for (const f of await layer(14, x, y, 'place'))
        if (f.properties.name === name && f.geometry.type === 'Point' && (!best || metres(f.geometry.coordinates, guess) < metres(best, guess))) best = f.geometry.coordinates;
  if (!best) throw new Error(`no place point named ${name} near ${guess}`);
  return best;
}

let result;
if (mode === 'towns') {
  const TOWNS = [
    ['Coplay', [-75.4953, 40.6706], 'the Kilns (Q5168618)'],
    ['Galena', [-90.429, 42.417], 'Old Market House (Q7084478)'],
    ['Andalusia', [-86.48, 31.308], 'Three Notch Museum (Q16901630)'],
    ['Old City', [-75.145, 39.952], 'control: a city'],
  ];
  const areas = [];
  for (const [n, guess, why] of TOWNS) {
    const a = await area(n, await pointOf(n, guess), { why });
    // PK6's control: the steps the app gave the area when recorded, before the slice changed the bars.
    const steps = ringOf(placesFromTilePois(asFeatures(a.pois), build), placesFromArchive(archiveFeatures(a.archive), 'fixture'), a.at).steps;
    areas.push({ ...a, before: { history: steps.history, culture: steps.culture } });
  }
  result = { recorded: new Date().toISOString().slice(0, 10), tiles: build, areas };
} else {
  const ANCHORS = [
    ['Lehigh Valley PA', -75.5, 40.7, false], ['Catskills NY', -74.5, 42.0, false], ['Vermont', -72.6, 43.6, false], ['Shenandoah VA', -78.5, 38.8, false],
    ['Georgia', -83.5, 33.6, false], ['E Tennessee', -82.4, 36.3, false], ['Driftless IL/WI', -90.3, 42.6, false], ['San Juan CO', -107.7, 37.8, false],
    ['East Texas', -94.4, 32.8, false], ['Rogue OR', -123.0, 42.3, false], ['Ohio', -81.5, 40.6, false], ['Central CA', -121.5, 38.5, false],
    ['Boston', -71.06, 42.36, true], ['Chicago', -87.63, 41.88, true], ['Philadelphia', -75.16, 39.95, true], ['Pittsburgh', -79.99, 40.44, true], ['New Orleans', -90.07, 29.96, true],
  ];
  const SMALL = new Set(['village', 'town']), BIG = new Set(['suburb', 'neighbourhood', 'quarter', 'borough']);
  const rng = (s) => () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const areas = [];
  const seenAreas = new Set();
  for (const [part, per] of [[1, 5], [2, 6]]) {
    const rand = rng(20261110 + part);
    for (const [region, lon, lat, big] of ANCHORS) {
      const [cx, cy] = tileOf(lon, lat, 11);
      const pts = [];
      for (let x = cx - 1; x <= cx + 1; x++)
        for (let y = cy - 1; y <= cy + 1; y++)
          for (const f of await layer(11, x, y, 'place')) {
            if (!(big ? BIG : SMALL).has(String(f.properties.class)) || !f.properties.name || f.geometry.type !== 'Point') continue;
            pts.push({ n: f.properties.name, at: f.geometry.coordinates });
          }
      const keys = new Set();
      const uniq = pts.filter((p) => {
        const k = p.n + p.at.map((v) => v.toFixed(3));
        return !keys.has(k) && !!keys.add(k);
      });
      const pick = [];
      while (pick.length < Math.min(per, uniq.length)) pick.push(uniq.splice(Math.floor(rand() * uniq.length), 1)[0]);
      for (const p of pick) {
        const k = `${region}|${p.n}`;
        if (seenAreas.has(k)) continue;
        seenAreas.add(k);
        areas.push(await area(p.n, p.at, { region, big }));
      }
      console.error(region, part, areas.length);
    }
  }
  result = { recorded: new Date().toISOString().slice(0, 10), tiles: build, areas };
}
writeFileSync(out, JSON.stringify(result) + '\n');
console.error(`wrote ${out}: ${result.areas.length} areas`);
