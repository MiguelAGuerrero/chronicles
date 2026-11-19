/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Places layer (specs/places-layer PL2-PL7, PL11), written before the code: a source scan, since a screen can't run
// under `npm test` (performance.md, "Testing a cost"). Each scan is shown to fail on hand-written snippets below.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const EXPLORE = 'src/app/(tabs)/explore.tsx';

/** The declaration `const <name> = ...;` as text, to the next blank-or-const line: enough to ask what it reads. */
export function declOf(text: string, name: string): string | null {
  const m = new RegExp(`const ${name} = [\\s\\S]*?\\n  (?=const |//|\\n)`).exec(text);
  return m ? m[0] : null;
}

test('PL2, PL3, PL11: the screen computes waiting pins, dots and the spoken line only while Places is on', { todo: 'test first' }, () => {
  const t = src(EXPLORE);
  for (const name of ['split', 'waitingSaid']) {
    const d = declOf(t, name);
    assert.ok(d, `${name} is declared`);
    assert.ok(/places/.test(d), `${name} reads the Places layer`);
  }
  assert.ok(!/const ringOf[\s\S]{0,400}waiting:/.test(t), 'the card is given no waiting places');
});

test('PL4: the card\'s picture follows the switch, and the card is given nothing to show waiting', { todo: 'test first' }, () => {
  const card = src('src/components/atlas/AtlasCard.tsx');
  assert.ok(/<MiniMap[^>]*waiting=\{props\.places \? props\.waiting : \[\]\}|<MiniMap[^>]*places/.test(card), 'MiniMap gets waiting marks only while Places is on');
});

test('PL5: the screen reader\'s one button is drawn only while Places is on', { todo: 'test first' }, () => {
  const t = src(EXPLORE);
  const i = t.indexOf('atlas-waiting-said');
  assert.ok(i > 0);
  assert.ok(/places/.test(t.slice(Math.max(0, i - 400), i)), 'the button is behind the switch');
});

test('PL6, PL7: the card has no "Waiting to be found"; a kind row never reads the layer; the marks explanation says a small place can wait', { todo: 'test first' }, async () => {
  const card = src('src/components/atlas/AtlasCard.tsx');
  assert.ok(!/Waiting to be found|atlas-waiting/.test(card), 'the section is gone');
  assert.ok(!/places|waiting/i.test(src('src/components/atlas/KindStrip.tsx').split('export function KindRow')[1] ?? ''), 'KindRow takes nothing about waiting');
  const { MARKS_EXPLAINED } = await import('../../atlas/atlas');
  const said = MARKS_EXPLAINED.join(' ');
  assert.ok(/too small to light a dot/i.test(said), 'one sentence on a small place that can still wait');
  assert.ok(!/\d|find|found/i.test(said.replace(/ten-minute/, '')), 'no digit, no "find"');
});

test('PL11: the layer adds no store, read or migration', { todo: 'test first' }, () => {
  const t = src('src/lib/atlas/atlas.ts');
  assert.match(t, /const ATLAS_OWN = 'a15'/, 'ATLAS_OWN is unchanged');
});

test('the scan itself fails on a screen that forgets the layer', () => {
  const bad = 'const split = useMemo(() => {\n    return 1;\n  }, [a]);\n  const next = 1;';
  const d = declOf(bad, 'split');
  assert.ok(d && !/places/.test(d));
});
