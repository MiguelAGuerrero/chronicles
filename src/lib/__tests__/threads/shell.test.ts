import { type Faced, facedAll, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createThreads, type ThreadDeleteJob } from '../../threads/shell';
import { createDeleteRunner } from '../../deletion/runner';
import { fakePorts } from '../fakes';

const moment = (id: string, t: number, more: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: null, t, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: `note ${id}`, segment_id: null, ...more,
});

async function setup(ids: string[] = ['m1', 'm2', 'm3']) {
  const ports = fakePorts();
  const jobs: ThreadDeleteJob[] = [];
  const threads = createThreads(ports, { schedule: (j) => jobs.push(j) });
  for (const [i, id] of ids.entries()) await ports.db.addMoment(momentOf(moment(id, 1000 + i)));
  // What the Undo window does when the owner taps Close: store each waiting delete, then the screens read again.
  const runner = createDeleteRunner({ db: ports.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const storeJobs = async () => {
    while (jobs.length) await runner(jobs.shift()!.spec);
    await threads.load();
  };
  return { ports, threads, jobs, storeJobs };
}

test('OT5: a new thread is made of kept moments the owner picks, and named only if they say so', async () => {
  const { ports, threads } = await setup();
  const id = await threads.startThread(['m1', 'm2']);
  assert.ok(id);
  const { threads: ts, members } = await ports.db.listThreads();
  assert.deepEqual(ts.map((t) => [t.id, t.name]), [[id, null]]);
  assert.deepEqual(members.map((m) => m.moment_id).sort(), ['m1', 'm2']);
  assert.equal(threads.store.get().data.threads.length, 1, 'the store follows what was stored');
  const named = await threads.startThread(['m2', 'm3'], '  Compliments ');
  assert.equal((await ports.db.listThreads()).threads.find((t) => t.id === named)?.name, 'Compliments');
});

test('OT6: no thread without two kept moments, none empty, and nothing but a kept moment joins', async () => {
  const { ports, threads } = await setup();
  assert.equal(await threads.startThread([]), null);
  assert.equal(await threads.startThread(['m1']), null);
  assert.equal(await threads.startThread(['m1', 'm1']), null);
  assert.equal(await threads.startThread(['m1', 'not-a-moment']), null);
  assert.deepEqual((await ports.db.listThreads()).threads, [], 'nothing was written');
  const id = (await threads.startThread(['m1', 'm2']))!;
  assert.equal(await threads.addToThread(id, 'a-place'), false);
  assert.equal(await threads.addToThread('no-thread', 'm3'), false);
  assert.equal((await ports.db.listThreads()).members.length, 2);
});

test('OT7: a moment may be in several threads, and adding it twice changes nothing', async () => {
  const { ports, threads } = await setup();
  const a = (await threads.startThread(['m1', 'm2']))!;
  const b = (await threads.startThread(['m1', 'm3']))!;
  const before = (await ports.db.listThreads()).members;
  assert.equal(await threads.addToThread(a, 'm1'), true);
  assert.deepEqual((await ports.db.listThreads()).members, before, 'the membership keeps its first time');
  assert.deepEqual((await ports.db.listThreads()).members.filter((m) => m.moment_id === 'm1').map((m) => m.thread_id).sort(), [a, b].sort());
  assert.equal(await threads.addToThread(a, 'm3'), true);
  assert.equal((await ports.db.listThreads()).members.filter((m) => m.thread_id === a).length, 3);
});

test('OT8: Remove from this thread keeps the moment, its other threads and its links', async () => {
  const { ports, threads, storeJobs } = await setup();
  const a = (await threads.startThread(['m1', 'm2', 'm3']))!;
  const b = (await threads.startThread(['m1', 'm2']))!;
  await ports.db.applyThreads({ putLinks: [{ from_id: 'm2', to_id: 'm1', created_at: 1 }] });
  threads.removeFromThread(a, 'm1');
  await storeJobs();
  const got = await ports.db.listThreads();
  assert.deepEqual(got.members.filter((m) => m.thread_id === a).map((m) => m.moment_id).sort(), ['m2', 'm3']);
  assert.ok(got.members.some((m) => m.thread_id === b && m.moment_id === 'm1'), 'its other thread keeps it');
  assert.equal(got.links.length, 1);
  assert.equal((await ports.db.getMomentsByIds(['m1']).then(facedAll)).length, 1, 'the moment is kept');
});

test('OT2: a reply links to the moment it answers and joins its thread, or makes an unnamed thread of the two', async () => {
  const { ports, threads } = await setup(['m1', 'm2', 'r1', 'r2']);
  const t = (await threads.startThread(['m1', 'm2']))!;
  assert.equal(await threads.reply('r1', 'm1', t), true);
  let got = await ports.db.listThreads();
  assert.deepEqual(got.links, [{ from_id: 'r1', to_id: 'm1', created_at: got.links[0].created_at }]);
  assert.ok(got.members.some((m) => m.thread_id === t && m.moment_id === 'r1'), 'it joins the answered moment\'s thread');
  const lone = await setup(['x', 'y']);
  assert.equal(await lone.threads.reply('y', 'x'), true);
  got = await lone.ports.db.listThreads();
  assert.equal(got.threads.length, 1);
  assert.equal(got.threads[0].name, null, 'an unnamed thread of the two');
  assert.deepEqual(got.members.map((m) => m.moment_id).sort(), ['x', 'y']);
  assert.equal(await lone.threads.reply('y', 'y'), false, 'a moment cannot answer itself');
  assert.equal(await lone.threads.reply('ghost', 'x'), false, 'the reply must be a kept moment');
  assert.equal(got.links.length, 1);
});

test('OT13: the name is the owner\'s: set, changed, cleared, never filled in for them', async () => {
  const { ports, threads } = await setup();
  const t = (await threads.startThread(['m1', 'm2']))!;
  await threads.rename(t, 'Compliments');
  assert.equal((await ports.db.listThreads()).threads[0].name, 'Compliments');
  await threads.rename(t, '   ');
  assert.equal((await ports.db.listThreads()).threads[0].name, null);
  await threads.rename('no-thread', 'x');
  assert.equal((await ports.db.listThreads()).threads.length, 1);
});

test('OT14: Delete this thread waits for the Undo window and then removes the thread and memberships only', async () => {
  const { ports, threads, jobs, storeJobs } = await setup();
  const t = (await threads.startThread(['m1', 'm2']))!;
  await ports.db.applyThreads({ putLinks: [{ from_id: 'm2', to_id: 'm1', created_at: 1 }] });
  threads.deleteThread(t);
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].ids, [t], 'every screen hides the thread meanwhile');
  assert.equal((await ports.db.listThreads()).threads.length, 1, 'nothing is stored until the window ends: Undo costs nothing');
  await storeJobs();
  const got = await ports.db.listThreads();
  assert.deepEqual([got.threads, got.members], [[], []]);
  assert.equal(got.links.length, 1, 'the reply link is not the thread\'s');
  assert.equal((await ports.db.getMomentsByIds(['m1', 'm2', 'm3']).then(facedAll)).length, 3, 'no moment is deleted');
  assert.deepEqual(threads.store.get().data.threads, []);
});

test('OT15: a thread left with fewer than two moments dissolves at once, name and all', async () => {
  const { ports, threads, storeJobs } = await setup();
  const t = (await threads.startThread(['m1', 'm2'], 'Named'))!;
  threads.removeFromThread(t, 'm2');
  await storeJobs();
  assert.deepEqual((await ports.db.listThreads()).threads, []);
  assert.deepEqual((await ports.db.listThreads()).members, []);
  assert.deepEqual(threads.store.get().data.threads, []);
});

test('OT18: linking never changes a moment\'s own row', async () => {
  const { ports, threads, storeJobs } = await setup(['m1', 'm2', 'r']);
  const before = await ports.db.getMomentsByIds(['m1', 'm2', 'r']).then(facedAll);
  const t = (await threads.startThread(['m1', 'm2']))!;
  await threads.reply('r', 'm1', t);
  threads.removeFromThread(t, 'r');
  await storeJobs();
  await threads.rename(t, 'x');
  assert.deepEqual(await ports.db.getMomentsByIds(['m1', 'm2', 'r']).then(facedAll), before);
});
