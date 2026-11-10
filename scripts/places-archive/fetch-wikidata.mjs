#!/usr/bin/env node
// Fetches the places archive's Wikidata items for a region (Places worth the stop, PW14, decision 0103; a staged
// places build, SB1, SB3, SB4, SB11, SB12, decision 0110) from the Wikidata Query Service, politely: one query at a
// time, a pause between, a User-Agent naming the project, a 429's Retry-After honoured, and a cell that times out
// split in four. Runs in chronicles-data's fetch job, never in the app (the service is not for an app's live
// traffic).
//
//   node scripts/places-archive/fetch-wikidata.mjs --region us [--kept wikidata-us.jsonl] [--box w,s,e,n] --out next.jsonl
//
// With nothing kept, every cell is swept (the first run). With a box, only that box's cells are swept. Otherwise
// (the weekly run) changes come first: each pinned class is asked, by the region's country, for the items modified
// since the last run began (less a day), kept items modified since that no longer match leave, a newly pinned class
// is asked whole, and this week's thirteenth of the cells is swept (the quarterly safety sweep, for items with no
// country). The output is a kept file (`kept.mjs`): a header, then one item per line {id, name, lon, lat, p31, nhl,
// dissolved, closed, states, cell}. It is written only when the whole run succeeded (SB1). Nothing about articles or
// popularity (sitelinks, page views) is ever asked for (PW7).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ALL_CLASS_IDS, NHL } from './classify.mjs';
import { readKept, writeKept } from './kept.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const AGENT = 'Chronicles places build (+github.com/MiguelAGuerrero/chronicles; weekly, one query at a time)';
export const REGIONS = {
  // The conterminous US, Alaska and Hawaii, in boxes [west, south, east, north].
  us: [[-125, 24, -66, 50], [-170, 51, -129, 72], [-161, 18, -154, 23]],
};
/** SB3: each region's countries (P17), which filter the changes queries; by country they answer in seconds, by box not (Nov 9). */
export const COUNTRIES = { us: ['Q30'] };
/** SB11: what a kept file's header records as asked: every pinned class, and the landmarks. */
export const ALL_TARGETS = [...ALL_CLASS_IDS, 'NHL'];
/** SB12: the safety sweep covers one cell in this many each week, so every cell once a quarter. */
export const SWEEP_WEEKS = 13;
/** SB3: the changes are asked from this long before the last run began, for the query service's lag. */
const MARGIN_MS = 24 * 3600_000;
const IDS_PER_QUERY = 400;

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

/** What every query reads about an item: its label, location, classes, listing and whether it is gone. */
const DETAILS = `?item wdt:P625 ?coord .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL { ?item wdt:P31 ?p31 . }
  OPTIONAL { ?item wdt:P1435 wd:${NHL} . BIND("true" AS ?nhl) }
  OPTIONAL { ?item wdt:P576 ?dissolved . }
  OPTIONAL { ?item wdt:P3999 ?closed . }
  OPTIONAL { ?item (wdt:P5817|wdt:P5816) ?state . ?state rdfs:label ?stateLabel . FILTER(LANG(?stateLabel) = "en") }`;

/** The pattern that picks a target's items: one class, or the National Historic Landmarks. */
const pick = (target) => (target === 'NHL' ? `?item wdt:P1435 wd:${NHL} .` : `?item wdt:P31 wd:${target} .`);

/** PW14: one cell's query: the pinned classes or a heritage listing, in the US, with what says a place is gone. */
export function cellQuery([w, s, e, n], targets = ALL_TARGETS) {
  const classes = targets.filter((t) => t !== 'NHL');
  const parts = [];
  if (classes.length) parts.push(`{ VALUES ?cls { ${classes.map((q) => `wd:${q}`).join(' ')} } ?item wdt:P31 ?cls . }`);
  if (targets.includes('NHL')) parts.push(`{ ?item wdt:P1435 wd:${NHL} . }`);
  return `SELECT ?item ?label ?coord ?p31 ?nhl ?dissolved ?closed ?stateLabel WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral .
  }
  ${parts.join(' UNION ')}
  ?item wdt:P17 wd:Q30 .
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL { ?item wdt:P31 ?p31 . }
  OPTIONAL { ?item wdt:P1435 wd:${NHL} . BIND("true" AS ?nhl) }
  OPTIONAL { ?item wdt:P576 ?dissolved . }
  OPTIONAL { ?item wdt:P3999 ?closed . }
  OPTIONAL { ?item (wdt:P5817|wdt:P5816) ?state . ?state rdfs:label ?stateLabel . FILTER(LANG(?stateLabel) = "en") }
}`;
}

