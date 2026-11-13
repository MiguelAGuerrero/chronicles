/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Smooth neighborhood switches (SS4, SS7, SS8), written from specs/smooth-switches/spec.md before the code.

type Held = { hold: string | null; keys: string[] };
type Api = {
  heldAreas: (prev: Held | null, hold: string | null, near: string[]) => Held;
  triedAfter: (outcome: 'read' | 'failed' | 'cut') => boolean;
  needsListing: (p: { listed: number | null; version: number }) => boolean;
};
const api = async () => (await import('../../layers/state')) as unknown as Api;

test('SS4: on a town\'s page the areas drawn are the same for every neighborhood, an outer one\'s included', { todo: 'test first' }, async () => {
  const { heldAreas } = await api();
  // Mill End's 3 km reaches the town's area and Far Hollow's; Depot's only the town's.
  const a = heldAreas(null, 'town:smallton', ['town', 'far']);
  const b = heldAreas(a, 'town:smallton', ['town', 'depot']);
  assert.deepEqual(b.keys, ['town', 'far', 'depot'], 'switching adds what a read brought, removes nothing');
  // Back to Mill End: the same areas, the same array (nothing to send the map).
  const c = heldAreas(b, 'town:smallton', ['town', 'far']);
  assert.equal(c, b);
  // Off the town's page (near you, the walk maps): the areas near the centre alone, as before.
  assert.deepEqual(heldAreas(c, null, ['depot']), { hold: null, keys: ['depot'] });
  // Another town's page starts its own.
  assert.deepEqual(heldAreas(c, 'town:other', ['x']).keys, ['x']);
});

test('SS7: a read cut short is not tried; selected again it reads', { todo: 'test first' }, async () => {
  const { triedAfter } = await api();
  assert.equal(triedAfter('read'), true);
  assert.equal(triedAfter('failed'), true, 'a failure waits for a toggle or a move of about 1 km (ML9)');
  assert.equal(triedAfter('cut'), false, 'a switch away cut it: the next selection of that area reads it');
});

test('SS8: the remembered areas are listed at the start, after a read and on reload only', { todo: 'test first' }, async () => {
  const { needsListing } = await api();
  assert.equal(needsListing({ listed: null, version: 0 }), true, 'the layer coming on lists them');
  assert.equal(needsListing({ listed: 0, version: 0 }), false, 'a switch alone lists nothing');
  assert.equal(needsListing({ listed: 0, version: 1 }), true, 'a read finished, or a reload, lists again');
});
