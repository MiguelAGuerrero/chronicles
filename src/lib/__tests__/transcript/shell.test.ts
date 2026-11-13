import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoryDb } from '../fakes';

// The module is reached by name: this file runs before it exists (test first).
const load = () => import('../../transcript/shell' as string) as Promise<{ createTranscripts: (p: unknown) => any }>;
type Loose = Record<string, (...a: any[]) => any>;

type Req = { uri: string; lang: string; onDevice: true };
function rig(over: Partial<{ supported: boolean; permission: 'granted' | 'denied' | 'undetermined' | 'unavailable'; ask: boolean; busy: boolean; kept: boolean; say: (r: Req) => string | Error | null }> = {}) {
  const state = { supported: true, permission: 'undetermined' as 'granted' | 'denied' | 'undetermined' | 'unavailable', ask: true, busy: false, kept: true, ...over };
  const calls = { supports: 0, permission: 0, aborts: 0 };
  const reqs: Req[] = [];
  const asked: number[] = [];
  const cuts: { uri: string; start: number; end: number; out: string }[] = [];
  const removed: string[] = [];
  const say = over.say ?? ((r: Req) => `words of ${r.uri}`);
  const engine = {
    supportsOnDevice: async (lang: string): Promise<boolean> => { calls.supports++; return lang.length >= 0 && state.supported; },
    permission: async () => { calls.permission++; return state.permission; },
    abort: () => { calls.aborts++; },
    requestPermission: async () => { asked.push(1); state.permission = state.ask ? 'granted' : 'denied'; return state.ask; },
    recognize: async (r: Req) => { reqs.push(r); const s = say(r); if (s instanceof Error) throw s; return s; },
  };
  const cutter = {
    cut: async (uri: string, start: number, end: number) => { const out = `cut:${uri}:${start}-${end}`; cuts.push({ uri, start, end, out }); return out; },
    remove: async (uri: string) => { removed.push(uri); },
  };
  return { state, calls, reqs, asked, cuts, removed, engine, cutter };
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
    files: { resolve: async (p: string) => `file:///${p}` },
    busy: () => r.state.busy,
    kept: async () => r.state.kept,
    lang: () => 'en-US',
    meta: { get: async (k: string) => meta.get(k) ?? null, set: async (k: string, v: string) => { meta.set(k, v); } },
    clock: { now: () => 100 },
  });
  return { t, db, meta };
}

test('TX1: a kept memo is read in the background and its words are stored', async () => {
  const r = rig({ permission: 'granted' });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(r.reqs.length, 1);
  assert.deepEqual((await db.listTranscripts()).map((x: { capture_id: string; text: string }) => [x.capture_id, x.text]), [['a', 'words of file:///memo-a.m4a']]);
  assert.equal(t.words('a'), 'words of file:///memo-a.m4a');
});

