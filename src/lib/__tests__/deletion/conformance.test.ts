import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeleteRunner } from '../../deletion/runner';
import { createPending, type PendingJob } from '../../deletion/pending';
import { isPendingJob } from '../../deletion/saved';
import { metaStore } from '../../meta';
import { fakePorts } from '../fakes';
import { type Flat, momentOf } from '../../moment';

// UI conformance (specs/ui-conformance, decision 0113): the Undo window waits for the owner, and survives a kill.

const settle = () => new Promise((r) => setImmediate(r));
const timers = () => {
  const pending: { fn: () => void; ms: number }[] = [];
  return { setTimer: (fn: () => void, ms: number) => pending.push({ fn, ms }), clearTimer: () => {}, pending };
};
const note = (id: string): Flat => ({ id, walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body: id, segment_id: null });
const moment = (id: string): PendingJob => ({ kind: 'moment', what: 'text', ids: [id], spec: { type: 'moment', captureId: id } });

async function app(ports = fakePorts()) {
  const meta = metaStore(ports.db);
  const run = createDeleteRunner({ db: ports.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const t = timers();
  const window = createPending({ ...t, run, save: (jobs) => void (jobs.length ? meta.set('pending_delete', jobs) : meta.clear('pending_delete')) });
  return { ports, meta, window, t };
}

test('UC1: a waiting delete never ends on a timer', async () => {
  const { ports, window, t } = await app();
  await ports.db.addMoment(momentOf(note('a')));
  window.schedule(moment('a'));
  assert.equal(t.pending.length, 0, 'no timer is set for the window');
  await settle();
  assert.equal((await ports.db.getMomentsByIds(['a'])).length, 1, 'still stored: it waits');
  assert.deepEqual(window.state().pending, { kind: 'moment', what: 'text' }, 'the pill is still up');
});

test('UC2: Close or another delete stores it at once; the background does not; Undo brings it back', async () => {
  const { ports, window } = await app();
  for (const id of ['a', 'b', 'c']) await ports.db.addMoment(momentOf(note(id)));
  window.schedule(moment('a'));
  await window.dismiss();
  assert.equal((await ports.db.getMomentsByIds(['a'])).length, 0, 'Close stores it');
  window.schedule(moment('b'));
  window.schedule(moment('c'));
  await settle();
  await settle();
  assert.equal((await ports.db.getMomentsByIds(['b'])).length, 0, 'another delete stores the one before');
  window.undo();
  assert.equal((await ports.db.getMomentsByIds(['c'])).length, 1, 'Undo keeps it');
  assert.equal(window.hidden().has('c'), false, 'and shows it again');
});

test('UC13: a delete still waiting when the app is killed is stored on the next launch', async () => {
  const first = await app();
  await first.ports.db.addMoment(momentOf(note('a')));
  first.window.schedule(moment('a'));
  await settle();
  const saved = await first.meta.get('pending_delete');
  assert.ok(saved && saved.length === 1 && isPendingJob(saved[0]), 'the waiting delete is kept in meta');
  // The app is killed: nothing else runs. The next launch reads the same storage.
  const next = await app(first.ports);
  const jobs = await next.meta.get('pending_delete');
  await next.window.resume(jobs!);
  await settle();
  assert.equal((await next.ports.db.getMomentsByIds(['a'])).length, 0, 'stored at the next launch: it stays gone');
  assert.equal(next.window.state().pending, null, 'with no pill');
  assert.equal(await next.meta.get('pending_delete'), null, 'and nothing is left to run');
  assert.equal(isPendingJob({ kind: 'moment', ids: ['a'], spec: { type: 'nope' } }), false, 'a damaged saved delete is never run');
});

test('UC13: Undo clears what a relaunch would run', async () => {
  const { ports, window, meta } = await app();
  await ports.db.addMoment(momentOf(note('a')));
  window.schedule(moment('a'));
  window.undo();
  await settle();
  assert.equal(await meta.get('pending_delete'), null);
});
