import assert from 'node:assert/strict';
import test from 'node:test';
import { cancelLook, endLook, IDLE, isLive, runLook, startLook, type LookIo } from '../../atlas/look';
import type { AreaAnalysis } from '../../landing/analyze';

// tend explore 2: "What's good here?" kept one shared cancelled flag. Cancel A, start B: the flag went back to false, so
// A's read carried on, its line was shown for B's spot, and its end cleared "Looking around…" while B still read.

test('tend explore 2: one look at a time; a second start while one is live is refused', () => {
  const a = startLook(IDLE)!;
  assert.ok(a, 'a look starts when none is live');
  assert.equal(startLook(a.state), null, 'no second look while the first is live');
});

test('tend explore 2: a cancelled look stays stopped when a newer one starts', () => {
  const a = startLook(IDLE)!;
  const afterCancel = cancelLook(a.state);
  assert.equal(isLive(afterCancel, a.token), false, 'cancel stops A');
  const b = startLook(afterCancel)!;
  assert.ok(b, 'B starts after A is cancelled');
  assert.equal(isLive(b.state, a.token), false, 'A is still stopped once B has started: its read ends, and its line is never shown');
  assert.equal(isLive(b.state, b.token), true, 'B is the live look');
});

test('tend explore 2: only the live look ends the look; a stale one leaves the newer one running', () => {
  const a = startLook(IDLE)!;
  const b = startLook(cancelLook(a.state))!;
  assert.equal(endLook(b.state, a.token), b.state, 'A ending changes nothing: B still looks');
  const done = endLook(b.state, b.token);
  assert.equal(isLive(done, b.token), false);
  assert.ok(startLook(done), 'a new look may start once B is done');
});

// tend explore 13: "What's good here?" checked that it was stopped before writing the area but not after. Cancelled while
// `rememberArea` wrote (on a phone the write waits on the SQLite queue), the look still showed and announced its line.

const analysis = { basis: 'density', reason: 'Busiest around Wickenden Street', pockets: [{ name: 'Wickenden Street' }], strips: [], graded: [], landing: null } as unknown as AreaAnalysis;
const io = (over: Partial<LookIo> = {}): LookIo => ({
  read: async () => ({ ok: true, centre: [-71.4, 41.82], analysis, overture: null }),
  tileBuild: async () => 'b1',
  remember: async () => {},
  ...over,
});

test('tend explore 13: a look cancelled while its area is being written says nothing', async () => {
  let stopped = false;
  const end = await runLook(io({ remember: async () => { stopped = true; } }), () => stopped);
  assert.deepEqual(end, { kind: 'stopped' });
});

test('tend explore 13: a look left alone says its line once the area is written', async () => {
  const wrote: string[] = [];
  const end = await runLook(io({ remember: async (_c, _a, build) => { wrote.push(build); } }), () => false);
  assert.deepEqual(wrote, ['b1']);
  assert.deepEqual(end, { kind: 'line', message: 'Busiest around Wickenden Street: Wickenden Street. A best guess from the map.' });
});

test('tend explore 13: stopped during the read or the build, nothing is written; a failed read says it failed', async () => {
  let wrote = 0;
  let stopped = false;
  const w = { remember: async () => { wrote++; } };
  assert.deepEqual(await runLook(io({ ...w, read: async () => { stopped = true; return { ok: false, reason: 'cancelled' }; } }), () => stopped), { kind: 'stopped' });
  stopped = false;
  assert.deepEqual(await runLook(io({ ...w, tileBuild: async () => { stopped = true; return 'b1'; } }), () => stopped), { kind: 'stopped' });
  assert.equal(wrote, 0);
  assert.deepEqual(await runLook(io({ ...w, read: async () => ({ ok: false, reason: 'failed' }) }), () => false), { kind: 'failed' });
  assert.deepEqual(await runLook(io({ ...w, tileBuild: async () => null }), () => false), { kind: 'line', message: 'Busiest around Wickenden Street: Wickenden Street. A best guess from the map.' });
});
