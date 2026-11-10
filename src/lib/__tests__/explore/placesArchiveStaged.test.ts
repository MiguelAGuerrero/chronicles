/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tilesIn } from '../../tileMath';

// A staged places build (specs/staged-places-build, SB1-SB12, decision 0110): written from the spec before the
// code. The modules are loaded inside each test, so one that doesn't exist yet fails its own test only.

type Any = any;
const SCRIPTS = '../../../../scripts/places-archive/';
const script = (name: string): Promise<Any> => import(SCRIPTS + name);
const app = (path: string): Promise<Any> => import(path);

const STATUE = 'Q179700';
const FOLLY = 'Q180174';
const z12 = (lon: number, lat: number) => tilesIn([lon, lat, lon, lat], 12)[0];
const item = (id: string, name: string, lon: number, lat: number, p31 = [FOLLY], cell?: number) => ({
  id, name, lon, lat, p31, nhl: false, dissolved: false, closed: false, states: [], ...(cell == null ? {} : { cell }),
});
const binding = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const entity = (id: string) => `http://www.wikidata.org/entity/${id}`;

/** A query service stub: answers each query by its shape and logs every query asked. */
function service(answers: { changes?: (q: string) => object[]; still?: (ids: string[]) => object[]; cell?: (q: string) => object[] } = {}) {
  const log: string[] = [];
  const ask = async (q: string) => {
    log.push(q);
    if (/VALUES \?item/.test(q)) return answers.still?.([...q.matchAll(/wd:(Q\d+)/g)].map((m) => m[1])) ?? [];
    if (/wikibase:box/.test(q)) return answers.cell?.(q) ?? [];
    return answers.changes?.(q) ?? [];
  };
  return { ask, log };
}

test('SB1: a failed fetch rejects and leaves the kept output as it was', { todo: 'test first' }, async () => {
  const { runFetch, ALL_TARGETS } = await script('fetch-wikidata.mjs');
  const kept = { header: { startedAt: '2026-11-02T07:17:00Z', classes: [...ALL_TARGETS] }, items: [item('Q1', 'Bushkill Folly', -75.2, 40.7, [FOLLY], 0)] };
  const before = structuredClone(kept);
  await assert.rejects(
    runFetch({ region: 'us', kept, week: 46, now: '2026-11-09T07:17:00Z', pause: 0, ask: async () => { throw new Error('the service is down'); } }),
  );
  assert.deepEqual(kept, before, 'the kept output is untouched, so the last one stays in use');
});

test('SB2: the assemble makes no request and writes the same bytes from the same inputs', { todo: 'test first' }, async () => {
  const { assemble } = await script('assemble.mjs');
  const items = [item('Q1', 'Bushkill Folly', -75.2, 40.7), item('Q2', 'Lone Statue', -75.3, 40.8, [STATUE])];
  const edits = { remove: [], add: [{ name: 'Giant Peanut', at: [-75.18, 40.69], class: 'roadside_giant' }] };
  const real = globalThis.fetch;
  globalThis.fetch = (() => { throw new Error('the assemble must not fetch'); }) as typeof fetch;
  try {
    const a = assemble({ wikidata: items, edits, region: 'us', version: '20261109' });
    const b = assemble({ wikidata: [...items].reverse(), edits, region: 'us', version: '20261109' });
    assert.deepEqual(Buffer.from(a.bytes), Buffer.from(b.bytes));
    assert.equal(a.placesSha, b.placesSha);
  } finally {
    globalThis.fetch = real;
  }
});

test('SB3: a scheduled fetch asks each class by country since the last run, and no cell beyond its sweep share', { todo: 'test first' }, async () => {
  const { runFetch, ALL_TARGETS, sweepShare } = await script('fetch-wikidata.mjs');
  const kept = { header: { startedAt: '2026-11-02T07:17:00Z', classes: [...ALL_TARGETS] }, items: [item('Q1', 'Bushkill Folly', -75.2, 40.7, [FOLLY], 0)] };
  const { ask, log } = service({ still: (ids) => ids.map((id) => binding({ item: entity(id), m: '2026-01-01T00:00:00Z' })) });
  await runFetch({ region: 'us', kept, week: 46, now: '2026-11-09T07:17:00Z', pause: 0, ask });
  const changes = log.filter((q) => /schema:dateModified/.test(q) && !/VALUES \?item/.test(q));
  assert.equal(changes.length, ALL_TARGETS.length, 'one query per pinned class, and one for the landmarks');
  for (const q of changes) {
    assert.match(q, /wdt:P17 wd:Q30/, 'filtered by the region\'s country');
    assert.match(q, /"2026-11-01T07:17:00Z"/, 'since the last run began, less a day');
    assert.ok(!/wikibase:box/.test(q), 'never by box (too slow, measured Nov 9)');
  }
  const cells = log.filter((q) => /wikibase:box/.test(q));
  assert.equal(cells.length, sweepShare('us', 46).length, 'cell queries only for this week\'s share of the safety sweep');
});

