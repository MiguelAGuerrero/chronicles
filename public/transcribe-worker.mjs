// The web engine's Worker (specs/memo-transcripts, MX16, MX25, MX26). Plain module JavaScript served from the app's
// own origin, like maplibre-gl-worker.mjs: it loads the engine's code and WebAssembly from ./engine/ (copied there at
// export time by scripts/copy-engine-assets.js) only when told to `load`, runs one model on the samples it is sent,
// and is terminated by the page when the run ends, which frees the whole heap. Nothing here reaches another host:
// remote models are off, the model is read from Cache Storage, and the WebAssembly comes from ./engine/ort/.
//
//   page -> worker  { type: 'load', ref }       ref: <model base>/<model name> (the page's Cache Storage keys)
//   worker -> page  { type: 'ready' }
//   page -> worker  { type: 'run', samples }    16 kHz mono Float32Array
//   worker -> page  { type: 'words', text }
//   worker -> page  { type: 'error', message }
let asr = null;

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      const { env, pipeline } = await import(new URL('./engine/transformers.web.min.js', import.meta.url).href);
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.useBrowserCache = false;
      env.useWasmCache = false;
      env.useCustomCache = true;
      env.customCache = { match: async (request) => (await caches.open('chronicles-models')).match(request), put: async () => {} };
      const cut = data.ref.lastIndexOf('/') + 1;
      env.localModelPath = data.ref.slice(0, cut);
      env.backends.onnx.wasm.wasmPaths = new URL('./engine/ort/', import.meta.url).href;
      // One thread: a page served without cross-origin isolation (GitHub Pages) has no shared memory.
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      asr = await pipeline('automatic-speech-recognition', data.ref.slice(cut), { dtype: 'q8', device: 'wasm' });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'run') {
      const out = await asr(data.samples, { chunk_length_s: 30, stride_length_s: 5, language: 'en' });
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
      self.postMessage({ type: 'words', text: String(text ?? '').trim() });
    }
  } catch (e) {
    self.postMessage({ type: 'error', message: String((e && e.message) || e) });
  }
};
