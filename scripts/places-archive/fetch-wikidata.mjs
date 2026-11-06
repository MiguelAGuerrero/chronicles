#!/usr/bin/env node
// Fetches the places archive's Wikidata items for a region (Places worth the stop, PW14, decision 0102), one map
// cell at a time from the Wikidata Query Service, politely: one query at a time, a pause between, a User-Agent
// naming the project, a 429's Retry-After honoured, and a cell that times out split in four. Runs in the
// chronicles-data weekly job, never in the app (the service is not for an app's live traffic).
//
//   node scripts/places-archive/fetch-wikidata.mjs --region us --out items.jsonl
//
// Writes one JSON object per line: {id, name, lon, lat, p31, heritage, nhl, dissolved, closed, states}. Nothing
// about articles or popularity (sitelinks, page views) is ever asked for (PW7).
import { appendFileSync, writeFileSync } from 'node:fs';
import { ALL_CLASS_IDS, NHL } from './classify.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const AGENT = 'Chronicles places build (+github.com/MiguelAGuerrero/chronicles; weekly, one query at a time)';
export const REGIONS = {
  // The conterminous US, Alaska and Hawaii, in boxes [west, south, east, north].
  us: [[-125, 24, -66, 50], [-170, 51, -129, 72], [-161, 18, -154, 23]],
};

/** The cells of a region's boxes, `step` degrees on a side. */
export function cellsFor(boxes, step) {
  const out = [];
  for (const [w, s, e, n] of boxes)
    for (let x = w; x < e; x += step) for (let y = s; y < n; y += step) out.push([x, y, Math.min(x + step, e), Math.min(y + step, n)]);
  return out;
}

/** A cell's four quarters, for one that timed out. */
export function splitCell([w, s, e, n]) {
  const mx = (w + e) / 2;
  const my = (s + n) / 2;
  return [[w, s, mx, my], [mx, s, e, my], [w, my, mx, n], [mx, my, e, n]];
}

/** PW14: one cell's query: the pinned classes or a heritage listing, in the US, with what says a place is gone. */
export function cellQuery([w, s, e, n]) {
  const classes = ALL_CLASS_IDS.map((q) => `wd:${q}`).join(' ');
  return `SELECT ?item ?label ?coord ?p31 ?nrhp ?des ?dissolved ?closed ?stateLabel WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral .
  }
  { VALUES ?cls { ${classes} } ?item wdt:P31 ?cls . } UNION { ?item wdt:P649 [] . } UNION { ?item wdt:P1435 [] . }
  ?item wdt:P17 wd:Q30 .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL { ?item wdt:P31 ?p31 . }
  OPTIONAL { ?item wdt:P649 ?nrhp . }
  OPTIONAL { ?item wdt:P1435 ?des . }
  OPTIONAL { ?item wdt:P1435 wd:${NHL} . BIND(wd:${NHL} AS ?des) }
  OPTIONAL { ?item wdt:P576 ?dissolved . }
  OPTIONAL { ?item wdt:P3999 ?closed . }
  OPTIONAL { ?item (wdt:P5817|wdt:P5816) ?state . ?state rdfs:label ?stateLabel . FILTER(LANG(?stateLabel) = "en") }
}`;
}

const qid = (uri) => String(uri).replace(/^.*\//, '');

/** PW14: a query's rows as items, one per Wikidata item, in the order first seen. */
export function itemsFrom(bindings) {
  const byId = new Map();
  for (const b of bindings) {
    const id = qid(b.item.value);
    let it = byId.get(id);
    if (!it) {
      const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(b.coord?.value ?? '');
      it = { id, name: b.label?.value ?? '', lon: m ? Number(m[1]) : NaN, lat: m ? Number(m[2]) : NaN, p31: [], heritage: false, nhl: false, dissolved: false, closed: false, states: [] };
      byId.set(id, it);
    }
    if (b.p31 && !it.p31.includes(qid(b.p31.value))) it.p31.push(qid(b.p31.value));
    if (b.nrhp || b.des) it.heritage = true;
    if (b.des && qid(b.des.value) === NHL) it.nhl = true;
    if (b.dissolved) it.dissolved = true;
    if (b.closed) it.closed = true;
    if (b.stateLabel && !it.states.includes(b.stateLabel.value)) it.states.push(b.stateLabel.value);
  }
  return [...byId.values()];
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(query) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'user-agent': AGENT, accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(75_000),
    }).catch(() => null);
    if (res?.ok) return (await res.json()).results.bindings;
    if (res && (res.status === 429 || res.status === 503)) {
      await wait(Math.min(Number(res.headers.get('retry-after')) || 60, 300) * 1000);
      continue;
    }
    // A timeout (504, or no answer): the caller splits the cell.
    if (!res || res.status === 500 || res.status === 504) return null;
    throw new Error(`Wikidata answered ${res.status}`);
  }
  throw new Error('Wikidata kept refusing');
}

async function fetchCell(cell, depth, out, seen) {
  const rows = await ask(cellQuery(cell));
  await wait(1500);
  if (rows == null) {
    if (depth >= 4) throw new Error(`cell ${cell.join(',')} still times out at depth ${depth}`);
    for (const q of splitCell(cell)) await fetchCell(q, depth + 1, out, seen);
    return;
  }
  for (const it of itemsFrom(rows)) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    appendFileSync(out, `${JSON.stringify(it)}\n`);
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const region = arg('region');
  const out = arg('out');
  if (!REGIONS[region] || !out) {
    console.error('usage: fetch-wikidata.mjs --region us --out items.jsonl');
    process.exit(1);
  }
  writeFileSync(out, '');
  const seen = new Set();
  const cells = cellsFor(REGIONS[region], 2);
  for (const [i, cell] of cells.entries()) {
    await fetchCell(cell, 0, out, seen);
    if (i % 25 === 0) console.error(`${i + 1}/${cells.length} cells, ${seen.size} items`);
  }
  console.error(`done: ${seen.size} items`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
