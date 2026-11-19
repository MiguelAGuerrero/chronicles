/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createDeleteRunner, WALK_SAVES_WAIT_MS } from '../../deletion/runner';
import { createMemoGate } from '../../memoGate';
import type { Moment } from '../../types';
import { fakePorts } from '../fakes';

// A walk deleted while a memo or photo is still being saved into it (tend tabs audit 49; decision 0227, the owner:
// "Becomes a loose moment"): the delete waits, bounded, for that walk's saves, which go with the walk; one that lands
// after the bound is a loose moment, never a row with a deleted walk.

const settle = () => new Promise((r) => setImmediate(r));
const memo = (id: string, walk: string): Moment => ({
  id, walk_id: walk, t: 1, lat: null, lon: null, segment_id: null,
  pieces: [{ id, moment_id: id, t: 1, kind: 'voice', file_path: `walks/${walk}/${id}.webm`, body: '3000' }],
});

async function world(bound: Promise<void>) {
  const p = fakePorts();
  await p.db.createWalk({ id: 'w', started_at: 0, ended_at: 60_000, title: null, epilogue: null, open: false, area: null, snapped_build: null });
  await p.db.addMoment(memo('m0', 'w'));
  const gate = createMemoGate();
  const waited: number[] = [];
  const run = createDeleteRunner({
    db: p.db, removeMedia: async () => 0, forgetRecalls: () => {},
    saves: { of: (walkId) => gate.savesOf(walkId) },
    wait: (ms) => {
      waited.push(ms);
      return bound;
    },
  });
  return { p, gate, run, waited };
}

test('tend tabs audit 49: a save that ends within the bound goes with the walk', async () => {
  const { p, gate, run, waited } = await world(new Promise(() => {}));
  let land!: () => void;
  gate.track(new Promise<void>((r) => (land = r)).then(() => p.db.addMoment(memo('m1', 'w'))), {}, 'w');
  const deleting = run({ type: 'walk', walkId: 'w' });
  await settle();
  assert.equal(await p.db.getWalk('w') != null, true, 'the delete waits for the walk\'s save');
  land();
  await deleting;
  assert.deepEqual(waited, [WALK_SAVES_WAIT_MS]);
  assert.equal(WALK_SAVES_WAIT_MS, 10_000);
  assert.equal(await p.db.getWalk('w'), null);
  assert.equal((await p.db.getMomentsByIds(['m0', 'm1'])).length, 0, 'both went with their walk');
});

test('tend tabs audit 49: a memo landing after its walk\'s delete flushed is a loose moment, not orphaned', async () => {
  const { p, gate, run } = await world(Promise.resolve());
  let land!: () => void;
  gate.track(new Promise<void>((r) => (land = r)).then(() => p.db.addMoment(memo('m1', 'w'))), {}, 'w');
  await run({ type: 'walk', walkId: 'w' });
  assert.equal(await p.db.getWalk('w'), null, 'past the bound the walk goes');
  assert.equal((await p.db.getMomentsByIds(['m0'])).length, 0, 'what landed in time went with it');
  land();
  for (let i = 0; i < 10; i++) await settle();
  const [late] = await p.db.getMomentsByIds(['m1']);
  assert.ok(late, 'the late memo is kept');
  assert.equal(late.walk_id, null, 'as a loose moment, not a row of a deleted walk');
});

test('tend tabs audit 49: a photo being kept counts as the walk\'s save; another walk\'s saves do not hold the delete', async () => {
  const gate = createMemoGate();
  gate.keep(new Promise(() => {}), 'w');
  gate.track(new Promise(() => {}), {}, 'other');
  assert.equal(gate.savesOf('w').length, 1);
  assert.equal(gate.savesOf('other').length, 1);
  assert.equal(gate.savesOf('none').length, 0);
});

test('tend tabs audit 49: the app\'s runner waits on the gate, and every save names its walk', () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', '..', '..', '..', f), 'utf8');
  assert.match(read('src/lib/deletion/index.ts'), /saves: \{ of: \(walkId\) => memoGate\.savesOf\(walkId\) \}/);
  const captures = read('src/lib/useCaptures.ts');
  assert.match(captures, /memoGate\.track\(p, self, walkId\);/);
  assert.match(captures, /memoGate\.keep\(keeping, stamp\.walk\);/);
});
