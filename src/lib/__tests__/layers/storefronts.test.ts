import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LAYERS } from '../../layers/registry';
import { decodeLayers } from '../../layers/state';

// specs/storefronts: the layer is Storefronts (SF1), no word of the concept says busy (SF9), the code says storefronts
// (SF13), a layer saved under the old id holds (SF12), and the docs that pinned the old words say they were amended (SF14).

const ROOT = join(__dirname, '../../../..');
const files = (dir: string, out: string[] = []): string[] => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== '__tests__') files(p, out);
    } else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
};
const SRC = files(join(ROOT, 'src'));
const rel = (p: string) => p.slice(ROOT.length + 1);

test('SF1: the Layers panel lists Storefronts, with the storefront icon and a tip with no number', () => {
  const l = LAYERS.find((x) => x.id === 'storefronts');
  assert.ok(l, 'a layer with the id storefronts');
  assert.equal(l.name, 'Storefronts');
  assert.equal(l.icon, 'storefront-outline');
  assert.equal(l.legend[0].text, 'Storefronts');
  assert.match(l.legend[0].tip ?? '', /shops, food, drink, services and offices you walk into/);
  assert.doesNotMatch(l.legend[0].tip ?? '', /\d/);
});

test('SF7: the walk\'s Explore help line says storefronts', () => {
  const walk = readFileSync(join(ROOT, 'src/app/walk.tsx'), 'utf8');
  assert.ok(walk.includes('with storefronts and reminders'));
});

/** A string literal's text, from quotes or backticks on one line. */
const literals = (line: string): string[] => [...line.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g)].map((m) => m[0]);
/** Walkability's traffic sense of busy (SF9 keeps it). */
const TRAFFIC = /far apart and busy/;

/**
 * The other meanings of busy SF9 and SF13 leave alone: a button's or a capture's wait, an overloaded server, a recorder or a
 * queue at work, SQLite's busy timeout, walkability's traffic. Each is a token, so a new use of the concept never passes.
 */
const OTHER_BUSY = [
  /busyLabel|busyRow/, /\bbusy[?]?: (boolean|true|locating|\(\) =>)/, /\bbusy=\{/, /\{ busy[,:} ]/, /[gG]apBusy/, /run\.busy/, /exploreBusy|atlasBusy/,
  /OVERPASS_BUSY|BUSY_MS/, /busy_timeout/, /withBusy|type Busy = |<Busy>/, /props\.busy|cap\.busy|p\.busy\(\)|busy\.current/, /\blet busy\b|\bbusy = (true|false)/,
  /const busy = (useRef|\(retryAfter)|return busy\(|=> busy\(\)/, /far apart and busy/, /\[busy, setBusy\]|setBusy|isBusy/, /accessibilityState=\{\{ busy/,
  /busy, ask later|busy answer|made it busy|card stays, busy|said \(busy/, /\bbusy\b,?$/, /shows busy|while busy|aria-busy|busy is said/,
  /storefronts: 'busy'/, /saveState\??\.busy|const busy = !!|disabled=\{busy\}|\|\| busy\)|busy \|\||\(busy \|\| |busy: string \| null/,
];

test('SF9: no line or label of the concept says busy, busiest or most, and none counts storefronts', () => {
  const bad: string[] = [];
  for (const f of SRC) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const s of literals(line)) {
        if (/\bbus(y|iest|ier)\b/i.test(s) && !TRAFFIC.test(s) && !OTHER_BUSY.some((r) => r.test(line))) bad.push(`${rel(f)}:${i + 1} ${s}`);
        if (/storefronts?\b/i.test(s) && /\b(most|more|fewer)\b|\$\{[^}]*\}\s*storefront|\d+\s*storefront/i.test(s)) bad.push(`${rel(f)}:${i + 1} ${s}`);
      }
    });
  }
  assert.deepEqual(bad, []);
});


test('SF13: no module, prop, test id, map layer or perf counter under src/ names the concept busy', () => {
  const bad: string[] = [];
  for (const f of SRC) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/busy|busiest|busier/i.test(line) && !OTHER_BUSY.some((r) => r.test(line))) bad.push(`${rel(f)}:${i + 1} ${line.trim().slice(0, 140)}`);
    });
    if (/busy/i.test(rel(f))) bad.push(`${rel(f)}: the file's name`);
  }
  assert.deepEqual(bad, []);
});

test('SF12: a layer saved on under the old id stays on as Storefronts; saved off stays off', () => {
  assert.equal((decodeLayers(JSON.stringify({ busy: true }), null) as Record<string, boolean>).storefronts, true);
  assert.equal((decodeLayers(JSON.stringify({ busy: false }), null) as Record<string, boolean>).storefronts, false);
  assert.equal((decodeLayers(JSON.stringify({ storefronts: true, busy: false }), null) as Record<string, boolean>).storefronts, true, 'the new id wins');
  assert.equal('busy' in decodeLayers(JSON.stringify({ busy: true }), null), false, 'the old id is not a layer');
});

const AMENDED = [
  'docs/decisions/0080-activity-density.md', 'docs/decisions/0127-presence-by-bars.md',
  ...['activity-density', 'explore-carousel', 'free-look', 'scenic-routes', 'complexes', 'v1.5-landing', 'explore-dense-city', 'town-presence', 'explore-atlas', 'map-layers'].map((s) => `specs/${s}/spec.md`),
];

test('SF14: decisions 0080 and 0127 and the shipped specs that pin the old words say they were amended', () => {
  for (const f of AMENDED) {
    const p = f.includes('0127') ? readdirSync(join(ROOT, 'docs/decisions')).find((x) => x.startsWith('0127-')) : null;
    const text = readFileSync(join(ROOT, p ? `docs/decisions/${p}` : f), 'utf8');
    assert.match(text, /Amended by `specs\/storefronts`/, f);
  }
});

test('storefronts ui 1: the walk\'s Explore line says what Explore does with storefronts: a chip names the street you\'re on', { todo: 'test first' }, () => {
  const walk = readFileSync(join(ROOT, 'src/app/walk.tsx'), 'utf8');
  assert.ok(walk.includes('a chip names the storefront street you’re on'));
});

test('storefronts ui 2: the card says what counts under its Storefronts heading, in the layer tip\'s own words', { todo: 'test first' }, async () => {
  const reg = (await import('../../layers/registry')) as unknown as { STOREFRONTS_WHAT?: string };
  assert.ok(reg.STOREFRONTS_WHAT, 'one sentence, shared');
  assert.equal(LAYERS.find((x) => x.id === 'storefronts')?.legend[0].tip, reg.STOREFRONTS_WHAT);
  assert.ok(readFileSync(join(ROOT, 'src/components/atlas/AtlasCard.tsx'), 'utf8').includes('{STOREFRONTS_WHAT}'), 'the card shows it under the heading');
});
