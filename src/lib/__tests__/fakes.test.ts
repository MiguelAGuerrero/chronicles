import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RecorderError } from '../recorder/types';
import { fakePorts } from './fakes';

// The fakes are the shell tests' ground: these pin how they behave.

test('one log keeps the order of calls across every port; effects leave reads out', async () => {
  const p = fakePorts();
  await p.db.getOpenWalk();
  await p.db.setMeta('k', 'v');
  await p.recorder.stop();
  p.recorder.isRecording();
  await p.notifier.walkEnded('w');
  assert.deepEqual(p.log.calls(), ['db.getOpenWalk', 'db.setMeta', 'recorder.stop', 'recorder.isRecording', 'notifier.walkEnded']);
  assert.deepEqual(p.log.effects(), ['db.setMeta', 'recorder.stop', 'notifier.walkEnded']);
  assert.deepEqual(p.log.effects('db.'), ['db.setMeta']);
  assert.deepEqual(p.log.argsOf('db.setMeta'), [['k', 'v']]);
});

test('failNext fails the next call only, with the given error, and changes nothing', async () => {
  const p = fakePorts();
  p.db.failNext('setMeta');
  await assert.rejects(p.db.setMeta('k', 'v'), /db\.setMeta failed/);
  assert.equal(await p.db.getMeta('k'), null);
  await p.db.setMeta('k', 'v');
  assert.equal(await p.db.getMeta('k'), 'v');

  p.recorder.failNext('start', new RecorderError('Location is off', true));
  await assert.rejects(p.recorder.start('w'), (e: unknown) => e instanceof RecorderError && e.openSettings);
  assert.equal(p.recorder.isRecording(), false);
  assert.deepEqual(p.log.entries.filter((e) => e.failed).map((e) => e.call), ['db.setMeta', 'recorder.start']);
});

test('queued failures fail that many calls', async () => {
  const p = fakePorts();
  p.notifier.failNext('ask');
  p.notifier.failNext('ask');
  await assert.rejects(p.notifier.ask());
  await assert.rejects(p.notifier.ask());
  await p.notifier.ask();
});

test('a sync method failed on cue throws', () => {
  const p = fakePorts();
  p.recorder.failNext('isRecording');
  assert.throws(() => p.recorder.isRecording());
});

test('the recorder records the walk it is started for, reports status, and delivers emitted fixes', async () => {
  const p = fakePorts({ background: false });
  const statuses: string[] = [];
  const fixes: number[] = [];
  p.recorder.subscribeStatus((s) => statuses.push(s.kind));
  const off = p.recorder.subscribe((fix) => fixes.push(fix.t));
  assert.equal(p.recorder.capabilities.background, false);
  p.recorder.startResult = { warning: 'Approximate location only' };
  assert.deepEqual(await p.recorder.start('w1'), { warning: 'Approximate location only' });
  assert.equal(p.recorder.walkId, 'w1');
  p.recorder.emit({ walk_id: 'w1', t: 1, lat: 0, lon: 0, accuracy_m: 5, speed: 1, course: null });
  off();
  p.recorder.emit({ walk_id: 'w1', t: 2, lat: 0, lon: 0, accuracy_m: 5, speed: 1, course: null });
  await p.recorder.stop();
  assert.deepEqual(fixes, [1]);
  assert.deepEqual(statuses, ['waiting', 'recording', 'recording', 'idle']);
  assert.equal(p.recorder.isRecording(), false);
});

test('the clock moves only when told; ids count up', () => {
  const p = fakePorts({ now: 1000 });
  assert.equal(p.clock.now(), 1000);
  p.clock.advance(500);
  assert.equal(p.clock.now(), 1500);
  p.clock.set(42);
  assert.equal(p.clock.now(), 42);
  assert.deepEqual([p.newId(), p.newId()], ['id-1', 'id-2']);
});

test('each fakePorts() starts empty', async () => {
  const a = fakePorts();
  await a.db.setMeta('k', 'v');
  const b = fakePorts();
  assert.equal(await b.db.getMeta('k'), null);
  assert.deepEqual(b.log.calls(), ['db.getMeta']);
});
