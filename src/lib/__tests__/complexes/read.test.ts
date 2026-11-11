import assert from 'node:assert/strict';
import test from 'node:test';
import { DERIVED_STORES } from '../../db/stores';
import { COMPLEX_TILE_BUDGET, tilesFor } from '../../complexes/extent';
import { createComplexes } from '../../complexes/shell';
import { COMPLEX_CODE, type Complex, type ComplexSource } from '../../complexes/types';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { fixture, piecesOf, placesOf, RELEASE, type Raw } from './fixtures';

// CX14 and CX16: the shell reads bounded tiles once per release, judges, keeps one row per complex, and fails silently.

const h = fixture('harrisburg');
const square: LngLat = [-76.8815, 40.2617];

function fakeSource(raw: Raw, log: [number, number][][]): ComplexSource {
  return {
    async read(_release, tiles) {
      log.push(tiles);
      const have = tiles.filter(([x, y]) => raw.tiles.some((t) => t.x === x && t.y === y));
      const only = (t: { x: number; y: number }) => have.some(([x, y]) => x === t.x && y === t.y);
      const sub: Raw = { release: raw.release, tiles: raw.tiles.filter(only) };
      return { ok: true, pieces: piecesOf(sub), places: placesOf(sub), tiles: have };
    },
  };
}
const memoryStore = () => {
  const rows = new Map<string, Complex>();
  return { rows, putComplexes: async (r: Complex[]) => void r.forEach((c) => rows.set(c.id, c)), complexesNear: async () => [...rows.values()] };
};

test('CX16: an area reads at most the budget of tiles, nearest its point first, and says when it fell short', { todo: 'test first' }, () => {
  const small = tilesFor({ at: square, reachM: 800 });
  assert.ok(small.tiles.length >= 1 && small.tiles.length <= COMPLEX_TILE_BUDGET);
  const t0 = tileAt(square);
  assert.deepEqual(small.tiles[0], [t0.x, t0.y], 'the tile holding the point first');
  const wide = tilesFor({ at: square, reachM: 20000 });
  assert.equal(wide.tiles.length, COMPLEX_TILE_BUDGET);
  assert.equal(wide.partial, true);
});

test('CX14: one row per complex with the release and code; a repeat reads no tile twice; purgeDerived clears the store', { todo: 'test first' }, async () => {
  const log: [number, number][][] = [];
  const store = memoryStore();
  const c = createComplexes({ source: fakeSource(h, log), store, now: () => 0 });
  const a = await c.readArea({ at: square, reachM: 800 }, RELEASE);
  const sq = a.complexes.filter((x) => x.name === 'Strawberry Square');
  assert.equal(sq.length, 1);
  assert.equal(store.rows.get(sq[0].id)?.release, RELEASE);
  assert.equal(store.rows.get(sq[0].id)?.code, COMPLEX_CODE);
  const calls = log.length;
  await c.readArea({ at: square, reachM: 800 }, RELEASE);
  assert.equal(log.slice(calls).flat().length, 0, 'no tile is asked for twice in a release');
  assert.ok(DERIVED_STORES.includes('complex'), 'complex rows are derived: purgeDerived clears them');
});

test('CX16: a failed read shows nothing, throws nothing and is tried again later', { todo: 'test first' }, async () => {
  let n = 0;
  const store = memoryStore();
  const flaky: ComplexSource = { read: async () => (n++ === 0 ? { ok: false } : { ok: true, pieces: piecesOf(h), places: placesOf(h), tiles: h.tiles.map((t) => [t.x, t.y] as [number, number]) }) };
  const c = createComplexes({ source: flaky, store, now: () => 0 });
  const first = await c.readArea({ at: square, reachM: 800 }, RELEASE);
  assert.deepEqual(first.complexes, []);
  assert.equal(store.rows.size, 0);
  const again = await c.readArea({ at: square, reachM: 800 }, RELEASE);
  assert.ok(again.complexes.length > 0, 'a later read tries again');
});
