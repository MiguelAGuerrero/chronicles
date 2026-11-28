/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDropEmpty } from '../../emptyWalk/shell';
import { createMemoGate } from '../../memoGate';
import { createStopEnd } from '../../unsaved/stopEnd/shell';
import { createUnsaved } from '../../unsaved/shell';
import type { PendingJob } from '../../deletion/pending';
import type { TracePoint } from '../../types';
import { fakePorts } from '../fakes';

// Both Stops end the same way once their waits are over (tend tabs audit 42, decision 0227; `lib/unsaved/stopEnd`, in the
// captures feature's own folder): the held captures read, in
// the same tick anything under way pins the walk against the empty drop, then the walk ends and only what was warned
// of is let go.

const T0 = 1_700_000_000_000;
/** Fixes standing at one spot for a minute: a walk the empty drop would take. */
const standing: TracePoint[] = Array.from({ length: 13 }, (_, i) => ({
  walk_id: 'w', t: T0 + i * 5000, lon: -71.4 + (i % 2) * 0.000005, lat: 41.812, accuracy_m: 5, speed: null, course: null,
}));
const tick = () => new Promise((r) => setTimeout(r, 0));

async function world() {
  const p = fakePorts();
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: null, title: null, epilogue: null, open: true, area: null, snapped_build: null });
  await p.db.appendPoints(standing);
  const gate = createMemoGate();
  let n = 0;
  const unsaved = createUnsaved({ dropTemp: () => {}, removeMedia: async () => 0, newId: () => `u${++n}` });
  const scheduled: PendingJob[] = [];
  const dropEmpty = createDropEmpty(p, { schedule: (job) => void scheduled.push(job), underWay: () => gate.underWay() });
  return { p, gate, unsaved, scheduled, dropEmpty };
}

test('tend tabs audit 42: a save failing during stopWalk leaves the walk kept, the memo held under it, and its Retry lands in the walk', async () => {
  const { p, gate, unsaved, scheduled, dropEmpty } = await world();
  // A memo from another path still saving as Stop goes ahead; it fails while the walk's end is being written.
  let fail!: () => void;
  const save = new Promise<void>((_, rej) => (fail = () => rej(new Error('disk full')))).catch((e) => {
    // The path's own failure: held under its walk, which is not known ended yet.
    unsaved.hold({ kind: 'voice', walkId: unsaved.hasEnded('w') ? null : 'w', stamp: { t: T0 }, uri: 'blob:m', ext: 'webm', ms: 3000, path: null, outOfSpace: false, said: false });
    throw e;
  });
  gate.track(save);
  const endWalk = async (walkId: string) => {
    await p.db.updateWalk(walkId, { ended_at: T0 + 60_000, open: false });
    fail();
    await tick();
    await tick();
    assert.equal(gate.stopUnder([]).go, true, 'the save has ended before the drop reads the walk');
    return { dropped: await dropEmpty(walkId) };
  };
  const stopEnd = createStopEnd({ gate, unsaved, endWalk });
  const r = await stopEnd('w', { leaves: false, warned: [] });
  assert.deepEqual(r, { dropped: false }, 'the walk is kept: a save was under way at the stop');
  assert.equal(scheduled.length, 0);
  assert.ok(await p.db.getWalk('w'));
  const held = unsaved.take('memos');
  assert.equal(held.length, 1, 'the memo is still held, not let go unwarned');
  assert.equal(held[0].walkId, 'w');
  // Its Retry keeps it into its own walk, which stands.
  await p.db.addMoment({ id: 'm1', walk_id: held[0].walkId, t: T0, lat: null, lon: null, segment_id: null, pieces: [{ id: 'm1', moment_id: 'm1', t: T0, kind: 'voice', file_path: 'walks/w/m1.webm', body: '3000' }] });
  assert.equal((await p.db.getMoments('w')).length, 1);
  assert.equal(gate.underWay(), false, 'the pin is released once the drop is decided');
});

test('tend tabs audit 42: the held captures warn first; the next stop lets go only those it warned of', async () => {
  const { gate, unsaved } = await world();
  const a = unsaved.hold({ kind: 'photo', walkId: 'w', stamp: { t: T0 }, uri: 'blob:a', ext: 'jpg', ms: null, path: null, outOfSpace: false, said: true });
  const order: string[] = [];
  const stopEnd = createStopEnd({ gate, unsaved, endWalk: async () => { order.push('end'); return { dropped: false }; } });
  const first = await stopEnd('w', { leaves: true, warned: [], going: () => order.push('going') });
  assert.ok('warn' in first && first.warn.map((x) => x.id).join() === a, 'warned of the held photo');
  assert.equal(order.length, 0, 'nothing ends on a warning');
  const second = await stopEnd('w', { leaves: true, warned: [a], going: () => order.push('going') });
  assert.deepEqual(second, { dropped: false });
  assert.deepEqual(order, ['going', 'end'] as string[], 'the view hears it is going before the walk ends');
  assert.equal(unsaved.heldFor('w').length, 0);
});

