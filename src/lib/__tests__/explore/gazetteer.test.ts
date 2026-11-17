import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { lookRowLabel, lookWords } from '../../atlas/freeLook';
import { fold } from '../../gazetteer/normalize';
import { PACK_FIELDS, validatePack, type GazetteerPack } from '../../gazetteer/pack';
import { LIMIT, buildIndex, search } from '../../gazetteer/search';
import { createGazetteerSource } from '../../gazetteer/source';
import { announceSearch, placeLine, searchAvailable, searchWords } from '../../gazetteer/words';
import type { LngLat } from '../../types';

// Place search (specs/place-search): written first, as todos, each failing until its code ("place-search: not built").
const E4 = 1e4;
interface Row { code?: string; name: string; ascii?: string; alts?: string[]; region: string; country: string; at: LngLat }
function packOf(rows: Row[]): GazetteerPack {
  const regions: string[] = [];
  const regionCodes: string[] = [];
  const countries: string[] = [];
  const idx = (list: string[], v: string) => (list.includes(v) ? list.indexOf(v) : list.push(v) - 1);
  const regionIx = (r: Row) => {
    const at = idx(regions, r.region);
    regionCodes[at] = r.code ?? regionCodes[at] ?? '';
    return at;
  };
  return {
    id: 'test-2026-11-16',
    credit: 'Place names: a test dataset',
    names: rows.map((r) => r.name),
    ascii: rows.map((r) => r.ascii ?? r.name),
    alts: rows.map((r) => r.alts ?? []),
    region: rows.map(regionIx),
    country: rows.map((r) => idx(countries, r.country)),
    lat: rows.map((r) => Math.round(r.at[1] * E4)),
    lon: rows.map((r) => Math.round(r.at[0] * E4)),
    regions,
    regionCodes,
    countries,
  };
}

const CAMP_HILL: LngLat = [-76.92, 40.24];
const US = 'United States';
const ROWS: Row[] = [
  { name: 'Zürich', ascii: 'Zurich', region: 'Zurich', country: 'Switzerland', at: [8.55, 47.37] },
  { name: 'New York City', region: 'New York', country: US, at: [-74.0, 40.71] },
  { name: 'Carlisle', code: 'PA', region: 'Pennsylvania', country: US, at: [-77.19, 40.2] },
  { name: 'Carlisle', region: 'England', country: 'United Kingdom', at: [-2.93, 54.89] },
  { name: 'Springfield', region: 'Illinois', country: US, at: [-89.65, 39.8] },
  { name: 'Springfield', region: 'Massachusetts', country: US, at: [-72.59, 42.1] },
  { name: 'Springfield', region: 'Missouri', country: US, at: [-93.29, 37.21] },
  { name: 'St. Louis', region: 'Missouri', country: US, at: [-90.2, 38.63] },
  { name: 'Köln', ascii: 'Koln', alts: ['Cologne'], region: 'North Rhine-Westphalia', country: 'Germany', at: [6.95, 50.94] },
  { name: 'Camp Hill', region: 'Pennsylvania', country: US, at: CAMP_HILL },
];
const index = () => buildIndex(packOf(ROWS));
const names = (q: string, origin: LngLat | null = null) => search(index(), q, origin).places.map((p) => `${p.name}, ${p.region}`);

test('GZ3: case, diacritics, punctuation and Saint/St fold', () => {
  assert.equal(fold('Zürich'), 'zurich');
  assert.equal(fold('St. Louis'), 'st louis');
  assert.equal(fold('Saint-Louis'), 'st louis');
  assert.deepEqual(names('ZURICH'), ['Zürich, Zurich']);
  assert.deepEqual(names('st louis'), ['St. Louis, Missouri']);
  assert.deepEqual(names('saint louis'), ['St. Louis, Missouri']);
});

test('GZ3: the start of any word matches, and an alternate name finds its place', () => {
  assert.deepEqual(names('york'), ['New York City, New York']);
  assert.deepEqual(names('cologne'), ['Köln, North Rhine-Westphalia']);
  assert.deepEqual(names('hill'), ['Camp Hill, Pennsylvania']);
});

