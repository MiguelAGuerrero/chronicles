import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { GAZETTEER_CREDIT } from '../../../components/map/types';
import { PACK_FETCH_MS, PACK_FILE, packUrl, type GazetteerPack } from '../../gazetteer/pack';
import { createGazetteerSource, indexOf } from '../../gazetteer/loader';
import { createRequire } from 'node:module';

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

/** Whether a module's text could pull the pack into a bundle (gazetteer-web-fetch audit 3: any mention, not one import form). */
const namesPack = (text: string) => /assets\/gazetteer\//.test(text);

test('gazetteer-web-fetch audit 3: a side-effect import, a spaced require and a require over two lines all count as naming the pack', () => {
  assert.ok(namesPack("import '../../../assets/gazetteer/places.json';"));
  assert.ok(namesPack("const p = require( '../../../assets/gazetteer/places.json');"));
  assert.ok(namesPack("const p = require(\n  '../../../assets/gazetteer/places.json',\n);"));
  assert.ok(!namesPack('copied from `assets/gazetteer` into `public/`'), 'the folder named in a comment, with no file under it, is not the pack');
});

test('gazetteer web fetch 3: only the native source names the bundled pack; the web source fetches it by its address', () => {
  const naming = walk(join(ROOT, 'src')).filter((f) => namesPack(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
  assert.deepEqual(naming, ['src/lib/gazetteer/source.ts'], 'a second module requiring the pack would inline it in the web bundle');
  const web = join(ROOT, 'src/lib/gazetteer/source.web.ts');
  assert.ok(existsSync(web), 'the web has a source of its own');
  const text = readFileSync(web, 'utf8');
  assert.match(text, /packUrl\(/);
  assert.match(text, /fetch\(/);
  assert.match(text, /EXPO_BASE_URL/, 'under the site\'s base path, as the map\'s worker');
});

test('gazetteer-web-fetch audit 1: the web fetch carries a timeout, so a stall ends in a failure Try again reads past', async () => {
  const { bundledGazetteer } = await import('../../gazetteer/source.web');
  const realFetch = globalThis.fetch;
  const realTimeout = AbortSignal.timeout;
  const asked: string[] = [];
  let timeoutMs: number | null = null;
  // A request that never answers: it ends only when its signal aborts (here at once, standing in for the timeout).
  AbortSignal.timeout = ((ms: number) => { timeoutMs = ms; return AbortSignal.abort(new Error('timed out')); }) as typeof AbortSignal.timeout;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(String(url));
    if (!init?.signal) throw new Error('a fetch with no signal would wait for good');
    if (init.signal.aborted) throw init.signal.reason;
    return new Promise(() => {});
  }) as typeof fetch;
  try {
    await assert.rejects(() => bundledGazetteer.load());
    assert.equal(timeoutMs, PACK_FETCH_MS, 'the timeout is the named one');
    assert.ok(PACK_FETCH_MS >= 30000 && PACK_FETCH_MS <= 120000, 'long enough for about 2 MB on a slow link, short enough to say so');
    assert.equal(asked[0], packUrl('', GAZETTEER_CREDIT));
    AbortSignal.timeout = realTimeout;
    globalThis.fetch = (async () => ({ ok: false, status: 404 }) as Response) as typeof fetch;
    await assert.rejects(() => bundledGazetteer.load(), /404/, 'a missing file is a failure too');
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => PACK }) as unknown as Response) as typeof fetch;
    assert.equal((await bundledGazetteer.load()).id, PACK.id, 'Try again reads again and keeps the pack');
  } finally {
    globalThis.fetch = realFetch;
    AbortSignal.timeout = realTimeout;
  }
});

test('gazetteer-web-fetch audit 4: a change to the pack\'s address, the loader or the pack names the launch journey', () => {
  const affected = createRequire(__filename)(join(ROOT, 'scripts', 'affected.js')) as { e2eFor(changed: string[]): { scenarios: { name: string }[] } };
  for (const file of ['src/lib/gazetteer/pack.ts', 'src/lib/gazetteer/loader.ts', 'src/lib/gazetteer/source.web.ts', 'assets/gazetteer/places.json', 'scripts/copy-maplibre-worker.js']) {
    assert.ok(affected.e2eFor([file]).scenarios.some((j) => j.name === 'launch'), file);
  }
});

test('gazetteer-web-fetch audit 5: indexOf after a failed load reads again, and two calls share one build', async () => {
  let reads = 0;
  const source = createGazetteerSource(() => { if (reads++ === 0) throw new Error('offline'); return PACK; });
  await assert.rejects(() => indexOf(source));
  const [a, b] = [indexOf(source), indexOf(source)];
  assert.equal(a, b, 'one build while it is out');
  const ix = await a;
  assert.equal(await indexOf(source), ix, 'and kept once built');
  assert.equal(reads, 2);
});

/** The names a module exports, sorted. */
const exportsOf = (text: string) => [
  ...[...text.matchAll(/export\s+(?:const|function|class|interface|type|let)\s+(\w+)/g)].map((m) => m[1]),
  ...[...text.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((n) => n.replace(/^\s*type\s+/, '').split(/\s+as\s+/).pop()!.trim()).filter(Boolean)),
].sort();

test('gazetteer-web-fetch audit 7: source.ts and source.web.ts export the same names, the bundled source alone', () => {
  const native = exportsOf(readFileSync(join(ROOT, 'src/lib/gazetteer/source.ts'), 'utf8'));
  const web = exportsOf(readFileSync(join(ROOT, 'src/lib/gazetteer/source.web.ts'), 'utf8'));
  assert.deepEqual(web, native, 'tsc reads only source.ts, so a name only it exports is undefined on the web');
  assert.deepEqual(native, ['bundledGazetteer'], 'the shared loading is imported from ./loader');
  assert.match(readFileSync(join(ROOT, 'src/lib/gazetteer/usePlaceSearch.ts'), 'utf8'), /from '\.\/loader'/);
});
