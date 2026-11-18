/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUnsaved } from '../../unsaved/shell';

// Unsaved captures have one owner (specs/unsaved-captures, UN1-UN15): the holder, with its file effects faked.

function holder() {
  const calls: string[] = [];
  let n = 0;
  const u = createUnsaved({
    dropTemp: (uri) => void calls.push(`drop ${uri}`),
    removeMedia: async (refs) => void calls.push(`remove ${refs.join(' ')}`),
    newId: () => `u${++n}`,
  });
  const hold = (kind: 'photo' | 'video' | 'voice', walkId: string | null, uri: string | null = `blob:${kind}${n + 1}`, more: { said?: boolean; path?: string | null } = {}) =>
    u.hold({ kind, walkId, stamp: { t: n }, uri, ext: kind === 'voice' ? 'webm' : 'jpg', ms: null, path: more.path ?? null, outOfSpace: false, said: more.said ?? true });
  return { u, calls, hold };
}

test('UN1: a held capture stays held whatever screen goes: nothing but Retry or the walk’s end lets it go', async () => {
  const { u, hold } = holder();
  const off = u.store.subscribe(() => {});
  hold('voice', null);
  off();
  assert.equal(u.all().length, 1);
  assert.equal(u.store.get().list.length, 1);
});

test('UN3: every failure is held, none replacing another, in the order taken', async () => {
  const { u, hold } = holder();
  const a = hold('voice', 'w1');
  const b = hold('voice', 'w1');
  const c = hold('photo', null);
  assert.deepEqual(u.all().map((x) => x.id), [a, b, c]);
});

test('UN3: a Retry takes each once: a second Retry meanwhile skips what the first is keeping', async () => {
  const { u, hold } = holder();
  const a = hold('voice', 'w1');
  const p = hold('photo', 'w1');
  assert.deepEqual(u.take('memos').map((x) => x.id), [a]);
  assert.deepEqual(u.take('memos'), []);
  assert.deepEqual(u.take('all').map((x) => x.id), [p]);
  // One that fails again stays held and can be taken again; one kept is gone.
  u.settle(a, { kept: false, path: null, outOfSpace: true });
  u.settle(p, { kept: true });
  assert.deepEqual(u.all().map((x) => [x.id, x.retrying, x.outOfSpace]), [[a, false, true]]);
  assert.deepEqual(u.take('all').map((x) => x.id), [a]);
});

test('UN5: both Stops ask what one walk holds, from every screen, at the moment they ask', async () => {
  const { u, hold } = holder();
  hold('photo', 'w1');
  hold('voice', null);
  hold('voice', 'w2');
  const late = hold('voice', 'w1');
  assert.deepEqual(u.heldFor('w1').map((x) => x.kind), ['photo', 'voice']);
  assert.ok(u.heldFor('w1').some((x) => x.id === late));
  // Captures taken outside a walk never hold up a walk's Stop.
  assert.equal(u.heldFor('w3').length, 0);
});

test('UN8: the second hold lets the walk’s held captures go, with their files, and nothing else', async () => {
  const { u, calls, hold } = holder();
  hold('photo', 'w1', 'blob:p');
  hold('voice', 'w1', 'blob:v', { path: 'walks/w1/v.webm' });
  const loose = hold('voice', null, 'blob:l');
  await u.letGo('w1');
  assert.deepEqual(u.all().map((x) => x.id), [loose]);
  assert.deepEqual(calls, ['drop blob:p', 'remove walks/w1/v.webm']);
});

test('UN9: a held capture not said on a screen in front is said once, by the first that shows it', async () => {
  const { u, hold } = holder();
  const said = hold('photo', 'w1', 'blob:a', { said: true });
  const away = hold('voice', 'w1', 'blob:b', { said: false });
  assert.deepEqual(u.unsaid().map((x) => x.id), [away]);
  u.said(away);
  assert.deepEqual(u.unsaid(), []);
  assert.ok(u.all().some((x) => x.id === said));
});