test('GZ3: one letter and an empty field list nothing; later words may start the region or country', () => {
  assert.deepEqual(names(''), []);
  assert.deepEqual(names('s'), []);
  assert.deepEqual(names('springfield il'), ['Springfield, Illinois']);
  assert.deepEqual(names('carlisle united k'), ['Carlisle, England']);
  assert.deepEqual(names('carlisle pa'), ['Carlisle, Pennsylvania'], 'a short region code finds it');
});

test('GZ4: nearest first from the origin, else by name then region; never by anything else', () => {
  assert.deepEqual(names('carlisle', CAMP_HILL), ['Carlisle, Pennsylvania', 'Carlisle, England']);
  assert.deepEqual(names('carlisle', [-3, 54.9]), ['Carlisle, England', 'Carlisle, Pennsylvania']);
  assert.deepEqual(names('springfield'), ['Springfield, Illinois', 'Springfield, Massachusetts', 'Springfield, Missouri']);
});

test('GZ4: the order\'s origin is an argument, so a search after a pick uses the live middle and no memory', () => {
  const ix = index();
  const a = search(ix, 'springfield', [-72.6, 42.1]).places[0].region;
  const b = search(ix, 'springfield', [-93.3, 37.2]).places[0].region;
  assert.equal(a, 'Massachusetts');
  assert.equal(b, 'Missouri');
});

test('GZ4: a capped list keeps the nearest, says more matched, and every place stays reachable by typing more', () => {
  const many: Row[] = Array.from({ length: LIMIT + 5 }, (_, i) => ({ name: `Springfield`, region: `Region ${String.fromCharCode(97 + i)}x`, country: US, at: [-80 + i, 40] as LngLat }));
  const ix = buildIndex(packOf(many));
  const r = search(ix, 'springfield', [-80, 40]);
  assert.equal(r.places.length, LIMIT);
  assert.equal(r.more, true);
  assert.equal(r.places[0].region, 'Region ax', 'the nearest is kept');
  const far = search(ix, 'springfield region mx', [-80, 40]);
  assert.deepEqual(far.places.map((p) => p.region), ['Region mx']);
  assert.equal(search(index(), 'springfield', null).more, false);
});

test('GZ5: a row is name, region and country, and no digit, distance or size', () => {
  const [p] = search(index(), 'carlisle', CAMP_HILL).places;
  assert.deepEqual(Object.keys(p).sort(), ['at', 'country', 'index', 'name', 'region']);
  const line = placeLine(p);
  assert.equal(line, 'Pennsylvania, United States');
  assert.equal(placeLine({ region: '', country: 'Monaco' }), 'Monaco');
  assert.doesNotMatch(line, /\d|\bkm\b|\bmi\b|\baway\b/i);
});

test('GZ6: a named look names the place in every word and never says the middle of the map', () => {
  const named = { name: 'Carlisle', region: 'Pennsylvania' };
  const w = lookWords(named);
  assert.equal(w.title, 'Around Carlisle');
  assert.equal(w.subtitle, 'Pennsylvania');
  for (const text of [w.title, w.subtitle, w.announcement, w.empty, lookRowLabel(true, named), lookRowLabel(false, named)]) {
    assert.doesNotMatch(text, /middle of the map/i);
  }
  assert.match(w.announcement, /Carlisle/);
  assert.match(w.empty, /Carlisle/);
  assert.match(lookRowLabel(true, named), /Carlisle/);
  assert.match(lookWords().title, /middle of the map/, 'an unnamed look keeps its words');
});

test('GZ8: no match and an unreadable pack say their words, with a way on and no apology', () => {
  const w = searchWords();
  assert.equal(w.none, 'No towns or cities start like that.');
  assert.equal(w.wayOn, 'Smaller places are reached by Move map.');
  assert.equal(w.unavailable, 'Search is unavailable.');
  assert.equal(w.retry, 'Try again');
  assert.doesNotMatch(w.unavailable, /sorry|apolog/i);
});

test('GZ11: no word or announcement carries a digit or a rank word, and a screen reader hears only none/some/loading changes', () => {
  const w = searchWords();
  for (const text of Object.values(w)) assert.doesNotMatch(text, /\d|\btop\b|\bbest\b|\bnearest\b|\bclosest\b|\bpopular\b|\bmatches \d/i);
  assert.equal(announceSearch('some', 'some'), null);
  assert.equal(announceSearch('idle', 'idle'), null);
  assert.equal(announceSearch('idle', 'some'), 'Matches listed');
  assert.equal(announceSearch('some', 'none'), 'No matches');
  assert.equal(announceSearch('none', 'none'), null);
  assert.ok(announceSearch('idle', 'loading'));
  for (const a of ['idle', 'loading', 'none', 'some', 'unavailable'] as const) for (const b of ['idle', 'loading', 'none', 'some', 'unavailable'] as const) {
    assert.doesNotMatch(announceSearch(a, b) ?? '', /\d/);
  }
});

