/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { readTrace } from '../../rides';
import { EMPTY_WALK_M, isEmptyWalk, pausesKept } from '../../emptyWalk/core';
import { createDropEmpty, type DropEmptyDeps } from '../../emptyWalk/shell';
import { toastText } from '../../deletion/core';
import { createPending, type PendingJob } from '../../deletion/pending';
import type { CaptureKind, LngLat, TracePoint } from '../../types';
import { fakePorts } from '../fakes';

// Empty walk (EW1-EW12, decisions of Nov 16): stopping a walk with nothing in it drops it, with Undo.

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const T0 = 1_700_000_000_000;
const fix = (t: number, x: number, y: number, accuracy: number | null = 5): TracePoint => ({
  walk_id: 'w', t: T0 + t * 1000, lon: O[0] + x * mLon, lat: O[1] + y * mLat, accuracy_m: accuracy, speed: null, course: null,
});
/** Fixes standing at one spot, a metre of wobble, one every 5 s for `seconds`. */
const standing = (seconds: number, acc: number | null = 5): TracePoint[] =>
  Array.from({ length: Math.floor(seconds / 5) + 1 }, (_, i) => fix(i * 5, (i % 2) * 0.5, (i % 3) * 0.4, acc));
/** A walk east at 1.4 m/s for `metres`. */
const strolling = (metres: number): TracePoint[] => Array.from({ length: Math.ceil(metres / 7) + 1 }, (_, i) => fix(i * 5, Math.min(metres, i * 7), 0));
const read = (points: TracePoint[]) => readTrace(points, T0);
const base = { moments: 0, pauses: 0, stills: 0, fills: 0 };
const empty = (points: TracePoint[], over: Partial<typeof base> = {}) => isEmptyWalk({ ...base, ...over, trace: read(points) });

test('EW2: isEmptyWalk is true only for no moment, pause, still or gap, and read fixes all within the threshold', () => {
  assert.equal(EMPTY_WALK_M, 15);
  assert.equal(empty(standing(120)), true);
  assert.equal(empty(standing(120), { pauses: 1 }), false);
  assert.equal(empty(standing(120), { stills: 1 }), false);
  assert.equal(empty(standing(120), { fills: 1 }), false);
  assert.equal(empty(standing(120), { moments: 1 }), false);
  // The spread, not time, decides: two fixes 16 m apart are movement, two 10 m apart are not.
  assert.equal(empty([fix(0, 0, 0), fix(5, 16, 0)]), false);
  assert.equal(empty([fix(0, 0, 0), fix(5, 10, 0)]), true);
  assert.ok(distanceM(O, [O[0] + 10 * mLon, O[1]]) < EMPTY_WALK_M);
});

test('EW3: any moment, a photo, video, memo or note, keeps the walk however short', () => {
  for (const kind of ['photo', 'video', 'voice', 'text'] as CaptureKind[]) {
    assert.ok(kind);
    assert.equal(empty(standing(10), { moments: 1 }), false, kind);
  }
});

test('EW4: movement past the threshold keeps the walk, and a 40 m courtyard stroll is kept', () => {
  assert.equal(empty(strolling(40)), false);
  assert.equal(empty(strolling(100)), false);
});

test('EW5: a pause, a still or a gap decision keeps the walk, even with no movement', () => {
  for (const over of [{ pauses: 1 }, { stills: 1 }, { fills: 1 }]) assert.equal(empty(standing(60), over), false);
});

test('EW5 (decision 0220): the pause still open at Stop is the way to Stop, not evidence; a pause resumed from is', () => {
  const end = T0 + 60_000;
  // stopWalk ends the open pause at the walk's end: that one is not counted.
  assert.equal(pausesKept([{ walk_id: 'w', started_at: T0 + 50_000, ended_at: end }], end), 0);
  assert.equal(pausesKept([{ walk_id: 'w', started_at: T0 + 10_000, ended_at: T0 + 20_000 }, { walk_id: 'w', started_at: T0 + 50_000, ended_at: end }], end), 1);
  // A pause with no end, read before the stop closed it, is open at Stop too.
  assert.equal(pausesKept([{ walk_id: 'w', started_at: T0 + 50_000, ended_at: null }], end), 0);
});

test('EW6: a walk with no read fixes, none stored or all gated out for accuracy, is kept', () => {
  assert.equal(empty([]), false);
  assert.equal(empty(standing(60, 200)), false);
  assert.equal(empty([fix(-10 * 60, 0, 0), fix(-10 * 60 + 5, 0, 0)]), false);
});

test('EW11: a cold-start jump in the first fix does not by itself decide empty versus kept', () => {
  const jumpy = [fix(0, 60, 40), ...standing(120).map((p) => ({ ...p, t: p.t + 5000 }))];
  assert.equal(empty(jumpy), true);
  assert.equal(empty(standing(120)), true);
});

test('EW12: time does not decide: a long stand is dropped, a short walk with movement is kept', () => {
  assert.equal(empty(standing(3 * 3600)), true);
  assert.equal(empty(strolling(60).slice(0, 12)), false);
});

// The shell: after the stop is written, it reads the walk's rows and schedules the drop.
async function setup(trace: TracePoint[], over: { moments?: number; pauses?: boolean; failRead?: boolean } = {}) {
  const p = fakePorts();
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: T0 + 60_000, title: null, epilogue: null, open: false, area: null, snapped_build: null });
  await p.db.appendPoints(trace);
  if (over.pauses) await p.db.startPause('w', T0 + 1000);
  for (let i = 0; i < (over.moments ?? 0); i++) {
    await p.db.addMoment({ id: `m${i}`, walk_id: 'w', t: T0 + 1000, lat: null, lon: null, segment_id: null, pieces: [{ id: `m${i}`, moment_id: `m${i}`, t: T0 + 1000, kind: 'text', file_path: null, body: 'x' }] });
  }
  if (over.failRead) p.db.failNext('getPoints', new Error('read failed'));
  const scheduled: PendingJob[] = [];
  const deps: DropEmptyDeps = { schedule: (job) => void scheduled.push(job) };
  return { p, scheduled, drop: createDropEmpty(p, deps) };
}

