#!/usr/bin/env node
// Builds one region's places archive (Places worth the stop, PW14, decision 0102).
//
//   node scripts/build-places-archive.mjs --wikidata items.jsonl [--osm osm.geojson] [--edits src/lib/discovery/archiveEdits.json]
//        --region us --version 20261108 --out dir
//
// Input: Wikidata items, one JSON object per line ({id, name, lon, lat, p31: [Q…], heritage, dissolved, closed,
// states}), as `scripts/places-archive/fetch-wikidata.mjs` writes them; and, if given, an OpenStreetMap GeoJSON
// export whose elements carry a `wikidata` tag: they only corroborate, and one tagged `demolished:*`, `razed:*` or
// `was:*` says its place is gone (PW7). Output: `places-<region>-<version>.pmtiles`, the same bytes each time. The
// manifest is written by the chronicles-data workflow from the published archives. The app never reads Wikidata's
// or OpenStreetMap's format.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeArchive } from './places-archive/archive.mjs';
import { keep } from './places-archive/classify.mjs';

const SAME_PLACE_M = 50;
const norm = (s) => String(s).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
function metres([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371008.8;
}
const same = (a, b) => norm(a.name) === norm(b.name) && metres([a.lon, a.lat], b.at) <= SAME_PLACE_M;

/** OSM elements whose tags say their place no longer exists, by the Wikidata id they carry. */
function goneInOsm(osm) {
  const out = new Set();
  for (const f of osm?.features ?? []) {
    const t = f.properties ?? {};
    if (typeof t.wikidata !== 'string') continue;
    if (Object.keys(t).some((k) => /^(demolished|razed|was):/.test(k))) out.add(t.wikidata);
  }
  return out;
}

/**
 * PW14: {items, osm?, edits?, region, version} to {file, bytes, places}.
 * @param {{ items: any[], osm?: any, edits?: { remove: { name: string, at: number[] }[], add: { name: string, at: number[], class: string }[] }, region: string, version: string }} o
 */
export function build({ items, osm = null, edits = { remove: [], add: [] }, region, version }) {
  if (!/^[a-z0-9]+$/.test(region) || !/^\d{8}(\.\d+)?$/.test(version)) throw new Error('region is lowercase letters and digits; version is YYYYMMDD');
  const gone = goneInOsm(osm);
  const places = [];
  for (const it of items) {
    const cls = gone.has(it.id) ? null : keep(it);
    if (!cls) continue;
    const place = { name: String(it.name).trim(), lon: it.lon, lat: it.lat, class: cls, src: 'wd', id: it.id };
    if (!edits.remove.some((r) => same(place, r))) places.push(place);
  }
  for (const a of edits.add ?? []) {
    const place = { name: String(a.name).trim(), lon: a.at[0], lat: a.at[1], class: a.class, src: 'owner', id: `owner:${norm(a.name)}` };
    const kept = places.filter((p) => !same(p, { name: place.name, at: a.at }));
    places.length = 0;
    places.push(...kept, place);
  }
  return { file: `places-${region}-${version}.pmtiles`, bytes: writeArchive(places), places };
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const wikidata = arg('wikidata');
  const region = arg('region');
  const version = arg('version');
  const out = arg('out') ?? '.';
  if (!wikidata || !region || !version) {
    console.error('usage: build-places-archive.mjs --wikidata items.jsonl [--osm osm.geojson] [--edits edits.json] --region us --version YYYYMMDD --out dir');
    process.exit(1);
  }
  const items = readFileSync(wikidata, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const osm = arg('osm') ? JSON.parse(readFileSync(arg('osm'), 'utf8')) : null;
  const edits = arg('edits') ? JSON.parse(readFileSync(arg('edits'), 'utf8')) : { remove: [], add: [] };
  const r = build({ items, osm, edits, region, version });
  writeFileSync(join(out, r.file), r.bytes);
  const byClass = {};
  for (const p of r.places) byClass[p.class] = (byClass[p.class] ?? 0) + 1;
  console.log(JSON.stringify({ file: r.file, bytes: r.bytes.length, places: r.places.length, byClass }));
}
