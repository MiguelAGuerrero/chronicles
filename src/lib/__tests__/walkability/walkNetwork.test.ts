/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transportationUrl } from '../../activity/release';
import { tileAt } from '../../tileMath';
import { createOvertureSource } from '../../walk/overtureSource';
import { overpassPause, overpassRuntimeError, retryAfterS } from '../../walk/overpass';
import { CAP_WINDOW_MS, createOverpassSource, MAX_PAUSE_MS, OVERPASS_SESSION_CAP, RATE_PAUSE_MS } from '../../walk/overpassSource';
import { encodeTile } from '../mvtFixture';

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
  assert.deepEqual(got?.junctions, [], 'no connector layer in the fixture tile: no junctions');
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
  assert.deepEqual(got?.junctions, [], 'one way shares no node');
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
  now += 2 * RATE_PAUSE_MS + 1; // a second pause in a row lasts twice as long (fix overpass-hardening)
  status = 500;
  assert.equal(await src.read(1, 2), null);
  assert.equal(await src.read(1, 2), null);
  assert.equal(n, 4, 'a 500 is a failure but no pause');
  const down = createOverpassSource({ fetch: async () => { throw new Error('offline'); }, now: () => 0 });
  assert.equal(await down.read(1, 2), null, 'offline: null, never a throw');
});

// fix overpass-hardening (Nov 5): the public Overpass instance is overloaded and bans apps that keep asking
// while refused, so "busy" answers pause too, pauses in a row grow, and one session asks a bounded number of times.

test('fix overpass-hardening 1: 502 and 503 (busy) pause like 429 instead of asking again at once', async () => {
  for (const status of [502, 503]) {
    let n = 0;
    const src = createOverpassSource({ fetch: async () => (n++, res(status)), now: () => 1000 });
    assert.equal(await src.read(1, 2), null);
    assert.equal(await src.read(3, 4), null);
    assert.equal(n, 1, `${status} pauses: the second tile was not asked`);
  }
});

test('fix overpass-hardening 2: pauses in a row double up to a ceiling; an answer resets them', async () => {
  let now = 0;
  let answer = 429;
  let answered = -1;
  const times: number[] = [];
  const src = createOverpassSource({ fetch: async () => (times.push(now), answer === 200 ? ((answer = 429), (answered = times.length - 1), res(200, { elements: [] })) : res(answer)), now: () => now });
  // Ask every second, as a busy screen would; only the requests that reach Overpass are timed.
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      await src.read(1, 2);
      now += 1000;
    }
  };
  const gaps = (from: number) => times.slice(from + 1).map((t, i) => t - times[from + i]);
  await run(3000);
  const expected = [0, 1, 2, 3, 4, 5].map((k) => Math.min(RATE_PAUSE_MS * 2 ** k, MAX_PAUSE_MS));
  assert.deepEqual(gaps(0).slice(0, 6), expected, 'each refusal in a row waits twice as long, never past the ceiling');
  assert.equal(expected[5], MAX_PAUSE_MS, 'the ceiling is reached');
  // One answer (the fake refuses again right after it), then the pauses start over.
  answer = 200;
  await run(MAX_PAUSE_MS / 1000 + RATE_PAUSE_MS / 1000 + 5);
  assert.ok(answered > 0, 'an answer came');
  assert.deepEqual(gaps(answered).slice(0, 2), [1000, RATE_PAUSE_MS], 'after an answer, the next refusal pauses the first length again');
});

test('fix overpass-hardening 3: one session asks Overpass a bounded number of times, then is null', async () => {
  let n = 0;
  const src = createOverpassSource({ fetch: async () => (n++, res(200, { elements: [] })), now: () => 0 });
  for (let i = 0; i < OVERPASS_SESSION_CAP; i++) assert.notEqual(await src.read(i, 0), null);
  assert.equal(await src.read(9999, 0), null, 'past the cap: null, never a request');
  assert.equal(n, OVERPASS_SESSION_CAP);
  assert.ok(OVERPASS_SESSION_CAP >= 12 && OVERPASS_SESSION_CAP <= 100, 'room for a few full reads (12 tiles), far under the instance\'s daily guidance');
});