test('TX1: memos are read one at a time', async () => {
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

test('TX2: memos kept before are read newest first, once, only when the engine is already allowed', async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  await t.backfill([memo('a', 1), memo('b', 3), memo('c', 2)]);
  await t.settled();
  assert.deepEqual(r.reqs.map((q) => q.uri), ['file:///memo-b.m4a', 'file:///memo-c.m4a', 'file:///memo-a.m4a']);
  await t.backfill([memo('a', 1), memo('b', 3), memo('c', 2)]);
  await t.settled();
  assert.equal(r.reqs.length, 3, 'none is read twice');
});

test('TX4: an engine error on one memo does not block the next; a memo with no speech is recorded as read', async () => {
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

test('TX5: every request is on-device, and a locale without an on-device recognizer is left unread', async () => {
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

test('TX6: a refusal is remembered, never asked again, and says nothing', async () => {
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

test('TX13: a trimmed memo is read from a cut copy of its kept span, never the file, and the copy is deleted', async () => {
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

test('TX13: a trim that changed makes the words stale: they are not served, and the memo is read again', async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  const trimmed = memo('a', 1, { start_ms: 1000, end_ms: 5000 });
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(t.words('a', trimmed), null, 'the row was read whole: it no longer fits the trim');
  await t.backfill([trimmed]);
  await t.settled();
  assert.equal(r.reqs.length, 2);
  assert.equal(t.words('a', trimmed), 'words of cut:file:///memo-a.m4a:1000-5000');
});

test('TX13: a failed cut leaves the memo unread and the next memo is read', async () => {
  const r = rig({ permission: 'granted' });
  r.cutter.cut = async () => { throw new Error('no cut'); };
  const { t, db } = await make(r);
  await t.backfill([memo('a', 2, { start_ms: 1000, end_ms: 5000 }), memo('b', 1)]);
  await t.settled();
  assert.deepEqual((await db.listTranscripts()).map((x: { capture_id: string; text: string }) => x.capture_id), ['b']);
});

test('TX15: nothing runs while a walk or a memo is recording or playing, and it resumes after', async () => {
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

test('TX15: the permission is not asked at the backfill, nor before a memo is kept this session, nor while busy', async () => {
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

test('TX3: forgetting a memo drops its words', async () => {
  const r = rig({ permission: 'granted' });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  await t.forget(['a']);
  assert.deepEqual(await db.listTranscripts(), []);
  assert.equal(t.words('a'), null);
});

test('TX16: the on-device check is asked for the memo\'s locale before every read', async () => {
  const r = rig({ permission: 'granted' });
  const asked: string[] = [];
  r.engine.supportsOnDevice = async (lang: string) => { asked.push(lang); return true; };
  const { t } = await make(r);
  await t.backfill([memo('a', 2), memo('b', 1)]);
  await t.settled();
  assert.deepEqual(asked, ['en-US', 'en-US']);
});

test('memo-transcripts audit 2: a memo deleted during its read leaves no row', async () => {
  const r = rig({ permission: 'granted' });
  const inner = r.engine.recognize;
  r.engine.recognize = async (q) => { r.state.kept = false; return inner(q); };
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.deepEqual(await db.listTranscripts(), []);
  assert.equal(t.words('a'), null);
});

test('memo-transcripts audit 3: an end with no result and no error is not recorded as read', async () => {
  const r = rig({ permission: 'granted', say: () => null });
  const { t, db } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.deepEqual(await db.listTranscripts(), [], 'an engine that heard nothing at all is not "no speech"');
});

test('memo-transcripts audit 5: rows written in a run tell the listeners once, when the queue is idle', async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  let told = 0;
  t.onSettled(() => { told++; });
  await t.backfill([memo('a', 1), memo('b', 2), memo('c', 3)]);
  await t.settled();
  assert.equal(told, 1);
});

test('memo-transcripts audit 6: a recording starting mid-read aborts the read, and the memo is read again after', async () => {
  const r = rig({ permission: 'granted' });
  let release: (() => void) | null = null;
  const inner = r.engine.recognize;
  let first = true;
  r.engine.recognize = (q) => {
    if (first) { first = false; return new Promise((_, reject) => { release = () => reject(new Error('aborted')); }); }
    return inner(q);
  };
  r.engine.abort = () => { r.calls.aborts++; release?.(); };
  const { t, db } = await make(r);
  const reading = t.enqueue(memo('a', 1));
  await new Promise((x) => setTimeout(x, 5));
  r.state.busy = true;
  t.interrupt();
  await reading;
  await t.settled();
  assert.equal(r.calls.aborts, 1);
  assert.deepEqual(await db.listTranscripts(), [], 'nothing stored from the aborted read');
  r.state.busy = false;
  t.kick();
  await t.settled();
  assert.deepEqual((await db.listTranscripts()).map((x: { capture_id: string }) => x.capture_id), ['a']);
});

test('memo-transcripts audit 7: with the engine unavailable, a backlog costs one engine call, not one per memo', async () => {
  const r = rig({ permission: 'granted', supported: false });
  const { t } = await make(r);
  await t.backfill(Array.from({ length: 200 }, (_, i) => memo(`m${i}`, i)));
  await t.settled();
  assert.equal(r.calls.supports, 1);
  const u = rig({ permission: 'undetermined' });
  const b = await make(u);
  await b.t.backfill(Array.from({ length: 200 }, (_, i) => memo(`m${i}`, i)));
  await b.t.settled();
  assert.equal(u.calls.permission, 1, 'a backfill that may not ask stops at the first memo');
});

test('memo-transcripts audit 8: an item added as the pump finishes is read', async () => {
  const r = rig({ permission: 'granted' });
  const { t } = await make(r);
  await t.enqueue(memo('a', 1));
  const second = t.enqueue(memo('b', 2));
  await second;
  await t.settled();
  assert.equal(r.reqs.length, 2);
});

test('memo-transcripts audit 10: an engine that is not on this platform writes no meta and asks nothing', async () => {
  const r = rig({ permission: 'unavailable' });
  const { t, meta } = await make(r);
  await t.enqueue(memo('a', 1));
  await t.settled();
  assert.equal(meta.size, 0);
  assert.equal(r.asked.length, 0);
});

test('memo-transcripts audit 10: the web engine says it is unavailable, so nothing is stored, asked or remembered', async () => {
  const { engine } = await import('../../transcript/engine');
  assert.equal(await engine.permission(), 'unavailable');
});
