/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeRead, type ComputeInput } from '../../landing/compute';
import { handleWorkerMessage } from '../../landing/workerJobs';
import { profileFrom } from '../../atlas/profile';
import type { RingInput } from '../../atlas/ringCompute';
import { decodeTile } from '../../discovery/tileDecode';
import { createOffPage, type OffPagePorts, type WorkerLike } from '../../landing/offPage';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { encodeTile } from '../mvtFixture';

// Explore in a dense city (DC7, DC8), written from specs/explore-dense-city/spec.md before the code.

const O: LngLat = [-76.615, 39.29];
const m = (x: number, y: number): LngLat => [O[0] + x / 86000, O[1] + y / 111320];
const t = tileAt(O);
const input = (): ComputeInput => {
  const bytes = encodeTile([
    { layer: 'transportation', props: { class: 'minor' }, coords: [m(-200, 0), m(200, 0)] },
    { layer: 'transportation_name', props: { class: 'minor', name: 'Charles Street' }, coords: [m(-200, 0), m(200, 0)] },
    ...Array.from({ length: 12 }, (_, i) => ({ layer: 'poi', props: { class: 'cafe', subclass: 'cafe', name: `Cafe ${i}` }, coords: m(-180 + i * 30, 8) })),
  ], 14, t.x, t.y);
  return { bodies: [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], tiles: [[t.x, t.y]], zoom: 14, build: 'b1', overturePoints: [], archivePlaces: null, analyzeAt: O };
};

/** Fake timers: `fire()` runs what is due, so a silent worker's timeout can pass without waiting. */
function ports(makeWorker: OffPagePorts['makeWorker']) {
  const due: (() => void)[] = [];
  let workers = 0;
  const p: OffPagePorts = {
    makeWorker,
    setTimeout: (fn) => { due.push(fn); return due.length; },
    clearTimeout: (k) => { due[(k as number) - 1] = () => {}; },
    pause: async () => {},
    onWorker: () => { workers++; },
  };
  return { p, fire: () => due.splice(0).forEach((f) => f()), workers: () => workers };
}

/** A worker that runs the real handler in-process, through a structured clone, as a browser's would. */
const echo = (): WorkerLike => {
  const w: WorkerLike = {
    onmessage: null, onerror: null, terminate() {},
    postMessage(data) { queueMicrotask(() => w.onmessage?.({ data: structuredClone(handleWorkerMessage(structuredClone(data))) })); },
  };
  return w;
};

test('DC7: a read runs off the page when a worker can be made, with the page\'s result', async () => {
  const f = ports(echo);
  assert.deepEqual(await createOffPage(f.p).run(input()), computeRead(input()));
  assert.equal(f.workers(), 1);
});

test('DC8: a worker that can\'t start, errors, answers an error or stays silent falls back to the page, same result', async () => {
  const want = computeRead(input());
  // Can't start (no workers, or its file is gone after a deploy).
  assert.deepEqual(await createOffPage(ports(() => { throw new Error('404'); }).p).run(input()), want);
  // No worker on this platform (native).
  assert.deepEqual(await createOffPage(ports(null).p).run(input()), want);
  // Errors once started.
  const erring = (): WorkerLike => { const w: WorkerLike = { onmessage: null, onerror: null, terminate() {}, postMessage() { queueMicrotask(() => w.onerror?.(new Error('boom'))); } }; return w; };
  assert.deepEqual(await createOffPage(ports(erring).p).run(input()), want);
  // Answers an error.
  const sour = (): WorkerLike => { const w: WorkerLike = { onmessage: null, onerror: null, terminate() {}, postMessage() { queueMicrotask(() => w.onmessage?.({ data: { ok: false, error: 'bad' } })); } }; return w; };
  assert.deepEqual(await createOffPage(ports(sour).p).run(input()), want);
  // Silent: the timeout passes and the page computes it.
  let ended = false;
  const silent = (): WorkerLike => ({ onmessage: null, onerror: null, terminate() { ended = true; }, postMessage() {} });
  const s = ports(silent);
  const run = createOffPage(s.p).run(input());
  await new Promise((r) => setImmediate(r));
  s.fire();
  assert.deepEqual(await run, want);
  assert.ok(ended, 'the silent worker is ended');
});

test('explore-dense-city audit 9: a cancelled read ends its worker and never computes on the page', async () => {
  let ended = false;
  let paused = 0;
  const silent = (): WorkerLike => ({ onmessage: null, onerror: null, terminate() { ended = true; }, postMessage() {} });
  const f = ports(silent);
  f.p.pause = async () => { paused++; };
  let stop = false;
  const run = createOffPage(f.p).run(input(), () => stop);
  stop = true;
  // The runner looks again on its own timer (the fake fires what is due).
  await new Promise((r) => setImmediate(r));
  f.fire();
  await assert.rejects(run, /cancelled/i);
  assert.ok(ended, 'the worker is ended');
  assert.equal(paused, 0, 'the page computed nothing');
  // Stopped before it starts: no worker made at all.
  let made = 0;
  await assert.rejects(createOffPage(ports(() => { made++; return silent(); }).p).run(input(), () => true), /cancelled/i);
  assert.equal(made, 0);
});

test('explore-dense-city audit 2: an atlas ring computed off the page gives profileFrom\'s profile, and on the page too', async () => {
  const ringInput = (): RingInput => {
    const i = input();
    return { bodies: i.bodies, tiles: i.tiles, zoom: 14, build: 'b1', at: O, overture: null, extent: null, archive: null, finds: [] };
  };
  const feats = decodeTile(new Uint8Array(ringInput().bodies[0]), 14, t.x, t.y);
  const want = profileFrom(O, feats, 'b1', null, null, null, []).profile;
  const f = ports(echo);
  assert.deepEqual(await createOffPage(f.p).ring(ringInput()), want);
  assert.equal(f.workers(), 1, 'off the page');
  assert.deepEqual(await createOffPage(ports(null).p).ring(ringInput()), want, 'no worker: the page computes the same');
});

test('explore-dense-city audit 2: one worker serves read after read; a failed or cancelled one is ended and the next gets a new one', async () => {
  let made = 0;
  let ended = 0;
  const counting = (): WorkerLike => {
    made++;
    const w = echo();
    const end = w.terminate;
    w.terminate = () => { ended++; end.call(w); };
    return w;
  };
  const f = ports(counting);
  const off = createOffPage(f.p);
  await off.run(input());
  await off.run(input());
  assert.equal(made, 1, 'the second read reuses the first one\'s worker');
  assert.equal(ended, 0);
  await assert.rejects(off.run(input(), () => true), /cancelled/i);
  assert.equal(made, 1, 'cancelled before it starts: no worker asked');
});
