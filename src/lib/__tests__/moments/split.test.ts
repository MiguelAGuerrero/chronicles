/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PendingJob } from '../../deletion/pending';
import { createDeleteRunner } from '../../deletion/runner';
import type { Moment } from '../../types';
import { fakePorts } from '../fakes';

// Moment stacks MS16 (decision 0123): Split out through the Undo window, over fakePorts. Test first: reached by name.
type Split = {
  split(m: Moment, pieceId: string): Promise<void>;
  /** The moments shown at once, before they are stored: the viewer's "one Next moment away". */
  pending(): Moment[];
};
const mod = () => import('../../split/shell' + '') as Promise<{ createSplit(p: unknown, deps: { schedule(job: PendingJob): void }): Split }>;

const stacked = (): Moment => ({
  id: 'm', walk_id: null, t: 1, lat: 41.8, lon: -71.4, segment_id: null,
  pieces: [
    { id: 'm', moment_id: 'm', t: 1, kind: 'photo', file_path: 'm.jpg', body: null },
    { id: 'p', moment_id: 'm', t: 5, kind: 'photo', file_path: 'p.jpg', body: null },
    { id: 'n', moment_id: 'm', t: 9, kind: 'text', file_path: null, body: 'a note' },
  ],
});

async function seeded() {
  const p = fakePorts();
  await p.db.addMoment(stacked());
  await p.db.addMoment({ id: 'other', walk_id: null, t: 2, lat: null, lon: null, segment_id: null, pieces: [{ id: 'other', moment_id: 'other', t: 2, kind: 'text', file_path: null, body: 'x' }] });
  await p.db.setRecall({ capture_id: 'm', frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
  await p.db.addFind({ key: 'f', area_key: null, walk_id: null, capture_id: 'm', found_at: 1, name: 'Door', category: 'art', kind: 'public_art', at: [-71.4, 41.8], generic: false });
  await p.db.applyThreads({ putThreads: [{ id: 't', name: null, created_at: 1 }], putMembers: [{ thread_id: 't', moment_id: 'm', added_at: 1 }, { thread_id: 't', moment_id: 'other', added_at: 1 }], putLinks: [{ from_id: 'other', to_id: 'm', created_at: 1 }] });
  return p;
}

test('MS16: Split out keeps the original\'s threads, replies, reminder and find, and the piece becomes its own moment after the window', async () => {
  const p = await seeded();
  const jobs: PendingJob[] = [];
  const s = (await mod()).createSplit(p, { schedule: (j) => jobs.push(j) });
  await s.split(stacked(), 'p');
  assert.deepEqual(s.pending().map((m) => [m.id, m.pieces.map((x) => x.id), m.t, m.lat]), [['p', ['p'], 5, 41.8]], 'shown at once as its own moment');
  assert.deepEqual((await p.db.getMomentsByIds(['m']))[0].pieces.map((x) => x.id), ['m', 'p', 'n'], 'nothing stored before the window');
  await createDeleteRunner({ db: p.db, removeMedia: async () => 0, forgetRecalls: () => {} })(jobs[0].spec);
  assert.deepEqual((await p.db.getMomentsByIds(['m']))[0].pieces.map((x) => x.id), ['m', 'n']);
  assert.deepEqual((await p.db.getMomentsByIds(['p']))[0].pieces.map((x) => [x.id, x.moment_id, x.t]), [['p', 'p', 5]]);
  const { members, links } = await p.db.listThreads();
  assert.ok(members.some((x) => x.moment_id === 'm') && links.some((l) => l.to_id === 'm'), 'its thread and its reply stay with the original');
  assert.equal((await p.db.listRecalls())[0].capture_id, 'm');
  assert.equal((await p.db.listFinds())[0].capture_id, 'm');
});

test('MS16: Undo (the job never run) leaves both as they were; the first piece is never split', async () => {
  const p = await seeded();
  const jobs: PendingJob[] = [];
  const s = (await mod()).createSplit(p, { schedule: (j) => jobs.push(j) });
  await s.split(stacked(), 'n');
  assert.deepEqual(jobs[0].ids, ['piece:n'], 'hidden from its stack by its piece key while it waits');
  assert.deepEqual((await p.db.getMomentsByIds(['m']))[0].pieces.length, 3);
  await assert.rejects(s.split(stacked(), 'm'), 'the first piece is the moment\'s anchor');
});
