/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transportationUrl } from '../activity/release';
import { tileAt } from '../tileMath';
import { createOvertureSource } from '../walk/overtureSource';
import { createOverpassSource, RATE_PAUSE_MS } from '../walk/overpassSource';
import { encodeTile } from './mvtFixture';

// Walkability (WK1, WK1b, WK4, WK18), written from specs/walkability/spec.md before the code.

const T = tileAt([-75.19, 40.69]);
const res = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

test('WK1: Overture\'s transportation archive is the release\'s one file, read by tile', async () => {
  assert.match(transportationUrl('2026-10-21.0'), /\/tiles\/2026-10-21\.0\/transportation\.pmtiles$/);
  const bytes = encodeTile([{ layer: 'segment', props: { subtype: 'road', class: 'residential' }, coords: [[-75.19, 40.69], [-75.189, 40.69]] }], 14, T.x, T.y);
  const asked: string[] = [];
  const opened: string[] = [];
  const src = createOvertureSource({
    release: async () => '2026-10-21.0',
    open: (r) => {
      opened.push(r);
      return { getZxy: async (z, x, y) => (asked.push(`${z}/${x}/${y}`), x === T.x ? { data: bytes.buffer as ArrayBuffer } : undefined) };
    },
  });
  const got = await src.read(T.x, T.y);
  assert.equal(got?.from, 'overture');
  assert.equal(got?.ways[0].cls, 'residential');
  assert.deepEqual(asked, [`14/${T.x}/${T.y}`], 'the tile and nothing else (WK18)');
  const empty = await src.read(T.x + 1, T.y);
  assert.deepEqual(empty?.ways, [], 'a tile the archive lacks is a tile with no roads');
  assert.deepEqual(opened, ['2026-10-21.0'], 'the archive is opened once per release');
});

test('WK1b: no release, or an archive that fails, is null; the archive is opened afresh next time', async () => {
  const none = createOvertureSource({ release: async () => null, open: () => { throw new Error('unused'); } });
  assert.equal(await none.read(1, 2), null);
  let opens = 0;
  let boom = true;
  const flaky = createOvertureSource({
    release: async () => 'r',
    open: () => {
      opens++;
      return { getZxy: async () => { if (boom) throw new Error('403'); return undefined; } };
    },
  });
  assert.equal(await flaky.read(1, 2), null);
  boom = false;
  assert.deepEqual((await flaky.read(1, 2))?.ways, []);
  assert.equal(opens, 2);
});

test('WK1b, WK18: Overpass is asked with the tile\'s bounds in a form body and nothing else', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const src = createOverpassSource({
    fetch: async (url, init) => (calls.push({ url: String(url), init: init! }), res(200, { elements: [{ type: 'way', id: 1, tags: { highway: 'residential' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.691, lon: -75.19 }] }] })),
    now: () => 0,
  });
  const got = await src.read(T.x, T.y);
  assert.equal(got?.from, 'overpass');
  assert.equal(got?.ways.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, 'POST');
  const body = String(calls[0].init.body);
  assert.match(decodeURIComponent(body), /^data=\[out:json\]\[timeout:10\];way\["highway"\]\(40\./);
  assert.deepEqual(Object.keys((calls[0].init.headers ?? {}) as object), [], 'no custom headers, no identifiers');
});

test('WK4: 429 and 504 back off for a while instead of asking again at once; other failures are null', async () => {
  let now = 1000;
  let status = 429;
  let n = 0;
  const src = createOverpassSource({ fetch: async () => (n++, res(status)), now: () => now });
  assert.equal(await src.read(1, 2), null);
  assert.equal(await src.read(3, 4), null);
  assert.equal(n, 1, 'paused: the second tile was not asked');
  now += RATE_PAUSE_MS + 1;
  status = 504;
  assert.equal(await src.read(1, 2), null);
  assert.equal(n, 2);
  assert.equal(await src.read(1, 2), null);
  assert.equal(n, 2, '504 pauses too');
  now += RATE_PAUSE_MS + 1;
  status = 500;
  assert.equal(await src.read(1, 2), null);
  assert.equal(await src.read(1, 2), null);
  assert.equal(n, 4, 'a 500 is a failure but no pause');
  const down = createOverpassSource({ fetch: async () => { throw new Error('offline'); }, now: () => 0 });
  assert.equal(await down.read(1, 2), null, 'offline: null, never a throw');
});