test('fix overpass-hardening 4: a Retry-After longer than the pause is honoured', async () => {
  let now = 0;
  let n = 0;
  const later = { ok: false, status: 429, headers: new Headers({ 'retry-after': '600' }), json: async () => ({}) } as Response;
  const src = createOverpassSource({ fetch: async () => (n++, later), now: () => now });
  await src.read(1, 2);
  now += RATE_PAUSE_MS + 1;
  await src.read(1, 2);
  assert.equal(n, 1, 'still quiet after 60 s: the server asked for 10 minutes');
  now = 600_000 + 1;
  await src.read(1, 2);
  assert.equal(n, 2);
});

test('fix overpass-hardening audit 1: a thrown fetch (offline, or a 502 page the browser hides) pauses like a busy answer', async () => {
  let now = 0;
  let n = 0;
  const thrower = createOverpassSource({ fetch: async () => { n++; throw new TypeError('Failed to fetch'); }, now: () => now });
  assert.equal(await thrower.read(1, 2), null);
  assert.equal(await thrower.read(1, 2), null);
  assert.equal(n, 1, 'paused after a throw');
  now += RATE_PAUSE_MS;
  await thrower.read(1, 2);
  assert.equal(n, 2, 'asked again once the pause is over');
});

test('fix overpass-hardening audit 2: a 200 whose remark is a runtime error is busy: null, a strike, and the streak goes on', async () => {
  let now = 0;
  const times: number[] = [];
  const answers = [res(502), res(502), res(200, { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 11 seconds.' }), res(502)];
  const src = createOverpassSource({ fetch: async () => (times.push(now), answers.shift() ?? res(502)), now: () => now });
  for (let i = 0; i < 1000; i++) {
    const got = await src.read(1, 2);
    assert.equal(got, null, 'never an empty tile from a timed-out query');
    now += 1000;
  }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.deepEqual(gaps.slice(0, 3), [RATE_PAUSE_MS, 2 * RATE_PAUSE_MS, 4 * RATE_PAUSE_MS], 'the remark counted as the third busy answer in a row');
});

test('fix overpass-hardening audit 3: refused and failed requests count toward the session cap too', async () => {
  let now = 0;
  let n = 0;
  const src = createOverpassSource({ fetch: async () => { n++; if (n % 2) return res(500); throw new TypeError('reset'); }, now: () => now });
  for (let i = 0; i < 100_000 && n < OVERPASS_SESSION_CAP; i++) {
    await src.read(1, 2);
    now += 60_000;
  }
  now += 60_000;
  await src.read(1, 2);
  assert.equal(n, OVERPASS_SESSION_CAP, 'the cap counts every request sent (it starts over a day later: fix overpass-cap-daily 1)');
});

test('fix overpass-hardening audit 4: Retry-After as seconds or as an HTTP date; anything else is null', () => {
  const now = Date.parse('Wed, 05 Nov 2026 12:00:00 GMT');
  assert.equal(retryAfterS('120', now), 120);
  assert.equal(retryAfterS(' 30 ', now), 30);
  assert.equal(retryAfterS('Wed, 05 Nov 2026 12:10:00 GMT', now), 600);
  assert.equal(retryAfterS('Wed, 05 Nov 2026 11:00:00 GMT', now), 0, 'a date in the past asks for no wait');
  for (const bad of [null, undefined, '', 'soon', '1.5', '-3']) assert.equal(retryAfterS(bad, now), null, String(bad));
});

test('fix overpass-hardening audit 6: overpassPause and overpassRuntimeError, as core', () => {
  assert.equal(overpassPause(1, 60_000, 960_000), 60_000);
  assert.equal(overpassPause(3, 60_000, 960_000), 240_000);
  assert.equal(overpassPause(40, 60_000, 960_000), 960_000, 'no overflow past the ceiling');
  assert.equal(overpassPause(0, 60_000, 960_000), 60_000, 'strikes below one read as the first');
  assert.equal(overpassPause(1, 60_000, 960_000, 600), 600_000, 'a longer Retry-After wins');
  assert.equal(overpassPause(5, 60_000, 960_000, 10), 960_000, 'a shorter one does not shorten the pause');
  assert.equal(overpassRuntimeError({ elements: [], remark: 'runtime error: Query ran out of memory' }), true);
  assert.equal(overpassRuntimeError({ elements: [], remark: 'runtime remark: Timeout is 10 seconds' }), false);
  assert.equal(overpassRuntimeError({ elements: [] }), false);
  assert.equal(overpassRuntimeError(null), false);
});

test('fix overpass-hardening audit 7: a request the reader gives up on at its deadline pauses Overpass like a busy answer', async () => {
  let n = 0;
  const hangs = createOverpassSource({
    // An overloaded instance holds the request until the caller stops waiting.
    fetch: (_u, init) => { n++; return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))); },
    now: () => 0,
  });
  const ctl = new AbortController();
  const pending = hangs.read(1, 2, ctl.signal);
  ctl.abort();
  assert.equal(await pending, null);
  assert.equal(await hangs.read(3, 4), null);
  assert.equal(n, 1, 'too slow is busy: the next tile is not asked');
});