test('SB4: a kept item modified away, merged or deleted leaves; an unmodified one stays without being asked', { todo: 'test first' }, async () => {
  const { mergeChanges, REGIONS } = await script('fetch-wikidata.mjs');
  const since = '2026-11-01T07:17:00Z';
  const kept = [
    item('QA', 'Unchanged Folly', -75.2, 40.7),
    item('QB', 'Renamed Folly', -75.21, 40.71),
    item('QC', 'No Longer A Folly', -75.22, 40.72),
    item('QD', 'Merged Away', -75.23, 40.73),
  ];
  const modifiedAt = new Map([['QA', '2026-01-01T00:00:00Z'], ['QB', '2026-11-05T00:00:00Z'], ['QC', '2026-11-05T00:00:00Z']]);
  const changed = [item('QB', 'Renamed Folly Tower', -75.21, 40.71), item('QE', 'New Folly', -75.24, 40.74), item('QF', 'Folly In Paris', 2.35, 48.85)];
  const out = mergeChanges({ kept, changed, modifiedAt, since, boxes: REGIONS.us });
  assert.deepEqual(out.map((i: { id: string }) => i.id).sort(), ['QA', 'QB', 'QE'], 'C changed away, D is gone from the service, F is outside the region');
  assert.equal(out.find((i: { id: string }) => i.id === 'QB').name, 'Renamed Folly Tower');
});

test('SB11: a newly pinned class is asked once across the region; the others only for changes', { todo: 'test first' }, async () => {
  const { runFetch, ALL_TARGETS } = await script('fetch-wikidata.mjs');
  const kept = { header: { startedAt: '2026-11-02T07:17:00Z', classes: ALL_TARGETS.filter((c: string) => c !== STATUE) }, items: [] };
  const { ask, log } = service();
  const next = await runFetch({ region: 'us', kept, week: 46, now: '2026-11-09T07:17:00Z', pause: 0, ask });
  const statue = log.filter((q) => q.includes(`wd:${STATUE}`) && !/wikibase:box/.test(q));
  assert.equal(statue.length, 1);
  assert.ok(!/schema:dateModified/.test(statue[0]), 'the new class is asked whole');
  const folly = log.filter((q) => q.includes(`wd:${FOLLY}`) && !/wikibase:box/.test(q));
  assert.ok(folly.every((q) => /schema:dateModified/.test(q)), 'the others only since the last run');
  assert.ok(next.header.classes.includes(STATUE), 'the new class is recorded as asked');
});

test('SB12: nothing kept sweeps every cell; a box sweeps its cells; a sweep replaces only its cells\' rows', { todo: 'test first' }, async () => {
  const { cellsToAsk, mergeCells, cellsFor, REGIONS } = await script('fetch-wikidata.mjs');
  const cells = cellsFor(REGIONS.us, 2);
  assert.equal(cellsToAsk(cells, { kept: null }).length, cells.length, 'the first run asks every cell');
  const inBox = cellsToAsk(cells, { kept: { items: [] }, box: [-76, 40, -74, 42] });
  assert.ok(inBox.length >= 1 && inBox.length <= 4, 'a 2-degree box touches at most four cells');
  for (const i of inBox) {
    const [w, s, e, n] = cells[i];
    assert.ok(w < -74 && e > -76 && s < 42 && n > 40);
  }
  const week = cellsToAsk(cells, { kept: { items: [] }, week: 46 });
  assert.ok(week.every((i: number) => i % 13 === 46 % 13), 'the safety sweep\'s share: one cell in thirteen a week');
  const kept = [item('Q1', 'Old', -75.2, 40.7, [FOLLY], 3), item('Q2', 'Elsewhere', -80, 35, [FOLLY], 9)];
  const fresh = [item('Q3', 'Swept In', -75.1, 40.6, [FOLLY], 3)];
  const merged = mergeCells(kept, fresh, [3]);
  assert.deepEqual(merged.map((i: { id: string }) => i.id).sort(), ['Q2', 'Q3']);
});

test('SB5: unchanged places publish nothing, even when the file\'s bytes differ', { todo: 'test first' }, async () => {
  const { decide } = await script('publish.mjs');
  const manifest = { schema: 1, regions: [{ id: 'us', current: { file: 'places-us-20261101.pmtiles', version: '20261101', sha256: 'aaa', places_sha256: 'P1', bounds: [-125, 24, -66, 50] } }] };
  assert.deepEqual(decide({ region: 'us', sha256: 'bbb', placesSha: 'P1', manifest }), { publish: false, reason: 'unchanged' });
  assert.deepEqual(decide({ region: 'us', sha256: 'aaa', placesSha: 'P2', manifest }), { publish: true, reason: 'changed' });
});

