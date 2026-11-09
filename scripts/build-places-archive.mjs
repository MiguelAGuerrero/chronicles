#!/usr/bin/env node
// Builds one region's places archive (Places worth the stop, PW14, decision 0103).
//
//   node scripts/build-places-archive.mjs --wikidata items.jsonl [--osm osm.geojson] [--edits src/lib/discovery/archiveEdits.json]
//        [--review areas.json] --region us --version 20261108 --out dir
//
// Input: Wikidata items, one JSON object per line ({id, name, lon, lat, p31: [Q…], heritage, dissolved, closed,
// states}), as `scripts/places-archive/fetch-wikidata.mjs` writes them; and, if given, an OpenStreetMap GeoJSON
// export whose elements carry a `wikidata` tag (the query is `places-archive/osm.overpassql`): they only corroborate
// (RP7): one tagged `demolished:*`, `razed:*` or `was:*` says its place is gone (PW7), one with a visitor's tag says a
// listed place is open (RP2), and `access=private|no` says it can't be reached (RP5). With `--review`, the owner's
// review of what the build adds is written beside the archive, never in it (RP12). Output: `places-<region>-<version>.pmtiles`, the same bytes each time. The
// manifest is written by the chronicles-data workflow from the published archives. The app never reads Wikidata's
// or OpenStreetMap's format.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeArchive } from './places-archive/archive.mjs';
import { CLOSED_ACCESS, keep, listing, OPEN_TAGS } from './places-archive/classify.mjs';

const SAME_PLACE_M = 50;
const norm = (s) => String(s).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
function metres([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371008.8;
}
const same = (a, b) => norm(a.name) === norm(b.name) && metres([a.lon, a.lat], b.at) <= SAME_PLACE_M;

/**
 * RP7: what OSM elements say of the Wikidata items they carry the id of (their `wikidata` tag, and nothing else: an
 * element's name or position never joins it to an item): gone (PW7), open to visitors (RP2), or closed (RP5).
 * @returns {Map<string, { gone: boolean, open: boolean, closed: boolean }>}
 */
export function osmSignals(osm) {
  const out = new Map();
  for (const f of osm?.features ?? []) {
    const t = f.properties ?? {};
    if (typeof t.wikidata !== 'string' || !/^Q\d+$/.test(t.wikidata)) continue;
    const s = out.get(t.wikidata) ?? { gone: false, open: false, closed: false };
    if (Object.keys(t).some((k) => /^(demolished|razed|was):/.test(k))) s.gone = true;
    if (Object.entries(OPEN_TAGS).some(([k, vs]) => vs.includes(t[k]))) s.open = true;
    if (CLOSED_ACCESS.includes(t.access)) s.closed = true;
    out.set(t.wikidata, s);
  }
  return out;
}

const inside = ([w, s, e, n], p) => p.lon >= w && p.lon <= e && p.lat >= s && p.lat <= n;

/**
 * RP12: the owner's review: per named area, every place the build adds there with its class and why it entered; and
 * for the whole region, how many each class and reason add. Words and lists for the owner, never published.
 */
function reviewOf(places, why, areas) {
  const region = {};
  for (const p of places) {
    const k = `${p.class}: ${why.get(p.id) ?? 'class'}`;
    region[k] = (region[k] ?? 0) + 1;
  }
  return {
    areas: areas.map((a) => ({ name: a.name, places: places.filter((p) => inside(a.bbox, p)).map((p) => ({ name: p.name, class: p.class, reason: why.get(p.id) ?? 'class', id: p.id, at: [p.lon, p.lat] })) })),
    region,
  };
}

/**
 * PW14: {items, osm?, edits?, review?, region, version} to {file, bytes, places, review?}.
 * @param {{ items: any[], osm?: any, edits?: { remove: { name: string, at: number[] }[], add: { name: string, at: number[], class: string }[] }, review?: { name: string, bbox: number[] }[] | null, region: string, version: string }} o
 */
export function build({ items, osm = null, edits = { remove: [], add: [] }, review = null, region, version }) {
  if (!/^[a-z0-9]+$/.test(region) || !/^\d{8}(\.\d+)?$/.test(version)) throw new Error('region is lowercase letters and digits; version is YYYYMMDD');
  const signals = osmSignals(osm);
  const places = [];
  /** RP12: why each listed place entered, for the review only. */
  const why = new Map();
  for (const it of items) {
    const sig = signals.get(it.id) ?? {};
    const cls = sig.gone ? null : keep(it, sig);
    if (!cls) continue;
    const listed = listing(it, sig);
    if (listed?.cls === cls) why.set(it.id, listed.reason);
    const place = { name: String(it.name).trim(), lon: it.lon, lat: it.lat, class: cls, src: 'wd', id: it.id };
    if (!edits.remove.some((r) => same(place, r))) places.push(place);
  }
  for (const a of edits.add ?? []) {
    const place = { name: String(a.name).trim(), lon: a.at[0], lat: a.at[1], class: a.class, src: 'owner', id: `owner:${norm(a.name)}` };
    const kept = places.filter((p) => !same(p, { name: place.name, at: a.at }));
    places.length = 0;
    places.push(...kept, place);
  }
  const out = { file: `places-${region}-${version}.pmtiles`, bytes: writeArchive(places), places };
  return review ? { ...out, review: reviewOf(places, why, review) } : out;
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
    console.error('usage: build-places-archive.mjs --wikidata items.jsonl [--osm osm.geojson] [--edits edits.json] [--review areas.json] --region us --version YYYYMMDD --out dir');
    process.exit(1);
  }
  const items = readFileSync(wikidata, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const osm = arg('osm') ? JSON.parse(readFileSync(arg('osm'), 'utf8')) : null;
  const edits = arg('edits') ? JSON.parse(readFileSync(arg('edits'), 'utf8')) : { remove: [], add: [] };
  const review = arg('review') ? JSON.parse(readFileSync(arg('review'), 'utf8')) : null;
  const r = build({ items, osm, edits, review, region, version });
  writeFileSync(join(out, r.file), r.bytes);
  // RP12: beside the archive, never in it; the publishing workflow uploads only the .pmtiles and the manifest.
  if (r.review) writeFileSync(join(out, `review-${region}-${version}.json`), `${JSON.stringify(r.review, null, 1)}\n`);
  const byClass = {};
  for (const p of r.places) byClass[p.class] = (byClass[p.class] ?? 0) + 1;
  console.log(JSON.stringify({ file: r.file, bytes: r.bytes.length, places: r.places.length, byClass }));
}
