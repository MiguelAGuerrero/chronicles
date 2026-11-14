/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// After dark (DK8): one Overpass cap and one back-off for both layers, written from specs/after-dark/spec.md before the code.

interface Gate {
  take(who: 'walk' | 'dark'): boolean;
  busy(retryAfterS?: number | null): void;
  ok(): void;
}
interface GateApi {
  createOverpassGate(o: { now: () => number }): Gate;
  OVERPASS_SESSION_CAP: number;
  DARK_CAP: number;
}
interface SourceApi {
  createDarkSource(o: { fetch: typeof fetch; gate: Gate; url?: string }): { read(x: number, y: number, signal?: AbortSignal): Promise<unknown | null> };
}
const gateApi = async () => (await import('../../net/overpassGate' as string)) as GateApi;
const sourceApi = async () => (await import('../../dark/source' as string)) as SourceApi;

test('DK8: one cap of sixty across both sources, after dark stopping at forty; one back-off pauses both', async () => {
  const { createOverpassGate, OVERPASS_SESSION_CAP, DARK_CAP } = await gateApi();
  assert.equal(OVERPASS_SESSION_CAP, 60);
  assert.equal(DARK_CAP, 40);
  let now = 0;
  const g = createOverpassGate({ now: () => now });
  let dark = 0;
  while (g.take('dark')) dark++;
  assert.equal(dark, 40, 'after dark stops at forty');
  let walk = 0;
  while (g.take('walk')) walk++;
  assert.equal(walk, 20, 'walkability always has twenty left');
  // The window starts over after a day.
  now += 24 * 3600_000;
  assert.equal(g.take('walk'), true);
  // A busy answer pauses both, for walkability as before (60 s first).
  g.busy();
  assert.equal(g.take('dark'), false);
  assert.equal(g.take('walk'), false);
  now += 60_000;
  assert.equal(g.take('dark'), true);
  // Walkability alone may use all sixty.
  const fresh = createOverpassGate({ now: () => 0 });
  let all = 0;
  while (fresh.take('walk')) all++;
  assert.equal(all, 60);
});

test('DK8: the after-dark source posts the tile\'s box and nothing else, and asks nothing when the gate is shut', async () => {
  const { createOverpassGate } = await gateApi();
  const { createDarkSource } = await sourceApi();
  const sent: { url: string; init?: RequestInit }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ elements: [] }) } as unknown as Response;
  }) as unknown as typeof globalThis.fetch;
  const gate = createOverpassGate({ now: () => 0 });
  const src = createDarkSource({ fetch, gate });
  const got = await src.read(4823, 6163);
  assert.ok(got, 'an empty tile is a tile');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].init?.method, 'POST');
  assert.equal(sent[0].init?.headers, undefined, 'no custom headers, key or identifier');
  const body = decodeURIComponent(String(sent[0].init?.body).replace(/^data=/, ''));
  assert.ok(/\(-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+\)/.test(body), body);
  gate.busy();
  assert.equal(await src.read(4823, 6164), null);
  assert.equal(sent.length, 1, 'nothing asked while paused');
});
