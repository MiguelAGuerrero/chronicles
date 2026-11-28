/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import type { TracePoint, Walk } from '../../types';
import { fakePorts, type FakePorts } from '../fakes';

// A walk left running (specs/forgotten-stop, G16; decision 0272), the shells over `fakePorts()`: a kept walk's quiet end
// read and moved back by the walker's tap in its More (⋯), read again up to its end, its readings kept; nothing notified;
// and every reader of a finished walk's trace reading it up to its end.
const shellOf = async (p: FakePorts, deps: Partial<{ snap: (w: Walk) => Promise<unknown>; rebuildLine: (id: string) => Promise<unknown>; changed: () => void }> = {}) =>
  (await import('../../quietEnd/shell')).createQuietEnd(p, {
    snap: deps.snap ?? (async () => {}),
    rebuildLine: deps.rebuildLine ?? (async () => {}),
    changed: deps.changed ?? (() => {}),
  });

const T0 = Date.UTC(2026, 10, 26, 1, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const M_LON = 1 / 82_900;
const fix = (t: number, east: number, accuracy = 6): TracePoint => ({
  walk_id: 'w', t, lon: -71.4 + east * M_LON, lat: 41.82, accuracy_m: accuracy, speed: null, course: null,
});
// Ten minutes east along one street, a fix every 5 s; then, the next day, five minutes standing 3 km on.
const walked = Array.from({ length: 121 }, (_, i) => fix(T0 + i * 5000, i * 6.5));
const corner = walked[walked.length - 1];
const home = Array.from({ length: 301 }, (_, k) => fix(corner.t + 20 * HOUR + k * 1000, 3200 + ((k * 7) % 11) - 5, 12));
const stoppedAt = home[home.length - 1].t + 5000;

async function keptWhole(p: FakePorts, endedAt = stoppedAt) {
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: endedAt, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' });
  await p.db.appendPoints([...walked, ...home]);
}

test('QE7: a kept walk quiet 30 min or more at its end has a point; End it moves its end back there, snaps it again, rebuilds its line and says it changed', async () => {
  const p = fakePorts({ now: stoppedAt + HOUR });
  await keptWhole(p);
  const calls: string[] = [];
  const q = await shellOf(p, {
    snap: async (w) => void calls.push(`snap ${w.ended_at}`),
    rebuildLine: async (id) => void calls.push(`line ${id}`),
    changed: () => void calls.push('changed'),
  });
  const at = await q.at('w');
  assert.ok(at != null && Math.abs(at - corner.t) <= MIN, 'the point is the last corner');
  await q.endAt('w', at);
  assert.equal((await p.db.getWalk('w'))?.ended_at, at, 'the walk\'s end is moved back');
  assert.deepEqual(calls, [`snap ${at}`, 'line w', 'changed'], 'read again from the trace, never patched');
  assert.equal(await q.at('w'), null, 'after it, no point: the row is gone');
});

test('QE7: End it moves an end only back, to the walk\'s own point read again, and never on an open walk', async () => {
  const p = fakePorts({ now: stoppedAt + HOUR });
  await keptWhole(p);
  const q = await shellOf(p);
  const at = (await q.at('w'))!;
  await assert.rejects(q.endAt('w', at - 10 * MIN), 'no other time');
  assert.equal((await p.db.getWalk('w'))?.ended_at, stoppedAt);
  await p.db.updateWalk('w', { open: true, ended_at: null });
  await assert.rejects(q.endAt('w', at), 'not an open walk');
});

test('QE3: a walk still open reads its quiet up to now; a kept walk up to its own end', async () => {
  const p = fakePorts({ now: corner.t + 29 * MIN });
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: null, title: null, epilogue: null, open: true, area: null, snapped_build: null });
  await p.db.appendPoints(walked);
  const q = await shellOf(p);
  assert.equal(await q.at('w'), null, '29 minutes: no ask');
  p.clock.set(corner.t + 31 * MIN);
  assert.ok((await q.at('w')) != null, '31 minutes: the ask');
});

