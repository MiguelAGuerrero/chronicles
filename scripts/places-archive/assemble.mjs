#!/usr/bin/env node
// The assemble step of a staged places build (SB2, SB5-SB9, decision 0110): one region's archive from the kept
// source outputs and the owner's edits, with no request to any source. It writes three files, and only once all
// three are ready (SB9): the archive, its change list since the previous version (SB6), and the place rows the
// next assemble diffs against. Run daily and after a fetch by chronicles-data's assemble workflow:
//
//   node scripts/places-archive/assemble.mjs --wikidata wikidata-us.jsonl --edits src/lib/discovery/archiveEdits.json
//        [--prev-places places-us.jsonl --prev-version 20261102] --region us --version 20261109 --out dir
//
// Prints `places_sha256=…`, `inputs_key=…` and `changed=<tiles>` for the workflow.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../build-places-archive.mjs';
import { changedTiles } from './changes.mjs';
import { readKept, sha256 } from './kept.mjs';

/** A place row as the archive and the change lists compare it, in a fixed key order. */
const row = (p) => ({ id: p.id, name: p.name, class: p.class, src: p.src, lon: p.lon, lat: p.lat });
const sortRows = (rows) => [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

/** The place rows as JSON lines, sorted: what the next assemble diffs against. */
export const placesText = (places) => sortRows(places.map(row)).map((r) => JSON.stringify(r)).join('\n') + '\n';

/** SB5: the hash of the sorted place rows, never of the file's bytes. */
export const placesHash = (places) => sha256(placesText(places));

/**
 * SB2: the archive from the kept Wikidata items and the owner's edits; no request is made.
 * @param {{ wikidata: any[], edits?: { remove: any[], add: any[] }, region: string, version: string }} o
 */
export function assemble({ wikidata, edits = { remove: [], add: [] }, region, version }) {
  const r = build({ items: wikidata, edits, region, version });
  return { ...r, placesSha: placesHash(r.places) };
}

/**
 * SB8: one key for everything an assemble reads (each kept output's SHA-256, the edits, the class lists): equal
 * keys, nothing to assemble.
 * @param {{ sources: Record<string, string>, edits: string, classes: string }} inputs
 */
export function inputsKey({ sources, edits, classes }) {
  const src = Object.keys(sources).sort().map((k) => [k, sources[k]]);
  return sha256(JSON.stringify({ src, edits: sha256(edits), classes: sha256(classes) }));
}

/**
 * SB6, SB7, SB9: builds every output first, then writes them; a failure writes nothing.
 * @param {{ wikidata: any[], edits?: any, prevPlaces?: any[], prevVersion?: string | null, region: string, version: string,
 *   write: (name: string, data: Uint8Array | string) => void }} o
 */
export function assembleRun({ wikidata, edits, prevPlaces = [], prevVersion = null, region, version, write }) {
  const a = assemble({ wikidata, edits, region, version });
  const tiles = changedTiles(prevPlaces ?? [], a.places);
  const outputs = [
    [a.file, a.bytes],
    [`changes-${region}-${version}.json`, JSON.stringify({ since: prevVersion, places_sha256: a.placesSha, changed: tiles }) + '\n'],
    [`places-${region}.jsonl`, placesText(a.places)],
  ];
  for (const [name, data] of outputs) write(name, data);
  return { file: a.file, placesSha: a.placesSha, tiles, places: a.places.length };
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const region = arg('region');
  const version = arg('version');
  const out = arg('out') ?? '.';
  const wikidataPath = arg('wikidata');
  if (!region || !version || !wikidataPath) {
    console.error('usage: assemble.mjs --wikidata kept.jsonl [--edits edits.json] [--prev-places rows.jsonl --prev-version V] --region us --version YYYYMMDD --out dir');
    process.exit(1);
  }
  const wikidataText = readFileSync(wikidataPath, 'utf8');
  const kept = readKept(wikidataText);
  if (!kept) throw new Error('the kept Wikidata output is empty');
  const editsText = arg('edits') ? readFileSync(arg('edits'), 'utf8') : '{"remove":[],"add":[]}';
  const classesText = readFileSync(new URL('./classify.mjs', import.meta.url), 'utf8');
  const prevPlaces = arg('prev-places') ? readFileSync(arg('prev-places'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const r = assembleRun({
    wikidata: kept.items,
    edits: JSON.parse(editsText),
    prevPlaces,
    prevVersion: arg('prev-version'),
    region,
    version,
    write: (name, data) => writeFileSync(join(out, name), data),
  });
  console.log(`places_sha256=${r.placesSha}`);
  console.log(`inputs_key=${inputsKey({ sources: { wikidata: sha256(wikidataText) }, edits: editsText, classes: classesText })}`);
  console.log(`changed=${r.tiles.length}`);
  console.log(`places=${r.places}`);
}