// A walk left running (specs/forgotten-stop, decision 0272): both Stops ask once on a walk gone quiet, before anything
// ends; Keep it all is today's Stop exactly; End it ends the walk at the point.
async function quietWorld(point: number | null) {
  const { p, gate, unsaved, dropEmpty } = await world();
  const ends: { endAt?: number }[] = [];
  const endWalk = async (walkId: string, o: { leaves: boolean; endAt?: number }) => {
    ends.push(o.endAt == null ? {} : { endAt: o.endAt });
    await p.db.updateWalk(walkId, { ended_at: o.endAt ?? T0 + 20 * 3_600_000, open: false });
    return { dropped: await dropEmpty(walkId) };
  };
  const asked: string[] = [];
  const stopEnd = createStopEnd({ gate, unsaved, endWalk, quietAt: async (id) => (asked.push(id), point) });
  return { p, unsaved, stopEnd, ends, asked };
}

test('QE3: a Stop on a walk gone quiet returns its point and ends nothing; with no point it ends as today', { todo: 'test first' }, async () => {
  const quiet = await quietWorld(T0 + 30_000);
  assert.deepEqual(await quiet.stopEnd('w', { leaves: true, warned: [] }), { quiet: T0 + 30_000 });
  assert.equal(quiet.ends.length, 0, 'nothing ended');
  assert.equal((await quiet.p.db.getWalk('w'))?.open, true, 'the walk is still open');
  const none = await quietWorld(null);
  const r = await none.stopEnd('w', { leaves: true, warned: [] });
  assert.ok('dropped' in r, 'ended as today');
  assert.deepEqual(none.ends, [{}]);
});

test('QE3: a held capture is warned of first, before the quiet ask (UN5)', { todo: 'test first' }, async () => {
  const quiet = await quietWorld(T0 + 30_000);
  quiet.unsaved.hold({ kind: 'photo', walkId: 'w', stamp: { t: T0 }, uri: 'blob:p', ext: 'jpg', ms: 0, path: null, outOfSpace: false, said: false });
  const r = await quiet.stopEnd('w', { leaves: true, warned: [] });
  assert.ok('warn' in r, 'the warning first');
  assert.equal(quiet.asked.length, 0, 'the point is not read yet');
  // The next hold, past the warning, asks.
  assert.deepEqual(await quiet.stopEnd('w', { leaves: true, warned: 'warn' in r ? r.warn.map((x) => x.id) : [] }), { quiet: T0 + 30_000 });
});

test('QE6: Keep it all is today\'s Stop exactly: the walk ends at the hold, the point not read again', { todo: 'test first' }, async () => {
  const quiet = await quietWorld(T0 + 30_000);
  assert.deepEqual(await quiet.stopEnd('w', { leaves: true, warned: [] }), { quiet: T0 + 30_000 }, 'asked first');
  const r = await quiet.stopEnd('w', { leaves: true, warned: [], quiet: 'keep' });
  assert.ok('dropped' in r);
  assert.deepEqual(quiet.ends, [{}], 'no end time given: the hold\'s');
  assert.equal(quiet.asked.length, 1, 'the answer reads the point no more');
});

test('QE5: End it ends the walk at the point', { todo: 'test first' }, async () => {
  const quiet = await quietWorld(T0 + 30_000);
  await quiet.stopEnd('w', { leaves: true, warned: [], quiet: T0 + 30_000 });
  assert.deepEqual(quiet.ends, [{ endAt: T0 + 30_000 }]);
  assert.equal((await quiet.p.db.getWalk('w'))?.ended_at, T0 + 30_000);
});

test('QE9: a point that cannot be read asks nothing: the Stop goes on as today', { todo: 'test first' }, async () => {
  const { gate, unsaved, dropEmpty, p } = await world();
  const stopEnd = createStopEnd({
    gate, unsaved,
    endWalk: async (walkId) => {
      await p.db.updateWalk(walkId, { ended_at: T0 + 60_000, open: false });
      return { dropped: await dropEmpty(walkId) };
    },
    quietAt: async () => {
      throw new Error('read failed');
    },
  });
  assert.ok('dropped' in (await stopEnd('w', { leaves: false, warned: [] })));
});
