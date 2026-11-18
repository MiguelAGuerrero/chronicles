// @tree-wide: journeys side by side (scripts/e2e-batch.js) and the green cache they share (scripts/e2e/economy.js)
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// The owner, Nov 18: "Run 3 in parallel", "Trust the green cache" (docs/TESTING.md, "The e2e's economy").

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const batch = load(join(ROOT, 'scripts', 'e2e-batch.js')) as {
  summarize(name: string, out: string, code: number): { name: string; state: string; line: string };
  parseArgs(argv: string[]): { width: number; out: string | null; names: string[] };
};
const economy = load(join(ROOT, 'scripts', 'e2e', 'economy.js')) as {
  readGreen(root: string): Record<string, unknown>;
  writeGreen(root: string, greens: Record<string, unknown>): void;
};

test('e2e batch: a journey already green, one that passed and one that failed each read as one line', () => {
  assert.equal(batch.summarize('into', 'e2e into: already green on these inputs (its file...)', 0).state, 'green');
  const pass = batch.summarize('into', 'ok - WI1: a\nok - WI2: b\n', 0);
  assert.deepEqual([pass.state, pass.line], ['pass', 'into: pass (2 checks)']);
  const fail = batch.summarize('drive', 'ok - DW2: a\nnot ok - DW3: the card opens\n', 1);
  assert.equal(fail.state, 'fail');
  assert.match(fail.line, /^drive: FAIL after 1 checks: DW3: the card opens/);
  const stopped = batch.summarize('drive', 'ok - DW2: a\npage.waitForSelector: Timeout 15000ms exceeded.\n', 1);
  assert.match(stopped.line, /FAIL after 1 checks: page\.waitForSelector: Timeout/, 'a run that stops names its last line');
});

test('e2e batch: three at a time unless told, and the journeys in the order given', () => {
  assert.deepEqual(batch.parseArgs(['into', 'walk']), { width: 3, out: null, names: ['into', 'walk'] });
  assert.equal(batch.parseArgs(['-j', '2', 'into']).width, 2);
});

test('e2e batch: the green cache is written whole, so a run beside it never reads it half-written', () => {
  const root = mkdtempSync(join(tmpdir(), 'green-'));
  economy.writeGreen(root, { into: { strict: 'a', covers: 'b', at: 'now' } });
  assert.deepEqual(economy.readGreen(root), { into: { strict: 'a', covers: 'b', at: 'now' } });
  assert.deepEqual(readdirSync(root), ['.e2e-green.json'], 'no temporary file is left behind');
  writeFileSync(join(root, '.e2e-green.json'), '{"into": ');
  assert.deepEqual(economy.readGreen(root), {}, 'a torn file reads as empty, which is why a write is never torn');
  assert.ok(readFileSync(join(root, '.e2e-green.json'), 'utf8').length > 0);
});
