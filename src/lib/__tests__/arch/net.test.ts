/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { APP_AGENT, HOSTS, hostOf } from '../../net/policy';
import { EtagMismatch } from 'pmtiles';
import { createNet, NetOff, NetPaused } from '../../net/shell';

// fix net-rules (Nov 5): every request to an outside service goes through one module, which names the app on a
// phone, pauses a host that refuses, and can switch a host off; the owner's calls are in decision 0100.

const res = (status: number, headers: Record<string, string> = {}, body = new ArrayBuffer(4)) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(headers), arrayBuffer: async () => body }) as unknown as Response;
const TILES = 'https://tiles.openfreemap.org/planet/20261029_001001_pt/14/1/2.pbf';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

test('net 1: on a phone every request names the app; on the web nothing is added', async () => {
  for (const platform of ['native', 'web'] as const) {
    const seen: RequestInit[] = [];
    const net = createNet({ fetch: async (_u, init) => (seen.push(init ?? {}), res(200)), now: () => 0, platform });
    await net.fetch(TILES, { headers: { Accept: 'application/x-protobuf' } });
    const h = new Headers(seen[0].headers);
    if (platform === 'native') assert.equal(h.get('user-agent'), APP_AGENT);
    else assert.equal(h.get('user-agent'), null, 'browsers forbid it, and a custom header would add a preflight');
    assert.equal(h.get('accept'), 'application/x-protobuf', 'the caller\'s headers are kept');
  }
  assert.match(APP_AGENT, /^Chronicles\b/);
  assert.ok(!/user|device|@/i.test(APP_AGENT.replace('github.com', '')), 'the app, never the person or the device');
});

test('net 2: a host that refuses (429, 503) is paused a minute, or its Retry-After up to an hour; meanwhile nothing reaches it', async () => {
  let now = 0;
  let n = 0;
  let answer = res(429);
  const net = createNet({ fetch: async () => (n++, answer), now: () => now, platform: 'web' });
  assert.equal((await net.fetch(TILES)).status, 429, 'the refusal itself is returned to the caller');
  await assert.rejects(net.fetch(TILES), NetPaused);
  assert.equal(n, 1);
  now += 60_000;
  answer = res(503, { 'retry-after': '600' });
  await net.fetch(TILES);
  now += 60_000;
  await assert.rejects(net.fetch(TILES), NetPaused, 'the server asked for 10 minutes');
  now += 540_000;
  answer = res(200);
  assert.equal((await net.fetch(TILES)).status, 200);
  assert.equal(n, 3);
  answer = res(429, { 'retry-after': '999999' });
  await net.fetch(TILES);
  now += 3_600_000;
  assert.equal((await net.fetch(TILES)).status, 429, 'never more than an hour');
});

test('net 3 (fix net-rules audit 2): hosts whose readers keep their own back-off (Overpass, Overture) are never paused by the module', async () => {
  let n = 0;
  const net = createNet({ fetch: async () => (n++, res(503)), now: () => 0, platform: 'native' });
  await net.fetch(OVERPASS, { method: 'POST' });
  await net.fetch(OVERPASS, { method: 'POST' });
  assert.equal(n, 2, 'overpassSource pauses itself (WK4); a second pause here would spend its session cap');
  const places = 'https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/2026-10-21.0/places.pmtiles';
  await net.fetch(places);
  await net.fetch(places.replace('places', 'transportation'));
  assert.equal(n, 4, 'a 503 on places never stops walkability reading transportation, which would send it to Overpass');
  assert.equal(HOSTS['overpass-api.de'].ownBackoff, true);
  assert.equal(HOSTS['overturemaps-extras-us-west-2.s3.amazonaws.com'].ownBackoff, true);
  assert.ok(!HOSTS['tiles.openfreemap.org'].ownBackoff, 'OpenFreeMap, one operator, is the one the module paces');
});

test('net 4: a host switched off is never asked', async () => {
  let n = 0;
  const net = createNet({ fetch: async () => (n++, res(200)), now: () => 0, platform: 'web', hosts: { ...HOSTS, 'tiles.openfreemap.org': { ...HOSTS['tiles.openfreemap.org'], off: true } } });
  await assert.rejects(net.fetch(TILES), NetOff);
  assert.equal(n, 0);
  assert.ok(Object.values(HOSTS).every((h) => !h.off), 'every host is on as shipped');
});

test('net 5: the archive reader asks for byte ranges with no credentials or referrer, and refuses a server that ignores ranges', async () => {
  const seen: RequestInit[] = [];
  let answer = res(206, { etag: '"v1"' }, new ArrayBuffer(16));
  const net = createNet({ fetch: async (_u, init) => (seen.push(init ?? {}), answer), now: () => 0, platform: 'web' });
  const src = net.source('https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/2026-10-21.0/places.pmtiles');
  assert.match(src.getKey(), /places\.pmtiles$/);
  const got = await src.getBytes(100, 16);
  assert.equal(got.data.byteLength, 16);
  assert.equal(got.etag, '"v1"');
  assert.equal(new Headers(seen[0].headers).get('range'), 'bytes=100-115');
  assert.equal(seen[0].credentials, 'omit');
  assert.equal(seen[0].referrerPolicy, 'no-referrer');
  answer = res(200, { 'content-length': '999999' }, new ArrayBuffer(999999));
  await assert.rejects(src.getBytes(0, 16), /byte ranges/);
  answer = res(404);
  await assert.rejects(src.getBytes(0, 16), /404/, 'the status is in the message, so a missing release is recognised');
});

