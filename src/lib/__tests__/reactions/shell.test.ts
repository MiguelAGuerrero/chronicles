import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// Reactions' shell (RX8, RX13): writes at once, holds a new page's choices until its moment is kept. Test first.
const shell = () => import('../../reactions/shell' as string) as Promise<Record<string, any>>;
const rows = async (p: ReturnType<typeof fakePorts>) => ((await (p.db as unknown as { listReactions: () => Promise<{ moment_id: string; family: string; reaction: string }[]> }).listReactions()) ?? [])
  .map((r) => [r.moment_id, r.family, r.reaction]).sort();

test('RX8: a reaction chosen is written at once, and is there for a fresh read (the app opened again)', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  await r.choose('m1', 'idea');
  await r.choose('m1', 'happy');
  assert.deepEqual(await rows(p), [['m1', 'feeling', 'happy'], ['m1', 'thought', 'idea']]);
  const again = createReactions(p);
  await again.load();
  assert.deepEqual(again.get('m1'), { feeling: 'happy', thought: 'idea' });
  await again.choose('m1', 'idea');
  assert.deepEqual(await rows(p), [['m1', 'feeling', 'happy']]);
});

test('RX8: a failed write leaves the reactions as they were and says so (a failure only the fake can produce)', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  (p.db as unknown as { failNext: (m: string) => void }).failNext('setReaction');
  await assert.rejects(r.choose('m1', 'idea'));
  assert.deepEqual(r.get('m1'), {});
});

test('RX13: a new page\'s reactions wait for its moment, are written when it is kept, and a page left without words writes none', async () => {
  const { createReactions } = await shell();
  const p = fakePorts();
  const r = createReactions(p);
  await r.load();
  r.hold('page-1', 'idea');
  r.hold('page-1', 'sad');
  assert.deepEqual(r.held('page-1'), { thought: 'idea', feeling: 'sad' });
  assert.deepEqual(await rows(p), [], 'nothing written before the moment is kept');
  await r.keep('page-1', 'm9');
  assert.deepEqual(await rows(p), [['m9', 'feeling', 'sad'], ['m9', 'thought', 'idea']]);
  r.hold('page-2', 'like');
  r.drop('page-2');
  await r.keep('page-2', 'm10');
  assert.deepEqual((await rows(p)).filter((x) => x[0] === 'm10'), []);
});
