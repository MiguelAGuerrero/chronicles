/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createNotifier,
  NOTICE_KINDS,
  parseNoticePrefs,
  PAUSE_REMIND_MS,
  routeResponse,
  serializePrefs,
  type Notice,
  type NoticePrefs,
  type NoticeTransport,
  type Permission,
} from '../notify/core';
import { noticeFromUrl, swOptions, SW_MESSAGE } from '../notify/webNotice';

// Slice 6 of v1 (notifications), written from criteria NT3-NT11 before the code.

/** A transport that records what it was asked to do, as either platform's would. */
function fakeTransport(start: Permission = 'granted') {
  const log: string[] = [];
  const shown: Notice[] = [];
  const scheduled: { n: Notice; afterMs: number }[] = [];
  let perm: Permission = start;
  let respond: ((r: { id: string; data: Notice['data']; action: string | null }) => void) | null = null;
  const t: NoticeTransport = {
    async permission() {
      return perm;
    },
    async request() {
      log.push('request');
      if (perm === 'default') perm = 'granted';
      return perm;
    },
    async show(n) {
      shown.push(n);
      return true;
    },
    async schedule(n, afterMs) {
      scheduled.push({ n, afterMs });
    },
    async cancel(id) {
      log.push(`cancel:${id}`);
    },
    onResponse(fn) {
      respond = fn;
    },
  };
  return { t, log, shown, scheduled, tap: (r: { id: string; data: Notice['data']; action: string | null }) => respond?.(r), setPerm: (p: Permission) => (perm = p) };
}

const allOn: NoticePrefs = { recall: true, pause: true };
const make = (f: ReturnType<typeof fakeTransport>, prefs: NoticePrefs = allOn, handlers: { open?: (ids: string[]) => void; stop?: (ids: string[]) => void } = {}) =>
  createNotifier({ transport: f.t, prefs: async () => prefs, onOpen: handlers.open ?? (() => {}), onStop: handlers.stop ?? (() => {}) });

test('NT4: two kinds, both on by default; the setting round-trips', () => {
  assert.deepEqual(NOTICE_KINDS.map((k) => k.id), ['recall', 'pause']);
  assert.deepEqual(parseNoticePrefs(null), { recall: true, pause: true });
  assert.deepEqual(parseNoticePrefs('garbage'), { recall: true, pause: true });
  assert.deepEqual(parseNoticePrefs(serializePrefs({ recall: false, pause: true })), { recall: false, pause: true });
});

test('NT7: a reminder is one notification per walk, with its content and a stop action', async () => {
  const f = fakeTransport();
  await make(f).recall({ title: 'A memory from here', body: 'The bakery smelled of cardamom.' }, ['c1'], 'w1');
  assert.equal(f.shown.length, 1);
  const n = f.shown[0];
  assert.equal(n.kind, 'recall');
  assert.equal(n.id, 'recall-w1');
  assert.equal(n.body, 'The bakery smelled of cardamom.');
  assert.deepEqual(n.data, { captureIds: ['c1'] });
  assert.deepEqual(n.actions?.map((a) => a.id), ['stop']);
});

test('NT4: a kind switched off sends nothing', async () => {
  const f = fakeTransport();
  const n = make(f, { recall: false, pause: false });
  await n.recall({ title: 't', body: 'b' }, ['c1'], 'w1');
  await n.pauseStarted('w1');
  assert.equal(f.shown.length + f.scheduled.length, 0);
});

test('NT5: a reminder from the background never asks for permission; it only checks', async () => {
  const f = fakeTransport('default');
  await make(f).recall({ title: 't', body: 'b' }, ['c1'], 'w1');
  assert.equal(f.shown.length, 0);
  assert.ok(!f.log.includes('request'));
});

test('NT5: the first pause asks, and schedules the reminder for 10 min', async () => {
  const f = fakeTransport('default');
  await make(f).pauseStarted('w1');
  assert.ok(f.log.includes('request'));
  assert.equal(f.scheduled.length, 1);
  assert.equal(f.scheduled[0].afterMs, PAUSE_REMIND_MS);
  assert.equal(f.scheduled[0].n.id, 'pause-w1');
  assert.equal(f.scheduled[0].n.kind, 'pause');
});

test('NT5: denied permission sends nothing and asks no more', async () => {
  const f = fakeTransport('denied');
  const n = make(f);
  await n.pauseStarted('w1');
  await n.recall({ title: 't', body: 'b' }, ['c1'], 'w1');
  assert.equal(f.shown.length + f.scheduled.length, 0);
  assert.equal(await n.permission(), 'denied');
});

