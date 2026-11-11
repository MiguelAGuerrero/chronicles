/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Memo transcripts: no code names an engine or a library outside its adapter (MX28). Written before the rule.
const ROOT = join(__dirname, '../../../..');
const LIBS = ['whisper.rn', '@huggingface/transformers', 'chronicles-audio-decode'];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`;
    if (statSync(join(ROOT, rel)).isDirectory()) { if (n !== '__tests__') walk(rel, out); }
    else if (/\.(ts|tsx|js)$/.test(n)) out.push(rel);
  }
  return out;
};

test('MX28: only src/lib/transcribe/engines and the decoder adapter import the libraries or the decode module', { todo: 'test first' }, async () => {
  const bad: string[] = [];
  for (const f of walk('src')) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const imports = [...src.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    if (imports.some((i) => LIBS.some((l) => i === l || i.startsWith(`${l}/`) || i.includes(`modules/${l}`))) && !/^src\/lib\/transcribe\/(engines\/|decoder\.native)/.test(f)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test('MX28: lint says so, with the fix in the message, and is off only in the adapters', { todo: 'test first' }, async () => {
  const cfg = readFileSync(join(ROOT, 'eslint.config.js'), 'utf8');
  for (const l of LIBS) assert.ok(cfg.includes(`'${l}'`) || cfg.includes(l), `eslint.config.js restricts ${l}`);
  assert.match(cfg, /Transcribe through .lib\/transcribe./);
  assert.match(cfg, /src\/lib\/transcribe\/engines\/\*\*/);
});

test('MX28: no user-facing copy, meta key or table column names an engine or a library', { todo: 'test first' }, async () => {
  const names = /whisper|transformers\.js|onnx|ggml|huggingface/i;
  const offenders: string[] = [];
  for (const f of [...walk('src/components'), ...walk('src/app'), 'src/lib/transcribe/core.ts', 'src/lib/transcribe/model.ts', 'src/lib/transcribe/run.ts', 'src/lib/transcribe/words.ts', 'src/lib/meta.ts', 'src/lib/db/migrations.ts']) {
    let src: string;
    try { src = readFileSync(join(ROOT, f), 'utf8'); } catch { offenders.push(`${f} (missing)`); continue; }
    const lits = [...src.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).filter((s) => !/^[@./]|^[a-z-]+$/.test(s));
    if (lits.some((s) => names.test(s))) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});
