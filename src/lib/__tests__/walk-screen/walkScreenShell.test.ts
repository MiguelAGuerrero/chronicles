import assert from 'node:assert/strict';
import test from 'node:test';
import { createWalkScreen } from '../../walkScreen/shell';
import { at, roads } from '../foxPoint';
import { fakePorts } from '../fakes';

// The walk screen's effects (WS6), moved from walk.tsx into lib/walkScreen and run over fakePorts().
const view = (complete: boolean) => async () => ({ complete, roads, names: [], places: [], pois: [] }) as never;

test('WS6: streets around: writes streets and places, then reads the fog', async () => {
  const p = fakePorts();
  const ws = createWalkScreen(p);
  const out = await ws.streetsAround({ at: at(1, 0.5), build: 'b1', collect: view(true), trace: () => [] });
  assert.deepEqual(p.log.effects('db.').slice(0, 2), ['db.putSegments', 'db.putPlaces'], 'the streets, then the places');
  assert.equal(out.complete, true);
  assert.ok(out.fog.length > 0, 'the streets just read are fog: no walk has credited them');
  assert.deepEqual(out.walked, []);
  // Along the trace: left out of the fog until the walk is credited at stop.
  const along = await ws.streetsAround({ at: at(1, 0.5), build: 'b1', collect: view(true), trace: () => [at(0, 0), at(1, 0), at(2, 0), at(3, 0)], visited: out.visited });
  assert.ok(along.fog.length < out.fog.length, 'a street the trace went down is not fog');
});

test('WS6: streets around: a part-loaded view writes nothing and asks to be read again; an unknown build writes nothing', async () => {
  const p = fakePorts();
  const ws = createWalkScreen(p);
  const part = await ws.streetsAround({ at: at(1, 0.5), build: 'b1', collect: view(false), trace: () => [] });
  assert.equal(part.complete, false);
  await ws.streetsAround({ at: at(1, 0.5), build: 'unknown', collect: view(true), trace: () => [] });
  await ws.streetsAround({ at: at(1, 0.5), build: 'b1', collect: async () => Promise.reject(new Error('gone')), trace: () => [] });
  assert.deepEqual(p.log.effects('db.'), []);
});

test('WS6: landings of the current rules only', async () => {
  const ws = createWalkScreen(fakePorts());
  assert.deepEqual(await ws.landings(), []);
});

test('WS6: explored marked the first time only', async () => {
  const p = fakePorts();
  const ws = createWalkScreen(p);
  assert.equal(await ws.exploring('w1'), false);
  await ws.setExploring('w1', true, 1000);
  await ws.setExploring('w1', false, 2000);
  assert.equal(await ws.exploring('w1'), false);
  await ws.setExploring('w1', true, 3000);
  assert.equal(await ws.exploring('w1'), true);
  assert.equal(await ws.exploring('w2'), false);
  assert.equal(await p.db.getMeta('explored:w1'), '1000');
});

test('WS6: the dead-zone nudge once a walk', async () => {
  const ws = createWalkScreen(fakePorts());
  assert.equal(await ws.nudgeSpent('w1'), false);
  await ws.spendNudge('w1');
  assert.equal(await ws.nudgeSpent('w1'), true);
  assert.equal(await ws.nudgeSpent('w2'), false);
});

test('WS6: the hint once', async () => {
  const ws = createWalkScreen(fakePorts());
  assert.equal(await ws.hintDue(), true);
  assert.equal(await ws.hintDue(), false);
});

test("WS6: the recorder's status passes through", async () => {
  const p = fakePorts({ background: false });
  const ws = createWalkScreen(p);
  const seen: string[] = [];
  const off = ws.subscribeStatus((s) => seen.push(s.kind));
  p.recorder.emitStatus({ kind: 'error', message: 'denied' });
  off();
  p.recorder.emitStatus({ kind: 'recording' });
  assert.deepEqual(seen, ['error']);
  assert.equal(ws.backgroundCapable(), false);
});

test('WS6: moments near a spot', async () => {
  const ws = createWalkScreen(fakePorts());
  assert.deepEqual(await ws.momentsNear(at(0, 0)), []);
});