test('NT10, NT11: resuming cancels the pause reminder; stopping clears the walk’s notifications', async () => {
  const f = fakeTransport();
  const n = make(f);
  await n.pauseEnded('w1');
  assert.deepEqual(f.log, ['cancel:pause-w1']);
  await n.walkEnded('w1');
  assert.ok(f.log.includes('cancel:recall-w1'));
});

test('NT6: the test notification shows even in front, whatever the switches', async () => {
  const f = fakeTransport('default');
  await make(f, { recall: false, pause: false }).test();
  assert.equal(f.shown.length, 1);
  assert.equal(f.shown[0].inFront, true);
  assert.ok(f.log.includes('request'), 'a tap on the test button may ask');
});

test('NT7: reminders and pauses are for the background: never shown in front', async () => {
  const f = fakeTransport();
  const n = make(f);
  await n.recall({ title: 't', body: 'b' }, ['c1'], 'w1');
  await n.pauseStarted('w1');
  assert.ok(!f.shown[0].inFront && !f.scheduled[0].n.inFront);
});

test('NT8, NT9: a tap opens the captures, the stop action stops them, from either platform', () => {
  assert.deepEqual(routeResponse({ data: { captureIds: ['c1', 'c2'] }, action: null }), { kind: 'open', captureIds: ['c1', 'c2'] });
  assert.deepEqual(routeResponse({ data: { captureIds: ['c1'] }, action: 'stop' }), { kind: 'stop', captureIds: ['c1'] });
  assert.equal(routeResponse({ data: undefined, action: null }), null);
  assert.equal(routeResponse({ data: { captureIds: [] }, action: null }), null);
});

test('NT8: the notifier routes a transport’s tap to the app’s handlers', () => {
  const f = fakeTransport();
  const opened: string[][] = [];
  const stopped: string[][] = [];
  make(f, allOn, { open: (ids) => opened.push(ids), stop: (ids) => stopped.push(ids) });
  f.tap({ id: 'recall-w1', data: { captureIds: ['c1'] }, action: null });
  f.tap({ id: 'recall-w1', data: { captureIds: ['c2'] }, action: 'stop' });
  assert.deepEqual(opened, [['c1']]);
  assert.deepEqual(stopped, [['c2']]);
});

// ——— The web transport's pure parts (NT8, NT9) ———


test('NT8: a cold open from a tapped web notification carries the tap in the URL, read once', () => {
  const msg = { type: SW_MESSAGE, id: 'recall-w1', data: { captureIds: ['c1'] }, action: null };
  const search = `?notice=${encodeURIComponent(JSON.stringify(msg))}`;
  assert.deepEqual(noticeFromUrl(search), { id: 'recall-w1', data: { captureIds: ['c1'] }, action: null });
  assert.equal(noticeFromUrl('?x=1'), null);
  assert.equal(noticeFromUrl('?notice=%7Bbad'), null);
  assert.equal(noticeFromUrl(`?notice=${encodeURIComponent(JSON.stringify({ type: 'other' }))}`), null);
});

test('NT9: web options carry the tag (one per id), the data, the icon under the base path and the actions', () => {
  const o = swOptions({ kind: 'recall', id: 'recall-w1', title: 't', body: 'b', data: { captureIds: ['c1'] }, actions: [{ id: 'stop', title: 'Stop reminding me' }] }, '/chronicles');
  assert.equal(o.tag, 'recall-w1');
  assert.equal(o.body, 'b');
  assert.deepEqual(o.data, { captureIds: ['c1'] });
  assert.equal(o.icon, '/chronicles/icon-192.png');
  assert.deepEqual(o.actions, [{ action: 'stop', title: 'Stop reminding me' }]);
  assert.equal(swOptions({ kind: 'test', id: 'test', title: 't', body: 'b' }, '').icon, '/icon-192.png');
});

// ——— Audit regressions (slice 6) ———

test('audit 4: the test reports whether it was shown, not just the permission', async () => {
  const f = fakeTransport();
  f.t.show = async () => false;
  assert.equal((await make(f).test()).shown, false);
  const g = fakeTransport();
  assert.equal((await make(g).test()).shown, true);
});

test('audit 6: no prompt for a kind that is off; turning the pause reminder off cancels a pending one', async () => {
  const f = fakeTransport('default');
  const n = make(f, { recall: false, pause: true });
  await n.ask('recall');
  assert.ok(!f.log.includes('request'));
  await n.ask('pause');
  assert.ok(f.log.includes('request'));
  const g = fakeTransport();
  await make(g).prefsChanged({ recall: true, pause: false }, 'w1');
  assert.ok(g.log.includes('cancel:pause-w1'));
});

test('audit 7: stopping clears old hint notifications from before explore too', async () => {
  const f = fakeTransport();
  await make(f).walkEnded('w1');
  assert.ok(f.log.includes('cancel:ambient-w1'));
});