test('GZ12: the build script turns a dataset dump into a valid pack', () => {
  const { packFromGeoNames } = createRequire(import.meta.url)('../../../../scripts/build-gazetteer.js');
  const cities = [
    ['1', 'Zürich', 'Zurich', 'Zuerich,Zurigo,Цюрих,ZRH,Zurich2', '47.36667', '8.55', 'P', 'PPLA', 'CH', '', '25'],
    ['2', 'Carlisle', 'Carlisle', '', '40.2', '-77.19', 'P', 'PPL', 'US', '', 'PA'],
  ].map((r) => r.join('\t')).join('\n');
  const admin1 = 'CH.25\tZurich\tZurich\t2657895\nUS.PA\tPennsylvania\tPennsylvania\t6254927';
  const countries = '#comment\nCH\tCHE\t756\tSZ\tSwitzerland\nUS\tUSA\t840\tUS\tUnited States';
  const pack = packFromGeoNames(cities, admin1, countries, 'dump-2026-11-16');
  assert.deepEqual(validatePack(pack), []);
  assert.equal(pack.id, 'dump-2026-11-16');
  assert.deepEqual(pack.alts[0], ['Zuerich', 'Zurigo', 'ZRH'], 'ASCII, capitalised, no digits, not the name again');
  assert.equal(pack.regions[pack.region[0]], 'Zurich');
  assert.equal(pack.countries[pack.country[1]], 'United States');
  assert.equal(pack.lat[1], 402000);
  assert.equal(pack.lon[1], -771900);
  assert.match(pack.credit, /CC BY 4\.0/);
});

test('GZ13: validatePack rejects a population or any field outside the list, and a table out of step', () => {
  const good = packOf(ROWS);
  assert.deepEqual(validatePack(good), []);
  assert.ok(validatePack({ ...good, population: [1] }).length > 0, 'a population is refused');
  assert.ok(validatePack({ ...good, rank: [1] }).length > 0);
  assert.ok(validatePack({ ...good, lat: good.lat.slice(1) }).length > 0, 'columns must be the same length');
  assert.deepEqual(Object.keys(good).sort(), [...PACK_FIELDS].sort());
});

test('GZ15: nothing is read until the source is first asked, and then once', async () => {
  let reads = 0;
  const source = createGazetteerSource(() => { reads++; return packOf(ROWS); });
  assert.equal(reads, 0, 'creating a source reads nothing');
  await source.load();
  await source.load();
  assert.equal(reads, 1);
});

test('GZ15: a failed read is a rejection the screen can retry', async () => {
  let n = 0;
  const source = createGazetteerSource(() => { if (n++ === 0) throw new Error('boom'); return packOf(ROWS); });
  await assert.rejects(() => source.load());
  assert.equal((await source.load()).id, 'test-2026-11-16');
});

test('GZ15: seventy thousand places answer in bounded work', () => {
  const rows: Row[] = Array.from({ length: 70000 }, (_, i) => ({ name: `Town ${i.toString(36)} ${i % 97}`, alts: [`Alt${i.toString(36)}`], region: `R${i % 50}`, country: `C${i % 20}`, at: [(i % 360) - 180, (i % 170) - 85] as LngLat }));
  const ix = buildIndex(packOf(rows));
  const t0 = Date.now();
  const r = search(ix, 'to', [0, 0]);
  const ms = Date.now() - t0;
  assert.ok(ms < 250, `a two-letter query took ${ms} ms`);
  assert.ok(r.examined <= 4 * rows.length, 'the work is bounded by the matches, not a rescan of every place');
  assert.equal(r.places.length, LIMIT);
});

test('GZ17: the magnifier is absent while the walk planner is open and there otherwise', () => {
  assert.equal(searchAvailable({ plan: true }), false);
  assert.equal(searchAvailable({ plan: false }), true);
});
