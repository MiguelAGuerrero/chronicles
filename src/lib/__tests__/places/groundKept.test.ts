/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Ground } from '../../areas/hoods';
import type { PlaceCandidate } from '../../areas/types';

// Smooth neighborhood switches (SS1), written from specs/smooth-switches/spec.md before the code.

type Kept = { hood: string; key: string; ground: Ground | null };
type Api = {
  groundKey: (hood: { name: string; at: [number, number] }, tiles: number, near: PlaceCandidate[]) => string;
  hoodKeyOf: (hood: { name: string; at: [number, number] }) => string;
  keepGround: (kept: Kept[], entry: Kept, max?: number) => Kept[];
  groundFor: (kept: Kept[], hood: string, key: string | null) => Kept | undefined;
};
const api = async () => (await import('../../areas/hoods')) as unknown as Api;

const G = (x: number): Ground => ({ polygons: [[[[x, 0], [x + 1, 0], [x + 1, 1], [x, 0]]]], bbox: [x, 0, x + 1, 1] });
const A = { name: 'Mill End', at: [-75.4, 40.6] as [number, number] };
const B = { name: 'Depot', at: [-75.38, 40.61] as [number, number] };
const near: PlaceCandidate[] = [{ level: 'neighborhood', name: 'Mill End', at: A.at, reachM: 1000 }, { level: 'neighborhood', name: 'Depot', at: B.at, reachM: 1000 }];

test('SS1: a neighborhood\'s outline is kept by its key, tile count and candidates; a revisit takes it', async () => {
  const { groundKey, hoodKeyOf, keepGround, groundFor } = await api();
  const kA = groundKey(A, 4, near);
  // The key changes with the tiles read and the candidates weighed, never with a new array of the same.
  assert.equal(groundKey(A, 4, [...near]), kA);
  assert.notEqual(groundKey(A, 5, near), kA);
  assert.notEqual(groundKey(A, 4, near.slice(0, 1)), kA);
  let kept = keepGround([], { hood: hoodKeyOf(A), key: kA, ground: G(1) });
  kept = keepGround(kept, { hood: hoodKeyOf(B), key: groundKey(B, 4, near), ground: G(2) });
  // Back to A: its outline, by its exact key, and while its tiles are still being looked up (no key yet) its newest.
  assert.deepEqual(groundFor(kept, hoodKeyOf(A), kA)?.ground, G(1));
  assert.deepEqual(groundFor(kept, hoodKeyOf(A), null)?.ground, G(1));
  // A tile arrived since: not that one (it is derived again), though the newest stands in while it is.
  assert.equal(groundFor(kept, hoodKeyOf(A), groundKey(A, 5, near)), undefined);
  // Kept again under the same key, it replaces; past the limit the oldest goes first.
  assert.equal(keepGround(kept, { hood: hoodKeyOf(A), key: kA, ground: G(3) }).length, 2);
  let many: Kept[] = [];
  for (let i = 0; i < 30; i++) many = keepGround(many, { hood: `h${i}`, key: `k${i}`, ground: G(i) }, 24);
  assert.equal(many.length, 24);
  assert.equal(groundFor(many, 'h0', 'k0'), undefined);
  assert.ok(groundFor(many, 'h29', 'k29'));
});