test('EW1: stopping a walk with no moments, no street and no movement drops it, and reports it dropped', async () => {
  const { drop, scheduled } = await setup(standing(60));
  assert.equal(await drop('w'), true);
  assert.equal(scheduled.length, 1);
  assert.deepEqual(scheduled[0].spec, { type: 'walk', walkId: 'w' });
  assert.equal(scheduled[0].kind, 'walk');
});

test('EW1: a walk with a moment is not dropped and nothing is scheduled', async () => {
  const { drop, scheduled } = await setup(standing(60), { moments: 1 });
  assert.equal(await drop('w'), false);
  assert.equal(scheduled.length, 0);
});

test('EW5 (decision 0220): a walk paused only to reach Stop, standing still, is dropped; one resumed from a pause is kept', async () => {
  const end = T0 + 60_000;
  const paused = await setup(standing(50));
  await paused.p.db.startPause('w', T0 + 55_000);
  await paused.p.db.endPause('w', end);
  assert.equal(await paused.drop('w'), true);
  const resumed = await setup(standing(50));
  await resumed.p.db.startPause('w', T0 + 10_000);
  await resumed.p.db.endPause('w', T0 + 20_000);
  await resumed.p.db.startPause('w', T0 + 55_000);
  await resumed.p.db.endPause('w', end);
  assert.equal(await resumed.drop('w'), false);
});

test('tend tabs T35: a walk stopped while a save is under way is never dropped as empty (the owner, Nov 18)', async () => {
  const { p, scheduled } = await setup(standing(60));
  const busy = createDropEmpty(p, { schedule: (job) => void scheduled.push(job), underWay: () => true });
  assert.equal(await busy('w'), false, 'a memo or photo still being saved keeps the walk: uncertain means kept');
  assert.equal(scheduled.length, 0);
  // A save begun while the walk's rows are read keeps it too.
  let reads = 0;
  const during = createDropEmpty(p, { schedule: (job) => void scheduled.push(job), underWay: () => reads++ > 0 });
  assert.equal(await during('w'), false, 'under way by the time the reads end');
  assert.equal(scheduled.length, 0);
  const idle = createDropEmpty(p, { schedule: (job) => void scheduled.push(job), underWay: () => false });
  assert.equal(await idle('w'), true, 'with nothing under way the empty walk is dropped as before');
});

test('EW10: a failure to read the walk keeps it and plays the replay', async () => {
  const { drop, scheduled } = await setup(standing(60), { failRead: true });
  assert.equal(await drop('w'), false);
  assert.equal(scheduled.length, 0);
});

test('EW9: a dropped walk is volatile: a kill leaves it in place, nothing is saved for the next launch', () => {
  const saved: PendingJob[][] = [];
  const pending = createPending({ setTimer: () => 0, clearTimer: () => {}, run: async () => {}, save: (jobs) => void saved.push(jobs) });
  pending.schedule({ kind: 'walk', ids: ['w'], spec: { type: 'walk', walkId: 'w' }, volatile: true });
  assert.ok(saved.every((jobs) => jobs.length === 0), 'a volatile drop is never handed to save');
  assert.deepEqual([...pending.hidden()], ['w']);
  pending.undo();
  assert.deepEqual([...pending.hidden()], []);
});

test('EW9: Undo brings the walk back whole: nothing was stored', async () => {
  const ran: unknown[] = [];
  const pending = createPending({ setTimer: () => 0, clearTimer: () => {}, run: async (s) => void ran.push(s) });
  pending.schedule({ kind: 'walk', ids: ['w'], spec: { type: 'walk', walkId: 'w' }, volatile: true });
  pending.undo();
  await pending.flush();
  assert.equal(ran.length, 0);
});

test('EW8: the route change Stop causes does not store the drop; a later one does', async () => {
  const ran: unknown[] = [];
  const pending = createPending({ setTimer: () => 0, clearTimer: () => {}, run: async (s) => void ran.push(s) });
  pending.schedule({ kind: 'walk', ids: ['w'], spec: { type: 'walk', walkId: 'w' }, volatile: true });
  pending.holdNextFlush();
  await pending.flush();
  assert.equal(ran.length, 0, 'the first flush after the hold is skipped');
  assert.equal(pending.state().pending?.kind, 'walk');
  await pending.flush();
  assert.equal(ran.length, 1, 'the next route change stores it');
});

test('EW8: the notice says "Walk not kept." and no judgement, count or digit', () => {
  const text = toastText('walk', undefined, true);
  assert.equal(text, 'Walk not kept.');
  assert.doesNotMatch(text, /\d|nothing|empty|wasted/i);
  assert.equal(toastText('walk'), 'Walk deleted');
});

test('EW7: both stop paths reach one decision through endWalk; neither view holds the rule', () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', '..', '..', '..', f), 'utf8');
  for (const f of ['src/app/walk.tsx', 'src/components/RecordingBar.tsx']) {
    const src = read(f);
    assert.match(src, /endWalk\(/, `${f} stops through endWalk`);
    assert.doesNotMatch(src, /isEmptyWalk|emptyWalk\/core/, `${f} does not hold the rule`);
    assert.doesNotMatch(src, /\bstopWalk\(/, `${f} no longer calls stopWalk directly`);
  }
});