test('fix overpass-hardening audit 8: a 200 whose body is not JSON is busy; a 500 neither pauses nor resets the streak', async () => {
  let n = 0;
  const garbled = createOverpassSource({ fetch: async () => (n++, { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } } as unknown as Response), now: () => 0 });
  assert.equal(await garbled.read(1, 2), null);
  await garbled.read(1, 2);
  assert.equal(n, 1, 'paused after a body that is not JSON');

  let now = 0;
  const times: number[] = [];
  const answers = [res(502), res(500), res(502)];
  const src = createOverpassSource({ fetch: async () => (times.push(now), answers.shift() ?? res(502)), now: () => now });
  for (let i = 0; i < 400; i++) {
    await src.read(1, 2);
    now += 1000;
  }
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.deepEqual(gaps.slice(0, 3), [RATE_PAUSE_MS, 1000, 2 * RATE_PAUSE_MS], 'the 500 asked again at once and the next 502 was the second in a row');
});

test('fix overpass-hardening audit 9: a Retry-After date without GMT is null; one past an hour is honoured for an hour', () => {
  const now = Date.parse('Wed, 05 Nov 2026 12:00:00 GMT');
  assert.equal(retryAfterS('Nov 5 2026 12:10', now), null, 'no zone: would depend on the device\'s time zone');
  assert.equal(overpassPause(1, 60_000, 960_000, 99_999_999_999), 3_600_000);
  assert.equal(overpassPause(1, 60_000, 960_000, 1800), 1_800_000, 'under an hour, as asked');
});

test('fix overpass-cap-daily 1: the request cap starts over a day after its first request, however long the app stays open', async () => {
  let now = 0;
  let n = 0;
  const src = createOverpassSource({ fetch: async () => (n++, res(200, { elements: [] })), now: () => now });
  for (let i = 0; i < OVERPASS_SESSION_CAP; i++) await src.read(i, 0);
  now += CAP_WINDOW_MS - 1;
  assert.equal(await src.read(1, 1), null, 'still within the day: capped');
  assert.equal(n, OVERPASS_SESSION_CAP);
  now += 1;
  assert.notEqual(await src.read(1, 1), null, 'a day after the first request: asked again');
  assert.equal(n, OVERPASS_SESSION_CAP + 1);
  assert.equal(CAP_WINDOW_MS, 24 * 3600_000);
});
