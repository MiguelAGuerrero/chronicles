/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PendingJob } from '../../deletion/pending';
import { createDeleteRunner } from '../../deletion/runner';
import type { Moment } from '../../types';
import { fakePorts } from '../fakes';

// Stack with previous SW7, SW9 (decision 0197): the join through the Undo window, over fakePorts. Test first.
type Join = {
  join(entry: Moment, into: Moment): Promise<void>;
  /** The moments as the page shows them at once, before the join is stored: the entry gone, its pieces in the previous. */
  merged(moments: Moment[]): Moment[];
};
const mod = () => import('../../join/shell' + '') as Promise<{ createJoin(p: unknown, deps: { schedule(job: PendingJob): void }): Join }>;

const one = (id: string, t: number, body: string): Moment => ({ id, walk_id: null, t, lat: 41.8, lon: -71.4, segment_id: null, pieces: [{ id, moment_id: id, t, kind: 'text', file_path: null, body }] });

async function seeded() {
  const p = fakePorts();
  await p.db.addMoment(one('prev', 100, 'left onto Maple'));
  await p.db.addMoment(one('new', 900, 'right onto East Union'));
  return p;
}

test('SW9: the join shows at once, and is stored only after the window', async () => {
  const p = await seeded();
  const jobs: PendingJob[] = [];
  const s = (await mod()).createJoin(p, { schedule: (j) => jobs.push(j) });
  await s.join(one('new', 900, 'right onto East Union'), one('prev', 100, 'left onto Maple'));
  const shown = s.merged([one('prev', 100, 'left onto Maple'), one('new', 900, 'right onto East Union')]);
  assert.deepEqual(shown.map((m) => [m.id, m.pieces.map((x) => x.id)]), [['prev', ['prev', 'new']]], 'one moment, never both entries');
  assert.deepEqual((await p.db.getMomentsByIds(['new']))[0].pieces.map((x) => x.id), ['new'], 'nothing stored before the window');
  assert.deepEqual([jobs[0].kind, jobs[0].ids], ['join', ['new']]);
});

test('SW9: Undo (the job never run) leaves both entries as they were', async () => {
  const p = await seeded();
  const jobs: PendingJob[] = [];
  const s = (await mod()).createJoin(p, { schedule: (j) => jobs.push(j) });
  await s.join(one('new', 900, 'right onto East Union'), one('prev', 100, 'left onto Maple'));
  assert.equal((await p.db.getMomentsByIds(['prev', 'new'])).length, 2);
});

test('SW7, SW9: after the window the runner joins them: each piece keeps its own time, the previous keeps its place and time, the emptied entry is gone; a killed app does the same from the saved spec', async () => {
  const p = await seeded();
  const jobs: PendingJob[] = [];
  const s = (await mod()).createJoin(p, { schedule: (j) => jobs.push(j) });
  await s.join(one('new', 900, 'right onto East Union'), one('prev', 100, 'left onto Maple'));
  await createDeleteRunner({ db: p.db, removeMedia: async () => 0, forgetRecalls: () => {} })(jobs[0].spec);
  const [prev] = await p.db.getMomentsByIds(['prev']);
  assert.deepEqual(prev.pieces.map((x) => [x.id, x.moment_id, x.t]), [['prev', 'prev', 100], ['new', 'prev', 900]]);
  assert.deepEqual([prev.t, prev.lat, prev.lon], [100, 41.8, -71.4], 'the previous moment is never edited');
  assert.equal((await p.db.getMomentsByIds(['new'])).length, 0, 'the emptied entry is gone');
});