/** SB3, SB11: one target's items in one country, modified since a time (or all of them, with no time). */
export function changesQuery(target, country, since) {
  const modified = since ? `?item schema:dateModified ?modified . FILTER(?modified > "${since}"^^xsd:dateTime)` : '';
  return `SELECT ?item ?label ?coord ?p31 ?nhl ?dissolved ?closed ?stateLabel WHERE {
  ${pick(target)}
  ?item wdt:P17 wd:${country} .
  ${modified}
  ${DETAILS}
}`;
}

/** SB4: when each of these kept items was last modified; an id the service no longer knows answers nothing. */
export function modifiedQuery(ids) {
  return `SELECT ?item ?m WHERE { VALUES ?item { ${ids.map((id) => `wd:${id}`).join(' ')} } ?item schema:dateModified ?m . }`;
}

/** SB3: the time the changes are asked from: the last run's start, less a day, as the service writes times. */
export const sinceOf = (startedAt) => new Date(Date.parse(startedAt) - MARGIN_MS).toISOString().replace(/\.\d{3}Z$/, 'Z');

const qid = (uri) => String(uri).replace(/^.*\//, '');

/** PW14: a query's rows as items, one per Wikidata item, in the order first seen. */
export function itemsFrom(bindings) {
  const byId = new Map();
  for (const b of bindings) {
    const id = qid(b.item.value);
    let it = byId.get(id);
    if (!it) {
      const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(b.coord?.value ?? '');
      it = { id, name: b.label?.value ?? '', lon: m ? Number(m[1]) : NaN, lat: m ? Number(m[2]) : NaN, p31: [], nhl: false, dissolved: false, closed: false, states: [] };
      byId.set(id, it);
    }
    if (b.p31 && !it.p31.includes(qid(b.p31.value))) it.p31.push(qid(b.p31.value));
    if (b.nhl) it.nhl = true;
    if (b.dissolved) it.dissolved = true;
    if (b.closed) it.closed = true;
    if (b.stateLabel && !it.states.includes(b.stateLabel.value)) it.states.push(b.stateLabel.value);
  }
  return [...byId.values()];
}

const inBox = ([w, s, e, n], lon, lat) => lon >= w && lon <= e && lat >= s && lat <= n;
const inBoxes = (boxes, it) => boxes.some((b) => inBox(b, it.lon, it.lat));

/** The index of the cell holding a point, or null outside every cell. */
export function cellIndexOf(cells, lon, lat) {
  const i = cells.findIndex(([w, s, e, n]) => lon >= w && lon < e && lat >= s && lat < n);
  if (i >= 0) return i;
  const edge = cells.findIndex((c) => inBox(c, lon, lat));
  return edge >= 0 ? edge : null;
}

/**
 * SB12: which cells to sweep: every one with nothing kept; a box's when one is given; else this week's share of
 * the quarterly safety sweep.
 */
export function cellsToAsk(cells, { kept, box = null, week = 0 }) {
  if (!kept) return cells.map((_, i) => i);
  if (box) {
    const [bw, bs, be, bn] = box;
    return cells.flatMap(([w, s, e, n], i) => (w < be && e > bw && s < bn && n > bs ? [i] : []));
  }
  return cells.flatMap((_, i) => (i % SWEEP_WEEKS === week % SWEEP_WEEKS ? [i] : []));
}

/** SB12: this week's share of a region's safety sweep, as cell indices. */
export const sweepShare = (region, week) => cellsToAsk(cellsFor(REGIONS[region], 2), { kept: { items: [] }, week });

const byIdOrder = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** SB12: the kept rows of the swept cells are replaced by what the sweep found; every other row stays. */
export function mergeCells(kept, fresh, asked) {
  const swept = new Set(asked);
  const out = new Map(kept.filter((it) => !swept.has(it.cell)).map((it) => [it.id, it]));
  for (const it of fresh) out.set(it.id, it);
  return [...out.values()].sort(byIdOrder);
}

/**
 * SB3, SB4: the kept items with the changes applied. A changed item in the region is added or replaced; one outside
 * it leaves. A kept item the service no longer knows (merged or deleted) leaves, and so does one modified since
 * that no changes query returned (it left its class or lost its location). A kept item not modified stays.
 * @param {{ kept: any[], changed: any[], modifiedAt: Map<string, string>, since: string, boxes: number[][] }} o
 */
export function mergeChanges({ kept, changed, modifiedAt, since, boxes }) {
  const sinceMs = Date.parse(since);
  const returned = new Set(changed.map((it) => it.id));
  const out = new Map();
  for (const it of kept) {
    const m = modifiedAt.get(it.id);
    if (m == null) continue;
    if (Date.parse(m) > sinceMs && !returned.has(it.id)) continue;
    out.set(it.id, it);
  }
  for (const it of changed) {
    if (inBoxes(boxes, it)) out.set(it.id, it);
    else out.delete(it.id);
  }
  return [...out.values()].sort(byIdOrder);
}

const wait = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/** The query service, politely; null on a timeout (the caller splits a cell or gives up), and throws when it refuses. */
async function serviceAsk(query) {
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
    // A timeout (504, or no answer): the caller decides.
    if (!res || res.status === 500 || res.status === 504) return null;
    throw new Error(`Wikidata answered ${res.status}`);
  }
  throw new Error('Wikidata kept refusing');
}

