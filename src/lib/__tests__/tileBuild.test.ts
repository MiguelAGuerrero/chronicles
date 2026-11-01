/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchTileBuild } from '../tileBuild';

// Bug (Nov 1): on an iPhone the replay stayed blank after Stop until a reload. It waited on
// the TileJSON fetch, which had no timeout; a stalled request on a phone can hang for minutes.

const tilejson = (tiles: string[]) => async () => new Response(JSON.stringify({ tiles }));

test('tile build: read from the dated directory in the TileJSON tile URL', async () => {
  const r = await fetchTileBuild(tilejson(['https://t.example/planet/20261028_001001_pt/{z}/{x}/{y}.pbf']), 1000);
  assert.deepEqual(r, { build: '20261028_001001_pt', url: 'https://t.example/planet/20261028_001001_pt/{z}/{x}/{y}.pbf' });
});

test('tile build: a fetch that never answers gives up within the timeout', async () => {
  let aborted = false;
  const hang = (_: string, init?: RequestInit) =>
    new Promise<Response>((_res, rej) => {
      init?.signal?.addEventListener('abort', () => {
        aborted = true;
        rej(new Error('aborted'));
      });
    });
  const t0 = Date.now();
  assert.equal(await fetchTileBuild(hang, 50), null);
  assert.ok(Date.now() - t0 < 1000, 'gave up promptly');
  assert.ok(aborted, 'the request itself is aborted');
});

test('tile build: a body that never finishes gives up too', async () => {
  const stuck = async () => ({ ok: true, json: () => new Promise(() => {}) }) as unknown as Response;
  assert.equal(await fetchTileBuild(stuck, 50), null);
});

test('tile build: offline or an error status is no build', async () => {
  assert.equal(await fetchTileBuild(async () => { throw new Error('offline'); }, 1000), null);
  assert.equal(await fetchTileBuild(async () => new Response('nope', { status: 503 }), 1000), null);
});