test('QE8: no reading is deleted: after an end moved back, Share GPS log still holds the tail', async () => {
  const p = fakePorts({ now: stoppedAt + HOUR });
  await keptWhole(p);
  const q = await shellOf(p);
  await q.endAt('w', (await q.at('w'))!);
  assert.equal((await p.db.getPoints('w')).length, walked.length + home.length, 'every reading stored');
  const { createWalkLog } = await import('../../shareLog/shell');
  const text = await createWalkLog(p, () => 'test').walkLogText('w', T0);
  const lines = text.split('\n').filter((l) => /^\s*\d/.test(l));
  assert.ok(lines.length >= walked.length + home.length, `the log holds the tail too (${lines.length} lines)`);
});

test('QE8: SNAP_RULES is bumped so kept walks are read again', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'tiles.ts'), 'utf8');
  assert.match(src, /const SNAP_RULES = '10';/);
});

test('QE9: nothing is notified and nothing ends a walk by itself: reading a point writes nothing', async () => {
  const p = fakePorts({ now: stoppedAt + HOUR });
  await keptWhole(p);
  const q = await shellOf(p);
  p.log.clear?.();
  const before = p.log.effects().length;
  await q.at('w');
  const after = p.log.effects().slice(before);
  assert.equal(after.filter((e) => /^notifier\./.test(e) || /updateWalk|endPause/.test(e)).length, 0, after.join(', '));
  assert.equal((await p.db.getWalk('w'))?.ended_at, stoppedAt);
});

test('QE5: Where I\'ve been builds a kept walk\'s line up to its end', async () => {
  const p = fakePorts();
  // Ended at the corner; the next day, a stretch walked 3 km on, kept in storage after the end.
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: corner.t, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' });
  await p.db.appendPoints([...walked, ...walked.map((f) => ({ ...f, t: f.t + 20 * HOUR, lon: f.lon + 3000 * M_LON }))]);
  const { createPastLines } = await import('../../pastLines/shell');
  const line = await createPastLines(p).build('w');
  assert.ok(line);
  const east = Math.max(...line.runs.flat().map((x) => x[0]));
  assert.ok(east < -71.4 + 1000 * M_LON, `the line stops at the corner, not 3 km on (${((east + 71.4) / M_LON).toFixed(0)} m east)`);
});

test('QE5: the empty-walk drop reads a walk up to its end', async () => {
  const p = fakePorts();
  // A minute standing before its end, then ten minutes walked after it, an hour on: what came after is not the walk.
  const stood = Array.from({ length: 13 }, (_, i) => fix(T0 + i * 5000, (i % 2) * 0.5));
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: T0 + MIN, title: null, epilogue: null, open: false, area: null, snapped_build: null });
  await p.db.appendPoints([...stood, ...walked.map((f) => ({ ...f, t: f.t + HOUR }))]);
  const { createDropEmpty } = await import('../../emptyWalk/shell');
  const jobs: unknown[] = [];
  assert.equal(await createDropEmpty(p, { schedule: (j) => void jobs.push(j) })('w'), true, 'standing up to its end: empty, dropped');
});

/** Every `getPoints(` outside the stores and the tests: the trace's readers, by file. */
function readers(): string[] {
  const root = join(__dirname, '..', '..', '..');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) {
        if (name === '__tests__' || name === 'db') continue;
        walk(f);
      } else if (/\.tsx?$/.test(name) && readFileSync(f, 'utf8').includes('getPoints(')) out.push(relative(root, f));
    }
  };
  walk(root);
  return out.sort();
}