test('net 6: every host the app fetches from has a policy, and every policy host is allowed', () => {
  const vision = readFileSync('scripts/check-vision.js', 'utf8');
  for (const host of Object.keys(HOSTS)) assert.ok(vision.includes(`'${host}'`), `${host} is on ALLOWED_HOSTS`);
  for (const url of [TILES, OVERPASS, 'https://overturemaps-extras-us-west-2.s3.amazonaws.com/?list-type=2']) assert.ok(HOSTS[hostOf(url)!], url);
  assert.equal(hostOf('not a url'), null);
});

const ARCHIVE = 'https://overturemaps-extras-us-west-2.s3.amazonaws.com/tiles/2026-10-21.0/places.pmtiles';

test('fix net-rules audit 3: the archive source can ask the browser not to cache ranges (Chrome on Windows)', async () => {
  const seen: RequestInit[] = [];
  const net = createNet({ fetch: async (_u, init) => (seen.push(init ?? {}), res(206, {}, new ArrayBuffer(4))), now: () => 0, platform: 'web', rangeCache: 'no-store' });
  await net.source(ARCHIVE).getBytes(0, 4);
  assert.equal(seen[0].cache, 'no-store');
  const plain: RequestInit[] = [];
  const other = createNet({ fetch: async (_u, init) => (plain.push(init ?? {}), res(206, {}, new ArrayBuffer(4))), now: () => 0, platform: 'web' });
  await other.source(ARCHIVE).getBytes(0, 4);
  assert.equal(plain[0].cache, undefined);
});

test('fix net-rules audit 4: a changed ETag throws EtagMismatch, so pmtiles reads the archive afresh', async () => {
  const net = createNet({ fetch: async () => res(206, { etag: '"new"' }, new ArrayBuffer(4)), now: () => 0, platform: 'web' });
  await assert.rejects(net.source(ARCHIVE).getBytes(10, 4, undefined, '"old"'), EtagMismatch);
  assert.equal((await net.source(ARCHIVE).getBytes(10, 4, undefined, '"new"')).data.byteLength, 4);
  const weak = createNet({ fetch: async () => res(206, { etag: 'W/"new"' }, new ArrayBuffer(4)), now: () => 0, platform: 'web' });
  assert.equal((await weak.source(ARCHIVE).getBytes(10, 4, undefined, '"old"')).data.byteLength, 4, 'a weak ETag says nothing');
});

test('fix net-rules audit 5: an archive shorter than the first read (416 at 0) is read again for its real length', async () => {
  const ranges: string[] = [];
  const net = createNet({
    fetch: async (_u, init) => {
      const r = new Headers(init?.headers).get('range')!;
      ranges.push(r);
      return r === 'bytes=0-16383' ? res(416, { 'content-range': 'bytes */9000' }) : res(206, {}, new ArrayBuffer(9000));
    },
    now: () => 0,
    platform: 'web',
  });
  assert.equal((await net.source(ARCHIVE).getBytes(0, 16384)).data.byteLength, 9000);
  assert.deepEqual(ranges, ['bytes=0-16383', 'bytes=0-8999']);
});

test('fix net-rules audit 6: a server that sends the whole file is cut off, not downloaded', async () => {
  let signal: AbortSignal | undefined;
  const net = createNet({ fetch: async (_u, init) => ((signal = init?.signal ?? undefined), res(200, { 'content-length': '999999' }, new ArrayBuffer(8))), now: () => 0, platform: 'web' });
  await assert.rejects(net.source(ARCHIVE).getBytes(0, 16), /byte ranges/);
  assert.equal(signal?.aborted, true);
});

test('fix net-rules audit 7: after an EtagMismatch every later read of that archive skips the browser cache', async () => {
  const seen: RequestInit[] = [];
  let etag = '"new"';
  const net = createNet({ fetch: async (_u, init) => (seen.push(init ?? {}), res(206, { etag }, new ArrayBuffer(4))), now: () => 0, platform: 'web', rangeCache: 'no-store' });
  const src = net.source(ARCHIVE);
  await assert.rejects(src.getBytes(0, 4, undefined, '"old"'), EtagMismatch);
  await src.getBytes(0, 4, undefined, '"new"');
  etag = '"new"';
  await src.getBytes(8, 4);
  assert.deepEqual(seen.map((i) => i.cache), ['no-store', 'reload', 'reload'], 'pmtiles retries once: the retry must not read the stale range again');
  const other: RequestInit[] = [];
  const fresh = createNet({ fetch: async (_u, init) => (other.push(init ?? {}), res(206, {}, new ArrayBuffer(4))), now: () => 0, platform: 'web' });
  await fresh.source(ARCHIVE.replace('places', 'divisions')).getBytes(0, 4);
  assert.equal(other[0].cache, undefined, 'another archive is untouched');
});

test('fix net-rules audit 8: a 416 after the first read is a changed archive (EtagMismatch), read again past the cache', async () => {
  const seen: RequestInit[] = [];
  const net = createNet({ fetch: async (_u, init) => (seen.push(init ?? {}), res(416, { 'content-range': 'bytes */100' })), now: () => 0, platform: 'web' });
  const src = net.source(ARCHIVE);
  await assert.rejects(src.getBytes(5000, 16), EtagMismatch);
  await assert.rejects(src.getBytes(5000, 16), EtagMismatch);
  assert.equal(seen[1].cache, 'reload');
});
