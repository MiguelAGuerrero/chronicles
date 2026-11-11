#!/usr/bin/env node
/**
 * Copies the web transcription engine's code and WebAssembly from node_modules into public/engine/, so the export
 * serves them from the app's own origin and never from a CDN (specs/memo-transcripts, MX22, MX23). They are fetched
 * only when a run is due, by public/transcribe-worker.mjs; they are not in the app's JavaScript bundle. Run before
 * `expo export` (package.json's export:web and the Pages workflow). public/engine/ is generated and ignored by git.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'engine');
const FILES = [
  ['node_modules/@huggingface/transformers/dist/transformers.web.min.js', 'transformers.web.min.js'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs', 'ort/ort-wasm-simd-threaded.jsep.mjs'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm', 'ort/ort-wasm-simd-threaded.jsep.wasm'],
];

for (const [from, to] of FILES) {
  const src = path.join(ROOT, from);
  if (!fs.existsSync(src)) {
    console.error(`copy-engine-assets: ${from} is missing; run npm ci.`);
    process.exit(1);
  }
  const dest = path.join(OUT, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
console.log(`copy-engine-assets: ${FILES.length} files in public/engine/`);