test('UN12: a capture whose file was kept before its row failed keeps that path for every later Retry', async () => {
  const { u, hold } = holder();
  const a = hold('photo', 'w1', 'blob:a');
  u.take('shots');
  u.settle(a, { kept: false, path: 'walks/w1/a.jpg', outOfSpace: false });
  const [again] = u.take('shots');
  assert.equal(again.path, 'walks/w1/a.jpg');
  u.settle(a, { kept: false, path: null, outOfSpace: false });
  // A later failure before the file step never forgets the kept path.
  assert.equal(u.all()[0].path, 'walks/w1/a.jpg');
});

test('UN13: a memo lost as its screen went is said once, by the next screen in front', async () => {
  const { u } = holder();
  u.lost('w1', 'Couldn’t save this voice memo.');
  assert.deepEqual(u.takeLost().map((x) => x.line), ['Couldn’t save this voice memo.']);
  assert.deepEqual(u.takeLost(), []);
});

test('UN15: held while the app is open: a new holder starts empty and writes nothing to storage', async () => {
  const { u, calls } = holder();
  assert.deepEqual(u.store.get(), { list: [], lost: [] });
  assert.deepEqual(calls, []);
});

// The review's accepted findings (the auditor, Nov 17), each before its fix.
type More = {
  track(p: Promise<unknown>): void;
  settled(): Promise<void>;
  ended(walkId: string): Promise<void>;
  hasEnded(walkId: string): boolean;
  takeUnsaid(): { id: string }[];
};
const more = (u: unknown) => u as More;

test('unsaved-captures audit 2: a Stop waits for every Retry under way before it reads or lets go', async () => {
  const { u } = holder();
  let done = false;
  let finish = () => {};
  more(u).track(new Promise<void>((r) => (finish = () => {
    done = true;
    r();
  })));
  const waiting = more(u).settled();
  setTimeout(finish, 20);
  await waiting;
  assert.equal(done, true);
});

test('unsaved-captures audit 3: an ended walk lets its held go, and is known ended after', async () => {
  const { u, calls, hold } = holder();
  hold('photo', 'w1', 'blob:p');
  await more(u).ended('w1');
  assert.equal(u.heldFor('w1').length, 0);
  assert.deepEqual(calls, ['drop blob:p']);
  assert.equal(more(u).hasEnded('w1'), true);
  assert.equal(more(u).hasEnded('w2'), false);
});

test('unsaved-captures audit 8: two captures failed away are each said once, in one change', async () => {
  const { u, hold } = holder();
  const a = hold('photo', 'w1', 'blob:a', { said: false });
  const b = hold('voice', 'w1', 'blob:b', { said: false });
  let told = 0;
  const off = u.store.subscribe(() => void told++);
  assert.deepEqual(more(u).takeUnsaid().map((x) => x.id), [a, b]);
  off();
  assert.equal(told, 1);
  assert.deepEqual(more(u).takeUnsaid(), []);
});

test('tend tabs T35: a Stop lets go only what it warned of; a save failing as the walk ends stays held', async () => {
  const { u, calls, hold } = holder();
  const warned = hold('photo', 'w1', 'blob:warned');
  // A memo still saving when the second hold went through fails before the walk is known ended.
  const late = hold('voice', 'w1', 'blob:late');
  await (u.ended as (walkId: string, only?: readonly string[]) => Promise<void>)('w1', [warned]);
  assert.deepEqual(u.heldFor('w1').map((x) => x.id), [late], 'the memo no one was warned of is still held for Retry');
  assert.deepEqual(calls, ['drop blob:warned']);
  assert.equal(u.hasEnded('w1'), true);
});

test('tend tabs T35: a Retry under way is a save under way: the walk is not dropped meanwhile', async () => {
  const { u } = holder();
  const retrying = (u as unknown as { retrying(): boolean }).retrying;
  assert.equal(typeof retrying, 'function');
  assert.equal(retrying(), false);
  let finish = () => {};
  more(u).track(new Promise<void>((r) => (finish = r)));
  assert.equal(retrying(), true);
  finish();
  await more(u).settled();
  assert.equal(retrying(), false);
});
