/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mod } from './fixtures';

// Memo transcripts: the web engine's Worker (MX25, MX26, MX27). Written before `transcribe/engines/transformersJs.web`.

/** A Worker that answers as the real one's protocol says: `load` then `ready`, `run` then `words`. */
function fakeWorker(o: { say?: string; failLoad?: boolean } = {}) {
  const w: any = {
    started: true,
    terminated: false,
    posted: [] as any[],
    onmessage: null as null | ((e: { data: any }) => void),
    onerror: null as null | ((e: unknown) => void),
    postMessage(m: any) {
      w.posted.push(m);
      queueMicrotask(() => {
        if (m.type === 'load') w.onmessage?.({ data: o.failLoad ? { type: 'error', message: 'no wasm' } : { type: 'ready' } });
        if (m.type === 'run') w.onmessage?.({ data: { type: 'words', text: o.say ?? 'hello from the worker' } });
      });
    },
    terminate() {
      w.terminated = true;
    },
  };
  return w;
}

async function make(o: { supported?: boolean; worker?: any } = {}) {
  const { createWebEngine } = await mod('engines/transformersJs.web');
  const spawned: any[] = [];
  const engine = createWebEngine({
    supported: () => o.supported ?? true,
    spawn: () => {
      const w = o.worker ?? fakeWorker();
      spawned.push(w);
      return w;
    },
  });
  return { engine, spawned };
}

test('MX25: a run starts a Worker, the page\'s calls return while it works, and the Worker is terminated when the run ends', { todo: 'test first' }, async () => {
  const { engine, spawned } = await make();
  assert.equal(spawned.length, 0, 'nothing exists while idle (MX16)');
  await engine.load({ ref: 'https://x/model' });
  assert.equal(spawned.length, 1);
  const pending = engine.transcribe({ kind: 'samples16k', data: new Float32Array(3) });
  assert.equal(spawned[0].terminated, false, 'a Worker is working');
  assert.equal(await pending, 'hello from the worker');
  assert.deepEqual(spawned[0].posted.map((m: any) => m.type), ['load', 'run']);
  await engine.release();
  assert.equal(spawned[0].terminated, true);
});

test('MX16: release with no run does nothing and a second load starts a fresh Worker', { todo: 'test first' }, async () => {
  const { engine, spawned } = await make();
  await engine.release();
  await engine.load({ ref: 'r' });
  await engine.release();
  await engine.load({ ref: 'r' });
  assert.equal(spawned.length, 2);
  assert.equal(spawned[0].terminated, true);
});

test('MX26: the engine\'s Worker needs no cross-origin isolation: nothing asks for SharedArrayBuffer or threads', { todo: 'test first' }, async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(`${__dirname}/../../transcribe/engines/worker.web.ts`, 'utf8');
  assert.match(src, /numThreads\s*=\s*1/);
  assert.doesNotMatch(src, /SharedArrayBuffer/);
  assert.match(src, /EXPO_BASE_URL/, 'the sub-path build finds its wasm');
});

test('MX27: where the browser cannot run it the engine says so and no Worker starts', { todo: 'test first' }, async () => {
  const { engine, spawned } = await make({ supported: false });
  assert.equal(await engine.available(), false);
  assert.equal(spawned.length, 0);
});

test('MX27: a Worker that fails to load rejects the run and is terminated', { todo: 'test first' }, async () => {
  const worker = fakeWorker({ failLoad: true });
  const { engine } = await make({ worker });
  await assert.rejects(() => engine.load({ ref: 'r' }), /no wasm/);
  assert.equal(worker.terminated, true);
});