test('SB6: an added, a removed and a moved place list their z12 tiles, and the manifest carries the list', { todo: 'test first' }, async () => {
  const { changedTiles } = await script('changes.mjs');
  const { manifestFrom } = await script('manifest.mjs');
  const p = (id: string, lon: number, lat: number) => ({ id, name: id, class: 'folly', src: 'wd', lon, lat });
  const prev = [p('Q1', -75.2, 40.7), p('Q2', -77.0, 39.0), p('Q9', -80.0, 35.0)];
  const next = [p('Q1', -75.5, 40.9), p('Q3', -90.0, 30.0), p('Q9', -80.0, 35.0)];
  const want = [z12(-75.2, 40.7), z12(-75.5, 40.9), z12(-77.0, 39.0), z12(-90.0, 30.0)].map(String);
  assert.deepEqual(changedTiles(prev, next).map(String).sort(), [...new Set(want)].sort(), 'Q9 is unchanged and lists nothing');
  const m = manifestFrom([
    { region: 'us', file: 'places-us-20261109.pmtiles', version: '20261109', bytes: 1, sha256: 'a', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66, 50], places_sha256: 'P2', since: '20261102', changed: [[1, 2]] },
    { region: 'us', file: 'places-us-20261102.pmtiles', version: '20261102', bytes: 1, sha256: 'b', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66, 50], places_sha256: 'P1' },
  ]);
  assert.deepEqual([m.regions[0].current.since, m.regions[0].current.changed], ['20261102', [[1, 2]]]);
  assert.equal(m.regions[0].previous[0].version, '20261102');
});

test('SB7: an edit alone makes a version whose list names only the edited place\'s tile', { todo: 'test first' }, async () => {
  const { assemble } = await script('assemble.mjs');
  const { changedTiles } = await script('changes.mjs');
  const items = [item('Q1', 'Bushkill Folly', -75.2, 40.7)];
  const a = assemble({ wikidata: items, edits: { remove: [], add: [] }, region: 'us', version: '20261109' });
  const b = assemble({ wikidata: items, edits: { remove: [], add: [{ name: 'Giant Peanut', at: [-90.0, 30.0], class: 'roadside_giant' }] }, region: 'us', version: '20261110' });
  assert.notEqual(a.placesSha, b.placesSha);
  assert.deepEqual(changedTiles(a.places, b.places).map(String), [String(z12(-90.0, 30.0))]);
});

test('SB8: inputs whose hashes all match assemble nothing; a changed edit, class list or source does', { todo: 'test first' }, async () => {
  const { inputsKey } = await script('assemble.mjs');
  const base = { sources: { wikidata: 'w1' }, edits: '{"remove":[],"add":[]}', classes: 'c1' };
  assert.equal(inputsKey(base), inputsKey({ ...base }));
  assert.notEqual(inputsKey(base), inputsKey({ ...base, edits: '{"remove":[],"add":[1]}' }));
  assert.notEqual(inputsKey(base), inputsKey({ ...base, classes: 'c2' }));
  assert.notEqual(inputsKey(base), inputsKey({ ...base, sources: { wikidata: 'w2' } }));
});

test('SB9: a failed assemble writes no release files', { todo: 'test first' }, async () => {
  const { assembleRun } = await script('assemble.mjs');
  const written: string[] = [];
  const write = (name: string) => { written.push(name); };
  assert.throws(() => assembleRun({ wikidata: [item('Q1', 'Folly', -75.2, 40.7)], edits: { remove: [], add: [] }, prevPlaces: [], prevVersion: null, region: 'us', version: 'not-a-date', write }));
  assert.deepEqual(written, [], 'nothing is written before every output is ready');
  assembleRun({ wikidata: [item('Q1', 'Folly', -75.2, 40.7)], edits: { remove: [], add: [] }, prevPlaces: [], prevVersion: null, region: 'us', version: '20261109', write });
  assert.deepEqual(written.sort(), ['changes-us-20261109.json', 'places-us-20261109.pmtiles', 'places-us.jsonl']);
});

test('SB10: an area away from the changed tiles is kept; one under them, or of an unserved version, is rebuilt', { todo: 'test first' }, async () => {
  const { changedSince } = await app('../../discovery/archiveManifest');
  const { archiveStale } = await app('../../explore/explore');
  const near: [number, number] = [-75.2, 40.7];
  const far: [number, number] = [-90.0, 30.0];
  const [x1, y1] = z12(...near);
  const file = (version: string, extra = {}) => ({ file: `places-us-${version}.pmtiles`, version, bounds: [-125, 24, -66, 50], ...extra });
  const region = {
    id: 'us',
    current: file('20261116', { since: '20261109', changed: [[x1, y1]] }),
    previous: [file('20261109', { since: '20261102', changed: [[0, 0]] }), file('20261102')],
  };
  const fromOld = changedSince(region, '20261102');
  assert.ok(fromOld !== 'all' && fromOld.has(`${x1}/${y1}`) && fromOld.has('0/0'), 'the union along the chain');
  assert.equal(changedSince(region, '20261026'), 'all', 'a version the manifest no longer serves');
  assert.equal(changedSince(region, '20261116').size, 0);
  assert.equal(archiveStale('20261109', '20261116', changedSince(region, '20261109'), near), true, 'a tile its read covered changed');
  assert.equal(archiveStale('20261109', '20261116', changedSince(region, '20261109'), far), false, 'nothing it read changed');
  assert.equal(archiveStale('20261026', '20261116', changedSince(region, '20261026'), far), true, 'an unserved version rebuilds as today');
  assert.equal(archiveStale('20261109', '20261116'), true, 'no list: as today');
});
