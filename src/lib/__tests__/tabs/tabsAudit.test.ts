/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyPatch, captureBus } from '../../captureBus';
import { createMemoGate } from '../../memoGate';
import { createLatestLoader } from '../../openWalkLoad';
import { createWalkGate } from '../../walkGate';
import type { Capture } from '../../types';

const cap = (id: string, extra: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w1', t: 1, kind: 'photo', file_path: `walks/w1/${id}.jpg`, body: null, segment_id: null, lat: 41.812, lon: -71.4, ...extra,
});
const tick = () => new Promise((r) => setTimeout(r, 0));

test('tabs audit 3: a walk never starts while a memo records; a memo being saved is waited for', async () => {
  const gate = createMemoGate();
  const memo = {};
  assert.equal(await gate.readyToStart(), true, 'no memo: free to start');
  gate.recording(memo, true);
  assert.equal(await gate.readyToStart(), false, 'a memo recording: no start');
  // Leaving the tab saves it: the save is tracked, and the start waits for it rather than refusing.
  let done!: () => void;
  const save = new Promise<void>((r) => (done = r)).then(() => gate.recording(memo, false));
  gate.track(save);
  const ready = gate.readyToStart();
  await tick();
  done();
  assert.equal(await ready, true, 'once the save ends, the start goes ahead');
});

test('tabs audit 3: a save that fails still lets a walk start once the memo is off', async () => {
  const gate = createMemoGate();
  const memo = {};
  gate.recording(memo, true);
  gate.track(Promise.reject(new Error('disk full')).finally(() => gate.recording(memo, false)));
  assert.equal(await gate.readyToStart(), true);
});

test('tabs audit 5: a thumbnail made by another path of the walk reaches the walk screen’s list', () => {
  const other = {};
  const screen = {};
  let list: Capture[] = [cap('p1')];
  const off = captureBus.subscribe('w1', screen, () => {}, (id, patch) => (list = applyPatch(list, id, patch)));
  // The bar's camera made the copy after the photo's news went out, and after the bar itself was gone.
  captureBus.patch('w1', 'p1', { thumb_path: 'walks/w1/p1.thumb.jpg' }, other);
  assert.equal(list[0].thumb_path, 'walks/w1/p1.thumb.jpg');
  // Never sent back to the path that made it, nor to another walk's listeners.
  let mine = 0;
  const offMine = captureBus.subscribe('w1', other, () => {}, () => mine++);
  let elsewhere = 0;
  const offElse = captureBus.subscribe('w2', {}, () => {}, () => elsewhere++);
  captureBus.patch('w1', 'p1', { thumb_path: 'x' }, other);
  assert.equal(mine, 0);
  assert.equal(elsewhere, 0);
  off();
  offMine();
  offElse();
});

test('tabs audit 5: a patch for a capture not listed yet changes nothing (the stored read has it)', () => {
  const list = [cap('p1')];
  assert.equal(applyPatch(list, 'p2', { thumb_path: 'x' }), list);
});

test('tabs audit 9: a failed first read of the open walk is tried again, never settled as "no walk"', async () => {
  const applied: (string | null)[] = [];
  let calls = 0;
  const timers: (() => void)[] = [];
  const loader = createLatestLoader<string | null>({
    read: async () => {
      calls++;
      if (calls === 1) throw new Error('storage not ready');
      return 'walk-1';
    },
    apply: (v) => applied.push(v),
    retryMs: 500,
    schedule: (fn) => {
      timers.push(fn);
      return () => {};
    },
  });
  await loader.load();
  assert.deepEqual(applied, [], 'nothing settled after a failure');
  assert.equal(timers.length, 1, 'a retry is scheduled');
  timers[0]();
  await tick();
  assert.deepEqual(applied, ['walk-1']);
  loader.stop();
});

test('tabs audit 9: overlapping reads of the open walk: the latest call wins', async () => {
  const applied: string[] = [];
  const resolvers: ((v: string) => void)[] = [];
  const loader = createLatestLoader<string>({
    read: () => new Promise<string>((r) => resolvers.push(r)),
    apply: (v) => applied.push(v),
    retryMs: 500,
    schedule: () => () => {},
  });
  const first = loader.load();
  const second = loader.load();
  // The newer read answers first (the walk stopped), then the older one (the walk still open).
  resolvers[1]('stopped');
  await second;
  resolvers[0]('open');
  await first;
  assert.deepEqual(applied, ['stopped'], 'an older read never overwrites a newer one');
  loader.stop();
});

test('tabs audit 9: once stopped, nothing more is applied or retried', async () => {
  const applied: string[] = [];
  let scheduled = 0;
  let resolve!: (v: string) => void;
  const loader = createLatestLoader<string>({
    read: () => new Promise<string>((r) => (resolve = r)),
    apply: (v) => applied.push(v),
    retryMs: 500,
    schedule: () => {
      scheduled++;
      return () => {};
    },
  });
  const p = loader.load();
  loader.stop();
  resolve('late');
  await p;
  assert.deepEqual(applied, []);
  assert.equal(scheduled, 0);
});

test('tabs audit 1: a double tap shows the walk screen once; a later ask, after it went down, shows it again', () => {
  const gate = createWalkGate(2000);
  assert.equal(gate.ask(0), true, 'the first tap goes');
  assert.equal(gate.ask(120), false, 'the second, while the first is on its way, does nothing');
  const down = gate.shown();
  assert.equal(gate.ask(5000), false, 'nor while the walk screen is up');
  down();
  assert.equal(gate.ask(5100), true, 'minimized again, the bar shows it again');
});

test('tabs audit 1: an ask that never reached the walk screen stops holding the next after a while', () => {
  const gate = createWalkGate(2000);
  assert.equal(gate.ask(0), true);
  assert.equal(gate.ask(1999), false);
  assert.equal(gate.ask(2000), true);
});

// The owner's iPhone, Nov 2: minimized, the bar's › did nothing, even after the app was closed
// and reopened, while the tabs worked. The › is dead only when the gate says the walk screen is
// up, or while its return waits on the bar's photo. The walk screen now holds the gate only while
// it is in front (walk.tsx, useFocusEffect), and the wait is capped.
test('the bar\'s return: a photo save that never settles stops holding it after a while', async () => {
  const { settleWithin } = await import('../../settleWithin');
  const never = new Promise<void>(() => {});
  const t0 = Date.now();
  assert.equal(await settleWithin(never, 50), 'timeout');
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(await settleWithin(Promise.resolve(), 50), 'settled');
  assert.equal(await settleWithin(Promise.reject(new Error('x')), 50), 'settled', 'a failed save lets it go too');
  assert.equal(await settleWithin(null, 50), 'settled');
});

test('the gate follows the walk screen being in front: hidden behind the tabs, the bar shows it again', () => {
  const gate = createWalkGate(2000);
  const blur = gate.shown();
  assert.equal(gate.ask(5000), false, 'in front: the bar does nothing');
  blur();
  assert.equal(gate.ask(5100), true, 'out of sight (still mounted or not): the bar brings it forward');
});
