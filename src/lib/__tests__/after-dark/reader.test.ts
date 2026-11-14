/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { fakePorts, type FakePorts } from '../fakes';

// After dark (DK9, DK14), written from specs/after-dark/spec.md before the code.

interface DarkWay { id: string; lit: string; name?: string; line: LngLat[] }
interface DarkPlace { id: string; at: LngLat; hours: string }
interface DarkFacts { x: number; y: number; ways: DarkWay[]; places: DarkPlace[] }
interface DarkTile { key: string; x: number; y: number; code: string; read_at: number; ways: DarkWay[]; places: DarkPlace[] }
interface DarkSource { read(x: number, y: number, signal?: AbortSignal): Promise<DarkFacts | null> }
interface Api {
  createDarkReader(p: FakePorts, source: DarkSource): { read(tiles: [number, number][], shouldStop?: () => boolean): Promise<{ tiles: DarkTile[]; failed: number }> };
  DARK_KEEP_MS: number;
  DARK_RETRY_MS: number;
}
const api = async () => (await import('../../dark/reader' as string)) as Api;

const DAY = 24 * 3600_000;
type Spy = DarkSource & { calls: string[]; fail: boolean; hours: string };
const spy = (): Spy => {
  const s: Spy = {
    calls: [], fail: false, hours: 'Mo-Su 17:00-23:00',
    async read(x, y) {
      s.calls.push(`${x}/${y}`);
      await new Promise((r) => setTimeout(r, 1));
      return s.fail ? null : { x, y, ways: [{ id: `w${x}`, lit: 'yes', line: [[-75.49, 40.6], [-75.488, 40.6]] }], places: [{ id: `n${x}`, at: [-75.49, 40.6], hours: s.hours }] };
    },
  };
  return s;
};

test('DK9: a kept tile is used until thirty days old, then read again; the raw tags are kept and open is never stored', async () => {
  const { createDarkReader, DARK_KEEP_MS } = await api();
  assert.equal(DARK_KEEP_MS, 30 * DAY);
  const p = fakePorts();
  const s = spy();
  const first = await createDarkReader(p, s).read([[1, 2]]);
  assert.equal(first.tiles.length, 1);
  assert.equal(s.calls.length, 1);
  // After a reload (a new reader), the device's copy is used.
  p.clock.advance(29 * DAY);
  await createDarkReader(p, s).read([[1, 2]]);
  assert.equal(s.calls.length, 1, 'kept for thirty days');
  p.clock.advance(2 * DAY);
  s.hours = 'Mo-Su 18:00-22:00';
  const again = await createDarkReader(p, s).read([[1, 2]]);
  assert.equal(s.calls.length, 2, 'read again past thirty days');
  assert.equal(again.tiles[0].places[0].hours, 'Mo-Su 18:00-22:00', 'the raw opening hours, as given');
  const [kept] = await (p.db as unknown as { getDarkTiles(k: string[]): Promise<DarkTile[]> }).getDarkTiles(['1/2']);
  assert.equal(kept.ways[0].lit, 'yes');
  assert.ok(!JSON.stringify(kept).includes('"open"'), 'whether a place is open is never stored');
});

test('DK14: an overloaded or failed source draws no guess, keeps what was kept and waits two minutes before asking again', async () => {
  const { createDarkReader, DARK_RETRY_MS, DARK_KEEP_MS } = await api();
  assert.equal(DARK_RETRY_MS, 2 * 60_000);
  const p = fakePorts();
  const s = spy();
  s.fail = true;
  const r = createDarkReader(p, s);
  const none = await r.read([[1, 2]]);
  assert.deepEqual(none, { tiles: [], failed: 1 });
  await r.read([[1, 2]]);
  assert.equal(s.calls.length, 1, 'not asked again within two minutes');
  p.clock.advance(DARK_RETRY_MS);
  s.fail = false;
  await r.read([[1, 2]]);
  assert.equal(s.calls.length, 2);
  // An old tile beats none when the source is down.
  p.clock.advance(DARK_KEEP_MS + 1);
  s.fail = true;
  const old = await createDarkReader(p, s).read([[1, 2]]);
  assert.equal(old.tiles.length, 1);
  assert.equal(old.failed, 0);
});
