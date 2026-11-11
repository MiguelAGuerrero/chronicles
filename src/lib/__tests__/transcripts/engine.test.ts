/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { engineContract } from './engineContract';
import { fakeEngine, mod, SPEC } from './fixtures';

// Memo transcripts: the Engine contract (MX29) and its registry (MX30). Written before `transcribe/engine`.

engineContract('fake engine', () => fakeEngine());

test('MX29: every Engine member has a contract case', { todo: 'test first' }, async () => {
  const { ENGINE_MEMBERS } = await mod('engine');
  const src = (await import('node:fs')).readFileSync(`${__dirname}/engineContract.ts`, 'utf8');
  for (const m of ENGINE_MEMBERS as string[]) assert.ok(src.includes(`MX29 ${m}`) || new RegExp(`MX29 [^:]*\\b${m}\\b`).test(src), `no contract case names ${m}`);
});

test('MX29: an engine that cannot say it works offline is refused at registration', { todo: 'test first' }, async () => {
  const { registerEngine } = await mod('engine');
  assert.throws(() => registerEngine({ ...fakeEngine(), offline: false }), /offline/i);
  assert.throws(() => registerEngine({ ...fakeEngine(), offline: undefined }), /offline/i);
  assert.throws(() => registerEngine({ ...fakeEngine(), inputs: [] }), /input/i);
  assert.throws(() => registerEngine({ ...fakeEngine(), model: { ...SPEC, sha256: 'short' } }), /sha/i);
  assert.equal(registerEngine(fakeEngine()).id, 'fake');
});

test('MX30: swapping the engine touches the registry and the new adapter, nothing else', { todo: 'test first' }, async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.join(__dirname, '../../../..');
  const names = ['whisper.rn', '@huggingface/transformers', 'chronicles-audio-decode'];
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const n of fs.readdirSync(path.join(root, d))) {
      const rel = `${d}/${n}`;
      if (fs.statSync(path.join(root, rel)).isDirectory()) { if (!/__tests__/.test(rel)) walk(rel); }
      else if (/\.(ts|tsx)$/.test(n) && names.some((x) => fs.readFileSync(path.join(root, rel), 'utf8').includes(`'${x}`))) hits.push(rel);
    }
  };
  walk('src');
  assert.ok(hits.length > 0, 'the adapters import their libraries');
  assert.ok(hits.every((f) => /^src\/lib\/transcribe\/(engines\/|decoder\.native)/.test(f)), hits.join(', '));
  const reg = fs.readdirSync(path.join(root, 'src/lib/transcribe/engines')).filter((n) => /^index\./.test(n));
  assert.ok(reg.length >= 2, 'one registry per platform: ' + reg.join(','));
});
