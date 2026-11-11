/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Memo transcripts: nothing of the model ships, and one host serves it (MX22, MX23). Written before the code.
const ROOT = join(__dirname, '../../../..');
const MODEL_EXT = /\.(bin|gguf|ggml|onnx|ort|tflite|pte|mlmodelc|safetensors)$/i;

const walk = (dir: string, out: { rel: string; size: number }[] = []) => {
  if (!existsSync(join(ROOT, dir))) return out;
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else out.push({ rel, size: st.size });
  }
  return out;
};

test('MX22: no model file over 1 MB in assets/ or public/, and no bundled-asset model in the code', { todo: 'test first' }, async () => {
  const big = [...walk('assets'), ...walk('public')].filter((f) => MODEL_EXT.test(f.rel) && f.size > 1024 * 1024);
  assert.deepEqual(big, []);
  const adapter = join(ROOT, 'src/lib/transcribe/engines/whisperRn.native.ts');
  assert.ok(existsSync(adapter), 'the adapter exists');
  assert.doesNotMatch(readFileSync(adapter, 'utf8'), /isBundleAsset\s*:\s*true|require\(['"][^'"]+\.(bin|gguf)['"]\)/);
});

test('MX22: the web engine\'s WebAssembly is copied into the export and served from the app, not a CDN', { todo: 'test first' }, async () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['export:web'], /ort/, 'the export copies the engine\'s .wasm files');
  const web = readFileSync(join(ROOT, 'src/lib/transcribe/engines/worker.web.ts'), 'utf8');
  assert.match(web, /wasmPaths/);
  assert.match(web, /EXPO_BASE_URL/);
  assert.doesNotMatch(web, /cdn\.jsdelivr\.net|huggingface\.co/);
  assert.match(web, /allowRemoteModels\s*=\s*false/);
});

test('MX22: the web engine is a dynamic import, never in the entry bundle', { todo: 'test first' }, async () => {
  const src = readFileSync(join(ROOT, 'src/lib/transcribe/engines/worker.web.ts'), 'utf8');
  assert.match(src, /import\(\s*['"]@huggingface\/transformers['"]\s*\)/);
  assert.doesNotMatch(src, /^import .* from ['"]@huggingface\/transformers['"]/m);
});

test('MX23: no new host: the models come from the Pages host, whose reason now names them; the dependency list adds only the two engines', { todo: 'test first' }, async () => {
  const vision = readFileSync(join(ROOT, 'scripts/check-vision.js'), 'utf8');
  const hosts = [...vision.matchAll(/^\s+'([a-z0-9.-]+)': /gm)].map((m) => m[1]);
  assert.deepEqual(hosts.sort(), [
    'maps.apple.com', 'miguelaguerrero.github.io', 'overpass-api.de', 'overturemaps-extras-us-west-2.s3.amazonaws.com', 'tiles.openfreemap.org', 'www.google.com',
  ]);
  assert.match(vision, /'miguelaguerrero\.github\.io': "[^"]*model/i);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.dependencies['whisper.rn'] && pkg.dependencies['@huggingface/transformers'], 'both engines are dependencies');
});

test('MX23: the models are pinned, with a checksum, on the Pages host', { todo: 'test first' }, async () => {
  const src = readFileSync(join(ROOT, 'src/lib/transcribe/engines/whisperRn.native.ts'), 'utf8') + readFileSync(join(ROOT, 'src/lib/transcribe/engines/transformersJs.web.ts'), 'utf8');
  const urls = [...src.matchAll(/https:\/\/[^'"`\s]+/g)].map((m) => new URL(m[0]).host);
  assert.ok(urls.length >= 2 && urls.every((h) => h === 'miguelaguerrero.github.io'), urls.join(','));
  assert.equal([...src.matchAll(/sha256:\s*'[0-9a-f]{64}'/g)].length, 2);
});
