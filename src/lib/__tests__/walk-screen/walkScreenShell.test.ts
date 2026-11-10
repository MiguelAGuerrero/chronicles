import assert from 'node:assert/strict';
import test from 'node:test';
import type { StreetSegment } from '../../types';
import { fakePorts } from '../fakes';

// The walk screen's effects (WS6), moved from walk.tsx into lib/walkScreen and run over fakePorts().
// Test first: a computed path, so the typecheck passes before the shell exists.
const SHELL = '../../walkScreen/shell';
const load = async () => (await import(SHELL)).createWalkScreen;

const seg = (id: string, name: string, line: [number, number][]): StreetSegment =>
  ({ id, name, kind: 'residential', geometry: [line], build: 'b1' }) as unknown as StreetSegment;

test('WS6: streets around: writes streets and places, then reads the fog', { todo: 'test first' }, async () => {
  const p = fakePorts();
  const ws = (await load())(p);
  const here: [number, number] = [8.54, 47.37];
  await p.db.putSegments([seg('far', 'Far', [[8.6, 47.4], [8.61, 47.41]]), seg('near', 'Near', [[8.5401, 47.3701], [8.5405, 47.3705]])]);
  const out = await ws.streetsAround({ at: here, build: 'b1', collect: async () => ({ complete: true, roads: [], names: new Map(), pois: [] }) as never, trace: [] });
  assert.deepEqual(out.fog.map((s: StreetSegment) => s.id), ['near'], 'within 1,000 m, not credited, not along the trace');
  assert.equal(out.complete, true);
});

test('WS6: landings of the current rules only', { todo: 'test first' }, async () => {
  const p = fakePorts();
  const ws = (await load())(p);
  assert.deepEqual(await ws.landings(), []);
});

test('WS6: explored marked the first time only', { todo: 'test first' }, async () => {
  const p = fakePorts({ now: 1000 });
  const ws = (await load())(p);
  assert.equal(await ws.exploring('w1'), false);
  await ws.setExploring('w1', true, 1000);
  await ws.setExploring('w1', false, 2000);
  await ws.setExploring('w1', true, 3000);
  assert.equal(await ws.exploring('w1'), true);
  assert.equal(await p.db.getMeta('explored:w1'), '1000');
});

test('WS6: the dead-zone nudge once a walk', { todo: 'test first' }, async () => {
  const ws = (await load())(fakePorts());
  assert.equal(await ws.nudgeSpent('w1'), false);
  await ws.spendNudge('w1');
  assert.equal(await ws.nudgeSpent('w1'), true);
  assert.equal(await ws.nudgeSpent('w2'), false);
});

test('WS6: the hint once', { todo: 'test first' }, async () => {
  const ws = (await load())(fakePorts());
  assert.equal(await ws.hintDue(), true);
  assert.equal(await ws.hintDue(), false);
});

test("WS6: the recorder's status passes through", { todo: 'test first' }, async () => {
  const p = fakePorts({ background: false });
  const ws = (await load())(p);
  const seen: string[] = [];
  const off = ws.subscribeStatus((s: { kind: string }) => seen.push(s.kind));
  p.recorder.emitStatus({ kind: 'error', message: 'denied' });
  off();
  p.recorder.emitStatus({ kind: 'recording' });
  assert.deepEqual(seen, ['error']);
  assert.equal(ws.backgroundCapable(), false);
});

test('WS6: moments near a spot', { todo: 'test first' }, async () => {
  const ws = (await load())(fakePorts());
  assert.deepEqual(await ws.momentsNear([8.54, 47.37]), []);
});
