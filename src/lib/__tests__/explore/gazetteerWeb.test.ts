import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { GAZETTEER_CREDIT } from '../../../components/map/types';
import { PACK_FILE, packUrl, type GazetteerPack } from '../../gazetteer/pack';
import { createGazetteerSource } from '../../gazetteer/source';

// The pack on the web (DEFERRED "Explore and discovery", the owner's answer of Nov 16, "Fetch on first search"): the web
// build fetches the pack as a file of its own the first time search opens, never inlined in the entry bundle; native keeps
// the bundled `require` (decision 0184).
const ROOT = join(__dirname, '../../../..');
const PACK: GazetteerPack = {
  id: 'test-2026-11-16', credit: 'Place names: a test dataset', names: ['Cranston'], ascii: ['Cranston'], alts: [[]], region: [0], country: [0],
  lat: [417797], lon: [-714373], regions: ['Rhode Island'], regionCodes: ['RI'], countries: ['United States'],
};

test('gazetteer web fetch 1: the web pack is one fixed file under the site\'s base path, its query the pack\'s date', () => {
  assert.equal(PACK_FILE, 'gazetteer/places.json');
  assert.equal(packUrl('', 'Place names: a dataset, 2026-11-16'), '/gazetteer/places.json?v=2026-11-16');
  assert.equal(packUrl('/chronicles', 'Place names: a dataset, 2026-11-16'), '/chronicles/gazetteer/places.json?v=2026-11-16');
  assert.equal(packUrl('/chronicles/', 'Place names: a dataset, 2026-11-16'), '/chronicles/gazetteer/places.json?v=2026-11-16', 'a trailing slash on the base is not doubled');
  // The app's own credit carries the committed pack's date (gazetteerPack.test.ts holds it equal to the pack's credit), so a rebuilt pack is asked under a new address.
  const date = /\d{4}-\d{2}-\d{2}/.exec(GAZETTEER_CREDIT)?.[0];
  assert.ok(date);
  assert.equal(packUrl('', GAZETTEER_CREDIT), `/gazetteer/places.json?v=${date}`);
  assert.notEqual(packUrl('', 'Place names: a dataset, 2026-11-16'), packUrl('', 'Place names: a dataset, 2027-01-02'));
  assert.equal(packUrl('', 'Place names: undated'), '/gazetteer/places.json?v=Place%20names%3A%20undated', 'a credit with no date is the key itself');
});

test('gazetteer web fetch 2: an asynchronous read (the web\'s fetch) is awaited, validated and kept; a failed one is tried again', async () => {
  let reads = 0;
  const fetched = createGazetteerSource(async () => { reads++; await new Promise((r) => setTimeout(r, 1)); return PACK; });
  assert.equal(reads, 0, 'creating the source fetches nothing');
  const [a, b] = await Promise.all([fetched.load(), fetched.load()]);
  assert.equal(a.id, 'test-2026-11-16');
  assert.equal(a, b);
  await fetched.load();
  assert.equal(reads, 1, 'fetched once, kept in memory');

  let n = 0;
  const flaky = createGazetteerSource(async () => { if (n++ === 0) throw new Error('offline'); return PACK; });
  await assert.rejects(() => flaky.load());
  assert.equal((await flaky.load()).id, 'test-2026-11-16');

  const wrong = createGazetteerSource(async () => ({ ...PACK, population: [1] }));
  await assert.rejects(() => wrong.load(), /gazetteer pack/, 'a fetched pack is validated as the bundled one is');
  const html = createGazetteerSource(async () => '<!doctype html>');
  await assert.rejects(() => html.load(), /gazetteer pack/, 'a page served in the pack\'s place (a 404 page) is refused');
});

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : /\.(t|j)sx?$/.test(f) ? [p] : [];
  });

test('gazetteer web fetch 3: only the native source names the bundled pack; the web source fetches it by its address', () => {
  const naming = walk(join(ROOT, 'src')).filter((f) => /(require\(|import\(|from\s*)['"][^'"]*assets\/gazetteer\//.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
  assert.deepEqual(naming, ['src/lib/gazetteer/source.ts'], 'a second module requiring the pack would inline it in the web bundle');
  const web = join(ROOT, 'src/lib/gazetteer/source.web.ts');
  assert.ok(existsSync(web), 'the web has a source of its own');
  const text = readFileSync(web, 'utf8');
  assert.match(text, /packUrl\(/);
  assert.match(text, /fetch\(/);
  assert.match(text, /EXPO_BASE_URL/, 'under the site\'s base path, as the map\'s worker');
});
