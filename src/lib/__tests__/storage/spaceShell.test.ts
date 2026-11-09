/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';

// Storage awareness (specs/storage-awareness): the shell over fakes and a fake probe. Written before the
// module, which a test loads inside its body.
const shell = (): Promise<any> => import(`../../space/${'shell'}`);

const MB = 1024 * 1024;
const LOW = 'Room for new photos and videos is running low.';
const VERY_LOW = 'There is almost no room left for new photos, videos and memos.';
const REFUSED = 'This browser may clear Chronicles’ moments when it needs room.';
const walking = { recording: true };
const ready = { recording: false };

/** A probe whose free space and persistence answer are set by the test; counts the asks. */
function probe(free: number | null | (() => Promise<number | null>), persist: boolean | null = null, homeScreen = false) {
  const p = {
    free: async () => (typeof free === 'function' ? free() : free),
    persists: 0,
    persist: async () => {
      p.persists++;
      return persist;
    },
    homeScreen: () => homeScreen,
    set(v: number | null) {
      free = v;
    },
  };
  return p;
}

test('SA1: a probe that can\'t read says nothing; a failing one neither', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const none = createSpace(fakePorts(), probe(null));
  assert.equal(await none.check(walking), null);
  assert.equal(none.store.get().line, null);
  const failing = createSpace(fakePorts(), probe(() => Promise.reject(new Error('no API'))));
  assert.equal(await failing.check(walking), null);
  assert.equal(failing.store.get().line, null);
});

test('SA3: little room left shows the line; plenty shows none', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const low = createSpace(fakePorts(), probe(300 * MB));
  assert.equal(await low.check(walking), LOW);
  assert.equal(low.store.get().line, LOW);
  const veryLow = createSpace(fakePorts(), probe(20 * MB));
  assert.equal(await veryLow.check(ready), VERY_LOW);
  const plenty = createSpace(fakePorts(), probe(4000 * MB));
  assert.equal(await plenty.check(walking), null);
  assert.equal(plenty.store.get().line, null);
});

test('SA4: once for each level across screens and walks, a reload included; again when worse', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const p = fakePorts();
  const pr = probe(300 * MB);
  const a = createSpace(p, pr);
  assert.equal(await a.check(ready), LOW);
  a.dismiss();
  assert.equal(a.store.get().line, null, 'dismissed');
  assert.equal(await a.check(walking), null, 'not again on a walk');
  assert.equal(await a.check(ready), null, 'not again on Navigate, ready');
  const reloaded = createSpace(p, pr);
  assert.equal(await reloaded.check(walking), null, 'not again after a reload');
  pr.set(50 * MB);
  assert.equal(await reloaded.check(walking), VERY_LOW, 'worse');
  assert.equal(await reloaded.check(ready), null, 'and only once at that level');
});

test('SA4: room that recovers and runs low again is said again', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const pr = probe(300 * MB);
  const s = createSpace(fakePorts(), pr);
  assert.equal(await s.check(walking), LOW);
  pr.set(3000 * MB);
  assert.equal(await s.check(walking), null, 'recovered');
  assert.equal(s.store.get().line, null, 'the line goes when the room is back');
  pr.set(300 * MB);
  assert.equal(await s.check(walking), LOW, 'low again');
});

test('SA4: an unread room changes nothing; a failed meta write still says it once in this run', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const p = fakePorts();
  const pr = probe(300 * MB);
  const s = createSpace(p, pr);
  p.db.failNext('setMeta', new Error('disk is full'));
  assert.equal(await s.check(walking), LOW);
  assert.equal(await s.check(walking), null, 'remembered in memory');
  pr.set(null);
  assert.equal(await s.check(walking), null);
  pr.set(300 * MB);
  assert.equal(await s.check(walking), null, 'an unread room is not a recovery');
});

test('SA5: a kept capture reads the room again', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const pr = probe(4000 * MB);
  const s = createSpace(fakePorts(), pr);
  assert.equal(await s.check(walking), null, 'plenty when the walk opened');
  pr.set(80 * MB);
  await s.afterKept(walking);
  assert.equal(s.store.get().line, VERY_LOW, 'said after the capture that made it low');
});

test('SA10: never asked while a walk records; asked when Navigate, ready next shows; the refusal said there once', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const p = fakePorts();
  const pr = probe(4000 * MB, false);
  const s = createSpace(p, pr);
  await s.check(ready);
  assert.equal(pr.persists, 0, 'nothing kept yet, nothing asked');
  await s.afterKept(walking);
  assert.equal(pr.persists, 0, 'not while the walk records');
  assert.equal(s.store.get().line, null);
  await s.check(walking);
  assert.equal(pr.persists, 0, 'not on the walk screen either');
  const reloaded = createSpace(p, pr);
  await reloaded.check(ready);
  assert.equal(pr.persists, 1, 'asked on Navigate, ready, a reload included');
  assert.equal(reloaded.store.get().line, REFUSED, 'the refusal is said there');
  reloaded.dismiss();
  await reloaded.check(ready);
  await reloaded.afterKept(ready);
  await createSpace(p, pr).check(ready);
  assert.equal(pr.persists, 1, 'never asked again');
  assert.equal(reloaded.store.get().line, null, 'never said again');
});

test('SA10: a moment kept outside a walk asks at once; the Home Screen named on an iPhone browser', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const pr = probe(4000 * MB, false, true);
  const s = createSpace(fakePorts(), pr);
  await s.afterKept(ready);
  assert.equal(pr.persists, 1);
  assert.equal(s.store.get().line, `${REFUSED} The Home Screen app is less likely to.`);
});

test('SA10: granted is silent; a phone (no persistence to ask) never says it', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const granted = probe(4000 * MB, true);
  const g = createSpace(fakePorts(), granted);
  await g.afterKept(ready);
  assert.equal(granted.persists, 1);
  assert.equal(g.store.get().line, null);
  const phone = probe(4000 * MB, null);
  const n = createSpace(fakePorts(), phone);
  await n.afterKept(ready);
  await n.check(ready);
  assert.equal(n.store.get().line, null);
});

test('SA10: the room left wins over the refusal when both are due; the refusal waits for the next look', { todo: 'test first' }, async () => {
  const { createSpace } = await shell();
  const s = createSpace(fakePorts(), probe(300 * MB, false));
  await s.afterKept(ready);
  assert.equal(s.store.get().line, LOW, 'the space line first');
  s.dismiss();
  await s.check(ready);
  assert.equal(s.store.get().line, REFUSED, 'the refusal on the next look');
});
