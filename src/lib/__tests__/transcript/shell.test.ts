import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoryDb } from '../fakes';

// The module is reached by name: this file runs before it exists (test first).
const load = () => import('../../transcript/shell' as string) as Promise<{ createTranscripts: (p: unknown) => any }>;
type Loose = Record<string, (...a: any[]) => any>;

type Req = { uri: string; lang: string; onDevice: true };
function rig(over: Partial<{ supported: boolean; permission: 'granted' | 'denied' | 'undetermined'; ask: boolean; busy: boolean; say: (r: Req) => string | Error }> = {}) {
  const state = { supported: true, permission: 'undetermined' as 'granted' | 'denied' | 'undetermined', ask: true, busy: false, ...over };
  const reqs: Req[] = [];
  const asked: number[] = [];
  const cuts: { uri: string; start: number; end: number; out: string }[] = [];
  const removed: string[] = [];
  const say = over.say ?? ((r: Req) => `words of ${r.uri}`);
  const engine = {
    supportsOnDevice: async (lang: string): Promise<boolean> => lang.length >= 0 && state.supported,
    permission: async () => state.permission,
    requestPermission: async () => { asked.push(1); state.permission = state.ask ? 'granted' : 'denied'; return state.ask; },
    recognize: async (r: Req) => { reqs.push(r); const s = say(r); if (s instanceof Error) throw s; return s; },
  };
  const cutter = {
    cut: async (uri: string, start: number, end: number) => { const out = `cut:${uri}:${start}-${end}`; cuts.push({ uri, start, end, out }); return out; },
    remove: async (uri: string) => { removed.push(uri); },
  };
  return { state, reqs, asked, cuts, removed, engine, cutter };
}
const memo = (id: string, t: number, trim?: { start_ms: number; end_ms: number }) => ({
  id, t, kind: 'voice' as const, file_path: `memo-${id}.m4a`, body: '8000', edit: trim ? { trim } : null,
});
async function make(r: ReturnType<typeof rig>) {
  const { createTranscripts } = await load();
  const db = memoryDb() as unknown as Loose;
  const meta = new Map<string, string>();
  const t = createTranscripts({
    db, engine: r.engine, cutter: r.cutter,
    files: { resolve: (p: string) => `file:///${p}` },
    busy: () => r.state.busy,
    lang: () => 'en-US',
    meta: { get: async (k: string) => meta.get(k) ?? null, set: async (k: string, v: string) => { meta.set(k, v); } },
    clock: { now: () => 100 },
  });
  return { t, db, meta };
}

test('TX1: a kept memo is read in the background and its words are stored', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(r.reqs.length, 1);
  assert.deepEqual((await db.listTranscripts()).map((x: { capture_id: string; text: string }) => [x.capture_id, x.text]), [['a', 'words of file:///memo-a.m4a']]);
  assert.equal(t.words('a'), 'words of file:///memo-a.m4a');
});

test('TX1: memos are read one at a time', { todo: 'test first' }, async () => {
  let live = 0; let peak = 0;
  const r = rig({ permission: 'granted' });
  const inner = r.engine.recognize;
  r.engine.recognize = async (q) => { live++; peak = Math.max(peak, live); await new Promise((x) => setTimeout(x, 5)); live--; return inner(q); };
  const { t } = await make(r);
  await Promise.all([t.enqueue(memo('a', 1)), t.enqueue(memo('b', 2))]);
  await t.settled();
  assert.equal(peak, 1);
  assert.equal(r.reqs.length, 2);
});

test('TX2: memos kept before are read newest first, once, only when the engine is already allowed', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  await t.backfill([memo('a', 1), memo('b', 3), memo('c', 2)]);
  await t.settled();
  assert.deepEqual(r.reqs.map((q) => q.uri), ['file:///memo-b.m4a', 'file:///memo-c.m4a', 'file:///memo-a.m4a']);
  await t.backfill([memo('a', 1), memo('b', 3), memo('c', 2)]);
  await t.settled();
  assert.equal(r.reqs.length, 3, 'none is read twice');
});

test('TX4: an engine error on one memo does not block the next; a memo with no speech is recorded as read', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted', say: (q) => (q.uri.includes('-a') ? new Error('boom') : q.uri.includes('-b') ? '' : 'fine') });
  const { t, db } = await make(r);
  await t.backfill([memo('a', 3), memo('b', 2), memo('c', 1)]);
  await t.settled();
  const rows = Object.fromEntries((await db.listTranscripts()).map((x: { capture_id: string; text: string }) => [x.capture_id, x.text]));
  assert.deepEqual(rows, { b: '', c: 'fine' }, 'the error leaves no row, the empty one is a row');
  await t.backfill([memo('b', 2)]);
  await t.settled();
  assert.equal(r.reqs.filter((q) => q.uri.includes('-b')).length, 1, 'no speech is not read again');
});

