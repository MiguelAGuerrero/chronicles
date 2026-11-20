/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Find } from '../../explore/explore';
import type { Ports } from '../../ports/types';
import { fakePorts } from '../fakes';

// A place offered after the moment (specs/moment-assignment-fallback): the shell's Undo and the places left, over fakePorts().

type Shell = {
  untie: (key: string, captureId: string) => Promise<void>;
  left: (walkId: string) => Promise<Set<string>>;
  leave: (walkId: string, keys: string[]) => Promise<void>;
};
const create = async (p: Pick<Ports, 'db'>) =>
  ((await import(new URL('../../explore/offer/shell.ts', import.meta.url).href)) as unknown as { createPlaceOffer: (p: Pick<Ports, 'db'>) => Shell }).createPlaceOffer(p);

const find = (key: string, capture_id: string): Find => ({
  key, area_key: null, walk_id: 'w1', capture_id, found_at: 1, name: key, category: 'history', kind: 'monuments', at: [-71.4, 41.8], generic: false,
});

test('PO12: Undo removes the tie and keeps the moment; a find another moment made stays', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await p.db.addFind(find('k:Old Bridge', 'c1'));
  await p.db.addFind(find('k:Clock Tower', 'c0'));
  const offer = await create(p);
  await offer.untie('k:Old Bridge', 'c1');
  await offer.untie('k:Clock Tower', 'c1');
  assert.deepEqual((await p.db.listFinds('w1')).map((f) => f.key), ['k:Clock Tower']);
});

test('PO4: the places left with Leave it are kept per walk and read back after a reload', { todo: 'test first' }, async () => {
  const p = fakePorts();
  await (await create(p)).leave('w1', ['k:Old Bridge']);
  await (await create(p)).leave('w1', ['k:Gate', 'k:Old Bridge']);
  const again = await create(p);
  assert.deepEqual([...(await again.left('w1'))].sort(), ['k:Gate', 'k:Old Bridge']);
  assert.deepEqual([...(await again.left('w2'))], [], 'another walk starts with none');
});