/** Sweeps cells, splitting one that times out; every item found carries its cell's index. */
async function sweep(cells, asked, { ask, pause, targets = ALL_TARGETS }) {
  const found = new Map();
  async function one(box, i, depth) {
    const rows = await ask(cellQuery(box, targets));
    await wait(pause);
    if (rows == null) {
      if (depth >= 4) throw new Error(`cell ${box.join(',')} still times out at depth ${depth}`);
      for (const q of splitCell(box)) await one(q, i, depth + 1);
      return;
    }
    for (const it of itemsFrom(rows)) if (!found.has(it.id)) found.set(it.id, { ...it, cell: i });
  }
  for (const [n, i] of asked.entries()) {
    await one(cells[i], i, 0);
    if (n % 25 === 0) console.error(`${n + 1}/${asked.length} cells, ${found.size} items`);
  }
  return [...found.values()];
}

/**
 * One run, as a value: the next kept output, or a rejection that leaves the kept output as it was (SB1).
 * @param {{ region: string, kept: { header: { startedAt: string, classes: string[] }, items: any[] } | null, week: number,
 *   box?: number[] | null, now: string, pause?: number, ask?: (q: string) => Promise<any[] | null> }} o
 */
export async function runFetch({ region, kept, week, box = null, now, pause = 1500, ask = serviceAsk }) {
  const boxes = REGIONS[region];
  if (!boxes) throw new Error(`no region ${region}`);
  const cells = cellsFor(boxes, 2);
  const header = { startedAt: now, classes: [...ALL_TARGETS] };
  if (!kept) return { header, items: await sweep(cells, cellsToAsk(cells, { kept: null }), { ask, pause }) };
  if (box) {
    // A sweep by hand doesn't move the changes clock: the next weekly run still asks from the last one.
    const asked = cellsToAsk(cells, { kept, box });
    return { header: kept.header, items: mergeCells(kept.items, await sweep(cells, asked, { ask, pause }), asked) };
  }
  const since = sinceOf(kept.header.startedAt);
  const known = new Set(kept.header.classes);
  const changed = new Map();
  for (const target of ALL_TARGETS) {
    for (const country of COUNTRIES[region]) {
      const whole = !known.has(target);
      const rows = await ask(changesQuery(target, country, whole ? null : since));
      await wait(pause);
      // A new class too big to ask whole is swept for itself instead (SB11).
      const items = rows ?? (whole ? await sweep(cells, cells.map((_, i) => i), { ask, pause, targets: [target] }) : null);
      if (!items) throw new Error(`the changes for ${target} timed out`);
      for (const it of rows ? itemsFrom(items) : items) changed.set(it.id, { ...it, cell: it.cell ?? cellIndexOf(cells, it.lon, it.lat) });
    }
  }
  const modifiedAt = new Map();
  const ids = kept.items.map((it) => it.id);
  for (let i = 0; i < ids.length; i += IDS_PER_QUERY) {
    const rows = await ask(modifiedQuery(ids.slice(i, i + IDS_PER_QUERY)));
    await wait(pause);
    if (rows == null) throw new Error('the kept items\' check timed out');
    for (const b of rows) modifiedAt.set(qid(b.item.value), b.m.value);
  }
  const merged = mergeChanges({ kept: kept.items, changed: [...changed.values()], modifiedAt, since, boxes });
  const asked = cellsToAsk(cells, { kept, week });
  return { header, items: mergeCells(merged, await sweep(cells, asked, { ask, pause }), asked) };
}

/** The ISO week number of a date. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - jan1) / 86400000 + 1) / 7);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const region = arg('region');
  const out = arg('out');
  if (!REGIONS[region] || !out) {
    console.error('usage: fetch-wikidata.mjs --region us [--kept kept.jsonl] [--box w,s,e,n] --out next.jsonl');
    process.exit(1);
  }
  const keptPath = arg('kept');
  const kept = keptPath && existsSync(keptPath) ? readKept(readFileSync(keptPath, 'utf8')) : null;
  const box = arg('box') ? arg('box').split(',').map(Number) : null;
  const now = new Date();
  const next = await runFetch({ region, kept, week: isoWeek(now), box, now: now.toISOString().replace(/\.\d{3}Z$/, 'Z') });
  writeFileSync(out, writeKept(next));
  console.error(`done: ${next.items.length} items (${kept ? `${kept.items.length} kept before` : 'first run'})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
