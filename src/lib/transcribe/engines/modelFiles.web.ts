// @layer adapter
import { unzipSync } from 'fflate';
import type { ModelSpec } from '../engine';
import type { ModelFiles } from '../types';
import { MODEL_CACHE, modelBase } from './worker.web';

/**
 * The browser's model files (MX11-MX15, MX32): the pack is fetched on the Download tap, hashed whole, unzipped and put in
 * Cache Storage under keys on the app's own origin, with a marker last so a half-written pack never reads as installed
 * (MX12). The browser may evict it: that reads as not installed (MX13). A web exception to native first:
 * expo-file-system has no web build (docs/ARCHITECTURE.md). Never run in a real browser by this session.
 */
const slug = (spec: ModelSpec) => spec.tag.replace(/[^A-Za-z0-9._-]/g, '_');
const keyOf = (spec: ModelSpec, path: string) => `${modelBase()}${slug(spec)}/${path}`;
const DONE = '.complete';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const modelFiles: ModelFiles = {
  async free() {
    try {
      const e = await navigator.storage.estimate();
      return typeof e.quota === 'number' && typeof e.usage === 'number' ? e.quota - e.usage : null;
    } catch {
      return null;
    }
  },
  async find(spec) {
    if (typeof caches === 'undefined') return null;
    const hit = await (await caches.open(MODEL_CACHE)).match(keyOf(spec, DONE));
    return hit ? { ref: `${modelBase()}${slug(spec)}` } : null;
  },
  async download(spec) {
    const res = await fetch(spec.url);
    if (!res.ok) throw new Error(`The model could not be fetched (${res.status}).`);
    const bytes = await res.arrayBuffer();
    const hash = hex(await crypto.subtle.digest('SHA-256', bytes));
    return {
      hash,
      async commit() {
        const cache = await caches.open(MODEL_CACHE);
        const files = unzipSync(new Uint8Array(bytes));
        for (const [path, data] of Object.entries(files)) {
          if (path.endsWith('/')) continue;
          await cache.put(keyOf(spec, path), new Response(data.slice().buffer as ArrayBuffer));
        }
        await cache.put(keyOf(spec, DONE), new Response('ok'));
        return { ref: `${modelBase()}${slug(spec)}` };
      },
      async discard() {},
    };
  },
  async remove(spec) {
    const cache = await caches.open(MODEL_CACHE);
    let any = false;
    for (const req of await cache.keys()) {
      if (req.url.startsWith(`${modelBase()}${slug(spec)}/`)) any = (await cache.delete(req)) || any;
    }
    return any;
  },
  async removeOthers(keep) {
    const cache = await caches.open(MODEL_CACHE);
    for (const req of await cache.keys()) if (!req.url.startsWith(`${modelBase()}${slug(keep)}/`)) await cache.delete(req);
  },
};
