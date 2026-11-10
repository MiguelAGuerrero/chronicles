import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeleteRunner } from '../../deletion/runner';
import { createPending } from '../../deletion/pending';
import { visibleThreads } from '../../threads/rules';
import { createThreads } from '../../threads/shell';
import { fakePorts } from '../fakes';
import type { Capture } from '../../types';

// UI conformance (specs/ui-conformance): Remove from this thread goes through the Undo window.

const note = (id: string): Capture => ({ id, walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body: id, segment_id: null });

test('UC6: Remove from this thread acts at once with Undo, also when it ends the thread', async () => {
  const ports = fakePorts();
  const run = createDeleteRunner({ db: ports.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const window = createPending({ setTimer: () => 0, clearTimer: () => {}, run });
  const threads = createThreads(ports, { schedule: (job) => window.schedule(job) });
  for (const id of ['m1', 'm2']) await ports.db.addCapture(note(id));
  const t = (await threads.startThread(['m1', 'm2'], 'Named'))!;
  threads.removeFromThread(t, 'm2');
  assert.deepEqual(window.state().pending, { kind: 'remove', what: undefined }, 'the pill says Removed from the thread, with Undo');
  assert.deepEqual(visibleThreads(await ports.db.listThreads(), window.hidden()).threads, [], 'the thread leaves the screen at once: one moment is not a thread');
  window.undo();
  const back = visibleThreads(await ports.db.listThreads(), window.hidden());
  assert.deepEqual(back.threads.map((x) => x.name), ['Named'], 'Undo brings it back with its name');
  assert.equal(back.members.length, 2, 'and its members');
  threads.removeFromThread(t, 'm2');
  await window.dismiss();
  assert.deepEqual((await ports.db.listThreads()).threads, [], 'Close stores it: the thread ends');
  assert.equal((await ports.db.getCapturesByIds(['m1', 'm2'])).length, 2, 'every moment is kept');
});
