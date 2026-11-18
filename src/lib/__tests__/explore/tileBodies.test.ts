/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as bodiesModule from '../../discovery/tileBodies';

// Performance review (Nov 18): landing, Explore, the atlas, gaps, the planner and scenic routes each fetched the same
// z14 tiles again, with nothing shared between reads made at once or one after another. `createTileBodies` shares a
// fetch in flight and keeps the last bodies read, while a reader that stops still stops the fetch once no one waits.

type Make = (o: { fetch: (url: string, signal: AbortSignal) => Promise<ArrayBuffer>; keep: number }) => {
  get(url: string, shouldStop?: () => boolean): Promise<ArrayBuffer>;
};
const make = (): Make => {
  const m = (bodiesModule as unknown as { createTileBodies?: Make }).createTileBodies;
  assert.equal(typeof m, 'function', 'discovery/tileBodies exports createTileBodies');
  return m!;
};

/** A fetch the test answers by hand: each call waits until `answer` or a signal's abort. */
function fakeFetch() {
  const calls: { url: string; signal: AbortSignal; answer: (b: ArrayBuffer) => void; fail: (e: Error) => void }[] = [];
  const fetch = (url: string, signal: AbortSignal) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      calls.push({ url, signal, answer: resolve, fail: reject });
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    });
  return { fetch, calls };
}
const bytes = (n: number) => new Uint8Array([n, n, n]).buffer;
const tick = () => new Promise((r) => setTimeout(r, 0));

test('tile bodies: two readers of one tile at once fetch it once, and each gets its own copy', async () => {
  const f = fakeFetch();
  const tiles = make()({ fetch: f.fetch, keep: 8 });
  const a = tiles.get('t/1');
  const b = tiles.get('t/1');
  await tick();
  assert.equal(f.calls.length, 1, 'one fetch');
  f.calls[0].answer(bytes(7));
  const [x, y] = await Promise.all([a, b]);
  assert.deepEqual([...new Uint8Array(x)], [7, 7, 7]);
  assert.notEqual(x, y, 'a copy each, so one reader handing its bytes away leaves the other\'s whole');
});

test('tile bodies: a tile read a moment ago is not fetched again; a failure is not kept', async () => {
  const f = fakeFetch();
  const tiles = make()({ fetch: f.fetch, keep: 8 });
  const first = tiles.get('t/1');
  await tick();
  f.calls[0].answer(bytes(1));
  await first;
  assert.deepEqual([...new Uint8Array(await tiles.get('t/1'))], [1, 1, 1]);
  assert.equal(f.calls.length, 1, 'the second read came from what was kept');
  const bad = tiles.get('t/2');
  await tick();
  f.calls[1].fail(new Error('500'));
  await assert.rejects(bad);
  const again = tiles.get('t/2');
  await tick();
  assert.equal(f.calls.length, 3, 'a failed tile is fetched again');
  f.calls[2].answer(bytes(2));
  await again;
});

test('tile bodies: a reader that stops leaves the others their fetch; when all have stopped, the fetch stops', async () => {
  const f = fakeFetch();
  const tiles = make()({ fetch: f.fetch, keep: 8 });
  let stopA = false;
  let stopB = false;
  const a = tiles.get('t/1', () => stopA);
  const b = tiles.get('t/1', () => stopB);
  await tick();
  stopA = true;
  await assert.rejects(a, /stopped/);
  assert.equal(f.calls[0].signal.aborted, false, 'b still waits, so the fetch goes on');
  f.calls[0].answer(bytes(3));
  assert.deepEqual([...new Uint8Array(await b)], [3, 3, 3]);

  const c = tiles.get('t/9', () => stopA);
  await tick();
  await assert.rejects(c, /stopped/);
  assert.equal(f.calls[1].signal.aborted, true, 'no one waits: the fetch itself is stopped (cancel stops the fetch, audit)');
});

test('tile bodies: the bodies kept are the last few read, no more', async () => {
  const f = fakeFetch();
  const tiles = make()({ fetch: f.fetch, keep: 2 });
  for (const u of ['t/1', 't/2', 't/3']) {
    const p = tiles.get(u);
    await tick();
    f.calls[f.calls.length - 1].answer(bytes(1));
    await p;
  }
  void tiles.get('t/1');
  await tick();
  assert.equal(f.calls.length, 4, 'the oldest was let go');
  f.calls[3].answer(bytes(1));
  void tiles.get('t/3');
  await tick();
  assert.equal(f.calls.length, 4, 'a recent one is kept');
});
