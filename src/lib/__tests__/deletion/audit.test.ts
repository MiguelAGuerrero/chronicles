import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { dismissLabel, momentDeleteText } from '../../deletion/core';
import { createDeleteRunner } from '../../deletion/runner';
import { createPending, membershipKey, type PendingJob } from '../../deletion/pending';
import { isPendingJobs } from '../../deletion/saved';
import { dueRecalls } from '../../discovery/recall';
import { createThreads } from '../../threads/shell';
import { visibleThreads } from '../../threads/rules';
import { fakePorts } from '../fakes';
import { type Flat, facedOf, momentOf } from '../../moment';

// UI conformance audit (specs/ui-conformance, Audit): regression tests, each written before its fix.

const settle = () => new Promise((r) => setImmediate(r));
const note = (id: string, more: Partial<Flat> = {}): Flat => ({ id, walk_id: null, t: 1, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: id, segment_id: null, ...more });
const moment = (id: string): PendingJob => ({ kind: 'moment', what: 'text', ids: [id], spec: { type: 'moment', captureId: id } });

function world() {
  const ports = fakePorts();
  const run = createDeleteRunner({ db: ports.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const saved: PendingJob[][] = [];
  const window = createPending({ setTimer: () => 0, clearTimer: () => {}, run, save: (jobs) => saved.push(jobs) });
  const threads = createThreads(ports, { schedule: (job) => window.schedule(job), flush: () => window.flush() });
  return { ports, window, threads, saved };
}

test('ui-conformance audit 2: a moment added back to a thread after its removal was stored shows in it', async () => {
  const { ports, window, threads } = world();
  for (const id of ['a', 'b', 'c']) await ports.db.addMoment(momentOf(note(id)));
  const t = (await threads.startThread(['a', 'b', 'c']))!;
  threads.removeFromThread(t, 'c');
  await window.dismiss();
  assert.equal(await threads.addToThread(t, 'c'), true);
  const seen = visibleThreads(await ports.db.listThreads(), window.hidden());
  assert.ok(seen.members.some((m) => m.thread_id === t && m.moment_id === 'c'), 'c shows in the thread again');
  assert.equal(window.hidden().has(membershipKey(t, 'c')), false, 'a stored removal is not hidden for good');
});

test('ui-conformance audit 4: adding a moment whose removal waits stores the removal first, so the add holds', async () => {
  const { ports, window, threads } = world();
  for (const id of ['a', 'b', 'c']) await ports.db.addMoment(momentOf(note(id)));
  const t = (await threads.startThread(['a', 'b', 'c']))!;
  threads.removeFromThread(t, 'c');
  assert.equal(await threads.addToThread(t, 'c'), true);
  await window.dismiss();
  const stored = (await ports.db.listThreads()).members.filter((m) => m.thread_id === t).map((m) => m.moment_id).sort();
  assert.deepEqual(stored, ['a', 'b', 'c'], 'the add stands; the removal did not undo it');
});

test('ui-conformance audit 5: the saved deletes outlive every commit still running', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const saved: PendingJob[][] = [];
  const window = createPending({
    setTimer: () => 0,
    clearTimer: () => {},
    run: async (spec) => {
      if (spec.type === 'moment' && spec.captureId === 'b') await gate;
    },
    save: (jobs) => saved.push(jobs),
  });
  window.schedule(moment('a'));
  window.schedule(moment('b'));
  const closing = window.dismiss();
  await settle();
  assert.ok(saved.at(-1)!.some((j) => j.ids[0] === 'b'), 'b is still saved while it is being stored');
  release();
  await closing;
  await settle();
  assert.deepEqual(saved.at(-1), [], 'nothing is left once both are stored');
});

test('ui-conformance audit 7: no reminder fires for a moment waiting in Undo', () => {
  const capture = facedOf(note('a'));
  const recall = { capture_id: 'a', frequency: 'once' as const, until: null, last_fired_at: null, fired_count: 0, last_walk_id: null };
  const base = { here: [-71.4, 41.8] as [number, number], walkId: 'w', now: 1e12, quiet: false, recalls: [recall], captures: [capture] };
  assert.equal(dueRecalls(base).length, 1, 'without Undo it is due');
  assert.deepEqual(dueRecalls({ ...base, hidden: new Set(['a']) }), [], 'waiting in Undo, it is not');
});

test('ui-conformance audit 9: a saved delete is stored even when a new one waits first', async () => {
  const { ports, window } = world();
  for (const id of ['old', 'new']) await ports.db.addMoment(momentOf(note(id)));
  window.schedule(moment('new'));
  await window.resume([moment('old')]);
  await settle();
  assert.equal((await ports.db.getMomentsByIds(['old'])).length, 0, 'the delete from before the kill is stored');
  assert.equal((await ports.db.getMomentsByIds(['new'])).length, 1, 'the new one still waits for its owner');
  assert.equal(isPendingJobs([moment('a')]), true);
  assert.equal(isPendingJobs([{ kind: 'moment' }]), false);
});

test('ui-conformance audit 11: Close is named for what it keeps', () => {
  assert.equal(dismissLabel('moment'), 'Close, it stays deleted');
  assert.equal(dismissLabel('remove'), 'Close, it stays removed');
  assert.equal(dismissLabel('media'), 'Close, they stay removed');
});

test('ui-conformance audit 14: no Undo copy names a time', () => {
  assert.doesNotMatch(momentDeleteText('photo', 2_000_000).body, /second/);
  const toast = readFileSync(join(__dirname, '..', '..', '..', 'components', 'UndoToast.tsx'), 'utf8');
  assert.doesNotMatch(toast, /5 s\b|for 5 s|5 seconds/);
});