test('TX5: every request is on-device, and a locale without an on-device recognizer is left unread', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const a = await make(r);
  await a.t.enqueue(memo('a', 1));
  await a.t.settled();
  assert.ok(r.reqs.length > 0 && r.reqs.every((q) => q.onDevice === true));
  const r2 = rig({ permission: 'granted', supported: false });
  const b = await make(r2);
  await b.t.enqueue(memo('a', 1));
  await b.t.settled();
  assert.equal(r2.reqs.length, 0, 'nothing is sent');
  assert.deepEqual(await b.db.listTranscripts(), []);
});

test('TX6: a refusal is remembered, never asked again, and says nothing', { todo: 'test first' }, async () => {
  const r = rig({ ask: false });
  const { t, db, meta } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(r.asked.length, 1);
  assert.equal(r.reqs.length, 0);
  assert.equal(meta.get('transcript_off'), '1');
  await t.enqueue(memo('b', 2));
  await t.settled();
  assert.equal(r.asked.length, 1, 'not asked again');
  assert.deepEqual(await db.listTranscripts(), []);
});

test('TX13: a trimmed memo is read from a cut copy of its kept span, never the file, and the copy is deleted', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1, { start_ms: 1000, end_ms: 5000 }));
  await t.settled();
  assert.deepEqual(r.cuts.map((c) => [c.uri, c.start, c.end]), [['file:///memo-a.m4a', 1000, 5000]]);
  assert.deepEqual(r.reqs.map((q) => q.uri), ['cut:file:///memo-a.m4a:1000-5000']);
  assert.deepEqual(r.removed, ['cut:file:///memo-a.m4a:1000-5000']);
  const [row] = await db.listTranscripts();
  assert.deepEqual([row.from_ms, row.to_ms], [1000, 5000]);
});

test('TX13: a trim that changed makes the words stale: they are not served, and the memo is read again', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  await t.backfill([memo('a', 1, { start_ms: 1000, end_ms: 5000 })]);
  await t.settled();
  assert.equal(r.reqs.length, 2);
  assert.equal(t.words('a', { start_ms: 0, end_ms: 8000 }), null, 'the first row no longer fits a trim');
});

test('TX13: a failed cut leaves the memo unread and the next memo is read', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  r.cutter.cut = async () => { throw new Error('no cut'); };
  const { t, db } = await make(r);
  await t.backfill([memo('a', 2, { start_ms: 1000, end_ms: 5000 }), memo('b', 1)]);
  await t.settled();
  assert.deepEqual((await db.listTranscripts()).map((x: { capture_id: string; text: string }) => x.capture_id), ['b']);
});

test('TX15: nothing runs while a walk or a memo is recording or playing, and it resumes after', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted', busy: true });
  const { t } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(r.reqs.length, 0);
  r.state.busy = false;
  t.kick();
  await t.settled();
  assert.equal(r.reqs.length, 1);
});

test('TX15: the permission is not asked at the backfill, nor before a memo is kept this session, nor while busy', { todo: 'test first' }, async () => {
  const r = rig();
  const { t } = await make(r);
  await t.backfill([memo('a', 1)]);
  await t.settled();
  assert.equal(r.asked.length, 0, 'a backfill never asks');
  r.state.busy = true;
  await t.enqueue(memo('b', 2));
  await t.settled();
  assert.equal(r.asked.length, 0, 'not while busy');
  r.state.busy = false;
  t.kick();
  await t.settled();
  assert.equal(r.asked.length, 1, 'once a memo was kept and it is quiet');
});

test('TX3: forgetting a memo drops its words', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  await t.forget(['a']);
  assert.deepEqual(await db.listTranscripts(), []);
  assert.equal(t.words('a'), null);
});

test('TX16: the on-device check is asked for the memo\'s locale before every read', { todo: 'test first' }, async () => {
  const r = rig({ permission: 'granted' });
  const asked: string[] = [];
  r.engine.supportsOnDevice = async (lang: string) => { asked.push(lang); return true; };
  const { t } = await make(r);
  await t.backfill([memo('a', 2), memo('b', 1)]);
  await t.settled();
  assert.deepEqual(asked, ['en-US', 'en-US']);
});
