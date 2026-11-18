/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { createStore } from '../../store';

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

test('SA1: a probe that can\'t read says nothing; a failing one neither', async () => {
  const { createSpace } = await shell();
  const none = createSpace(fakePorts(), probe(null));
  assert.equal(await none.check(walking), null);
  assert.equal(none.store.get().line, null);
  const failing = createSpace(fakePorts(), probe(() => Promise.reject(new Error('no API'))));
  assert.equal(await failing.check(walking), null);
  assert.equal(failing.store.get().line, null);
});

test('SA3: little room left shows the line; plenty shows none', async () => {
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

test('SA4: once for each level across screens and walks, a reload included; again when worse', async () => {
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

test('SA4: room that recovers and runs low again is said again', async () => {
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

test('SA4: an unread room changes nothing; a failed meta write still says it once in this run', async () => {
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

test('SA5: a kept capture reads the room again', async () => {
  const { createSpace } = await shell();
  const pr = probe(4000 * MB);
  const s = createSpace(fakePorts(), pr);
  assert.equal(await s.check(walking), null, 'plenty when the walk opened');
  pr.set(80 * MB);
  await s.afterKept(walking);
  assert.equal(s.store.get().line, VERY_LOW, 'said after the capture that made it low');
});

test('SA10: never asked while a walk records; asked when Navigate, ready next shows; the refusal said there once', async () => {
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

test('SA10: a moment kept outside a walk asks at once; the Home Screen named on an iPhone browser', async () => {
  const { createSpace } = await shell();
  const pr = probe(4000 * MB, false, true);
  const s = createSpace(fakePorts(), pr);
  await s.afterKept(ready);
  assert.equal(pr.persists, 1);
  assert.equal(s.store.get().line, `${REFUSED} The Home Screen app is less likely to.`);
});

test('SA10: granted is silent; a phone (no persistence to ask) never says it', async () => {
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

test('SA10: the room left wins over the refusal when both are due; the refusal waits for the next look', async () => {
  const { createSpace } = await shell();
  const s = createSpace(fakePorts(), probe(300 * MB, false));
  await s.afterKept(ready);
  assert.equal(s.store.get().line, LOW, 'the space line first');
  s.dismiss();
  await s.check(ready);
  assert.equal(s.store.get().line, REFUSED, 'the refusal on the next look');
});

// /tend inbox T37 (the proxy's yes under 0157, 2026-11-18): on Memories the recording bar's Edit pill and this line
// stood as two dark pills at once (Material: "Only one snackbar may be displayed at a time."). The pill, answering what
// the person just did, comes first: the line waits while it is up and shows once it goes (Edit, its ✕, the next
// capture, or the bar going), its words unchanged, still once (SA4, SA10). Nothing is marked said while it waits, so
// a reload meanwhile says it again rather than never.

test('tend tabs T37: a line due while the bar\'s Edit pill is up waits unmarked, and is said once as the pill goes', async () => {
  const { createSpace, SAID_KEY } = await shell();
  const p = fakePorts();
  const pill = createStore(true);
  const s = createSpace(p, probe(300 * MB), pill);
  assert.equal(await s.check(walking), null, 'nothing said while the pill is up');
  await s.afterKept(walking);
  assert.equal(s.store.get().line, null, 'nor after a capture meanwhile');
  assert.ok(!(await p.db.getMeta(SAID_KEY)), 'and nothing marked said while it waits');
  // A reload while it waits (the pill gone with the page) says it then: never lost.
  const reloaded = createSpace(p, probe(300 * MB));
  assert.equal(await reloaded.check(walking), LOW, 'said after a reload');
  // The pill goes: said now, in the same words, and marked.
  const q = fakePorts();
  const pill2 = createStore(true);
  const t = createSpace(q, probe(300 * MB), pill2);
  await t.check(walking);
  await t.check(walking);
  pill2.set(false);
  assert.equal(await t.check(walking), null, 'said by the pill going, not by a later look');
  assert.equal(t.store.get().line, LOW, 'once the pill goes');
  assert.equal(await q.db.getMeta(SAID_KEY), 'low', 'marked said as it shows');
  t.dismiss();
  pill2.set(true);
  pill2.set(false);
  assert.equal(await t.check(walking), null);
  assert.equal(t.store.get().line, null, 'never again: one showing, however many looks waited');
});

test('tend tabs T37: a line already up steps aside while the pill is up and comes back as it goes, its words unchanged', async () => {
  const { createSpace } = await shell();
  const pill = createStore(false);
  const s = createSpace(fakePorts(), probe(300 * MB), pill);
  assert.equal(await s.check(walking), LOW);
  pill.set(true);
  assert.equal(s.store.get().line, null, 'never two pills at once');
  assert.equal(await s.check(walking), null, 'not said again meanwhile');
  pill.set(false);
  assert.equal(s.store.get().line, LOW, 'back as the pill goes');
  s.dismiss();
  pill.set(true);
  pill.set(false);
  assert.equal(s.store.get().line, null, 'a dismissed line stays dismissed');
});

test('tend tabs T37: the browser\'s refusal waits for the pill unmarked, then is said once (SA10 kept)', async () => {
  const { createSpace, PERSIST_KEY } = await shell();
  const p = fakePorts();
  const pill = createStore(true);
  const pr = probe(4000 * MB, false);
  const s = createSpace(p, pr, pill);
  await s.afterKept(ready);
  assert.equal(pr.persists, 1, 'the browser is asked; only the saying waits');
  assert.equal(s.store.get().line, null, 'not said while the pill is up');
  assert.equal(await p.db.getMeta(PERSIST_KEY), 'refused', 'and not marked asked meanwhile');
  pill.set(false);
  await s.check(walking);
  assert.equal(s.store.get().line, REFUSED, 'said once the pill goes');
  assert.equal(await p.db.getMeta(PERSIST_KEY), 'asked');
  s.dismiss();
  pill.set(true);
  pill.set(false);
  await s.check(ready);
  assert.equal(s.store.get().line, null, 'never said again');
  assert.equal(pr.persists, 1, 'never asked again');
});