test('QE5: every reader of a finished walk\'s trace reads it up to its end; only Share GPS log, the export bundle and the backup read it whole', () => {
  // Up to the end (`untilEnd`): the replay and the day, the summary, streets, areas and moments' places, Where I've been,
  // Plan an outing's "visited on foot", the empty-walk drop, a piece split out of its moment.
  const UNTIL_END = ['lib/summary.ts', 'lib/finish.ts', 'lib/pastLines/shell.ts', 'lib/outing/app.ts', 'lib/emptyWalk/shell.ts', 'lib/split/shell.ts', 'lib/quietEnd/shell.ts'];
  // Whole: every reading kept (QE8; the trace is truth).
  const WHOLE = ['lib/shareLog/shell.ts', 'lib/export/bundle/shell.ts', 'lib/backup/shell.ts'];
  // The walk still recording, which has no end: the live trace, navigation's route, the planner's last fix.
  const OPEN = ['lib/useLiveTrace.ts', 'lib/nav/useNavigation.ts', 'lib/walkPlanner/app.ts'];
  const found = readers();
  assert.deepEqual(found, [...UNTIL_END, ...WHOLE, ...OPEN].sort(), 'a new reader of the trace is named here, with its class');
  const src = (f: string) => readFileSync(join(__dirname, '..', '..', '..', f), 'utf8');
  for (const f of UNTIL_END) assert.match(src(f), /untilEnd\(/, `${f} reads up to the walk's end`);
  for (const f of WHOLE) assert.doesNotMatch(src(f), /untilEnd\(/, `${f} keeps every reading`);
  for (const f of OPEN) assert.match(src(f), /getOpenWalk|walk\.open|openWalk|walkId/, `${f} reads the open walk`);
});

test('forgotten-stop steward 1: an outing reads a walk ended where it went quiet up to its end', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'outing', 'app.ts'), 'utf8');
  assert.match(src, /readTrace\(withoutPauses\(untilEnd\(points, walk\.ended_at\), pauses\)/);
});

test('QE5: the replay and the snap read a walk up to its end', () => {
  const src = (f: string) => readFileSync(join(__dirname, '..', '..', f), 'utf8');
  assert.match(src('summary.ts'), /const points = untilEnd\(await db\.getPoints\(walkId\), walk\.ended_at\);/);
  assert.match(src('finish.ts'), /withoutPauses\(untilEnd\(await db\.getPoints\(walk\.id\), walk\.ended_at\), pauses\)/);
});

test('forgotten-stop audit 6: a walk ended at its Resume keeps its pause and is never dropped', async () => {
  const p = fakePorts();
  // Standing a minute, paused, resumed, left: the quiet point is the Resume, and End it ends the walk there.
  const stood = Array.from({ length: 13 }, (_, i) => fix(T0 + i * 5000, (i % 2) * 0.5));
  const resume = T0 + 3 * MIN;
  await p.db.createWalk({ id: 'w', started_at: T0, ended_at: resume, title: null, epilogue: null, open: false, area: null, snapped_build: null });
  await p.db.appendPoints(stood);
  await p.db.startPause('w', T0 + 2 * MIN);
  await p.db.endPause('w', resume);
  const { createDropEmpty } = await import('../../emptyWalk/shell');
  const drop = createDropEmpty(p, { schedule: () => {} }) as (id: string, o?: { heldAt?: number }) => Promise<boolean>;
  assert.equal(await drop('w', { heldAt: resume + 20 * HOUR }), false, 'a pause before the hold is kept: the walk stays');
});

test('forgotten-stop audit 2: the quiet read takes the walk\'s kept gaps as walked', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'quietEnd', 'shell.ts'), 'utf8');
  assert.match(src, /getGapDecisions\(/, 'reads the gaps the walker kept, never the network');
  assert.match(src, /withFilled\(/);
});

test('forgotten-stop audit 12: the More\'s End it row wears no glyph another control uses for Locate', () => {
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'WalkActions.tsx'), 'utf8');
  const row = src.slice(src.indexOf('testID="action-quiet-end"'), src.indexOf('{QUIET_ROW}'));
  assert.match(row, /<Icon name="radio-button-on-outline"/, 'a ringed dot, as drawn');
  assert.doesNotMatch(row, /locate-outline/);
});
