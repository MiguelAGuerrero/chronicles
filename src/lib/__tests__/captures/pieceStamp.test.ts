/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Moment stacks, MS3 (decision 0106, 0036): a capture's stamp. A piece for an open moment takes no fix; a new
// moment takes a fresh one or asks for one. Test first: the module is reached by name.

type Stamp = { t: number; at: [number, number] | null; locate: boolean; into: string | null };
type Mod = { stampFor(now: number, pos: { here: [number, number] | null; lastFixAt: number | null }, into: string | null): Stamp };
const mod = () => import('../../pieceStamp' + '') as Promise<Mod>;

test('MS3: a piece\'s stamp asks for no fix and carries no place; a new moment\'s takes a fresh fix or asks for one', { todo: 'test first' }, async () => {
  const { stampFor } = await mod();
  const fresh = { here: [-71.4, 41.8] as [number, number], lastFixAt: 9_000 };
  assert.deepEqual(stampFor(10_000, fresh, 'm1'), { t: 10_000, at: null, locate: false, into: 'm1' });
  assert.deepEqual(stampFor(10_000, fresh, null), { t: 10_000, at: [-71.4, 41.8], locate: false, into: null });
  assert.deepEqual(stampFor(10_000, { here: null, lastFixAt: null }, null), { t: 10_000, at: null, locate: true, into: null });
  assert.deepEqual(stampFor(100_000, fresh, null).locate, true, 'a stale fix is not used');
});
