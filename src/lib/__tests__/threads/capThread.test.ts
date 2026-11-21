// Thread a moment as it is kept (specs/threading-at-capture, TK1-TK11, decision 0253): the card's decisions and words.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Faced, facedOf, momentOf } from '../../moment';
import { filterPicker } from '../../threads/picker';
import { poolWithOpenWalks } from '../../resurface/views';
import { createThreads } from '../../threads/shell';
import type { Member } from '../../threads/types';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';

// The module is written after these tests (test first): read by a path tsc does not follow until it exists.
const cap = (): Promise<any> => import(`../../threads/${'capThread'}`);

const member = (thread_id: string, moment_id: string, added_at: number): Member => ({ thread_id, moment_id, added_at });
const moment = (id: string, t: number, more: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: null, t, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: `note ${id}`, segment_id: null, ...more,
});

test('TK4: the thread last added to is the one with the newest added_at among the threads shown; none with none', { todo: 'test first' }, async () => {
  const { lastAddedTo } = await cap();
  const members = [member('a', 'm1', 100), member('a', 'm2', 100), member('b', 'm3', 300), member('b', 'm4', 300), member('a', 'm5', 200)];
  assert.equal(lastAddedTo(members, new Set(['a', 'b'])), 'b');
  assert.equal(lastAddedTo(members, new Set(['a'])), 'a', 'a thread not shown (hidden, in Undo) is skipped');
  assert.equal(lastAddedTo([], new Set()), null, 'with no thread there is no first row');
  assert.equal(lastAddedTo([member('b', 'm1', 5), member('a', 'm2', 5)], new Set(['a', 'b'])), 'a', 'a tie goes to the same thread every time (by id)');
});

test('TK5: a thread is found by its name or its heading\'s words; an empty search keeps the list', { todo: 'test first' }, async () => {
  const { threadSearch } = await cap();
  const rows = [
    { id: 'a', title: 'Murals', sub: null },
    { id: 'b', title: 'Fox Point, Oct 20', sub: 'the laundromat wall' },
    { id: 'c', title: 'Compliments', sub: null },
  ];
  assert.deepEqual(threadSearch(rows, 'mur').map((r: { id: string }) => r.id), ['a'], 'by its name, any case');
  assert.deepEqual(threadSearch(rows, 'FOX').map((r: { id: string }) => r.id), ['b'], 'by its heading: place and date');
  assert.deepEqual(threadSearch(rows, 'laundromat').map((r: { id: string }) => r.id), ['b'], 'by its first words');
  assert.deepEqual(threadSearch(rows, '  ').map((r: { id: string }) => r.id), ['a', 'b', 'c'], 'an empty search shows the list as it was');
  assert.deepEqual(threadSearch(rows, 'zebra'), [], 'nothing found');
  const { CAP_THREAD } = await cap();
  assert.equal(CAP_THREAD.search, 'Search threads and moments');
  assert.equal(CAP_THREAD.none, 'Nothing matches.', 'a search that finds nothing says so in words');
});

test('TK6: the pool the card reads (the responses sheet\'s) offers a moment of the walk still open, newest first', { todo: 'test first' }, () => {
  const walks: Walk[] = [
    { id: 'w-open', started_at: 1000, ended_at: null, open: true } as unknown as Walk,
    { id: 'w-old', started_at: 10, ended_at: 50, open: false } as unknown as Walk,
  ];
  const captures = [moment('old', 20, { walk_id: 'w-old' }), moment('mural1', 1100, { walk_id: 'w-open', kind: 'photo', body: null, file_path: 'a.jpg' }), moment('mural2', 1200, { walk_id: 'w-open', kind: 'photo', body: null, file_path: 'b.jpg' })];
  // lib/threads may not read lib/resurface (threads/arch.test.ts): the card (a component) reads poolWithOpenWalks; the
  // journey capthread checks the card offers this walk's first mural (TK6). Here: that pool, through the picker.
  const items = poolWithOpenWalks(captures, walks).map((v) => ({ id: v.id, t: v.t, words: v.words, context: '' }));
  const shown = filterPicker(items, { hidden: new Set(), self: 'mural2', query: '', limit: 40 }).shown.map((i) => i.id);
  assert.deepEqual(shown, ['mural1', 'old'], 'the first mural of this walk is offered first');
});

test('TK7: a photo or video row is its picture with its words and line; a memo or note keeps its words', { todo: 'test first' }, async () => {
  const { rowShows } = await cap();
  assert.deepEqual(rowShows('photo', null), { picture: true, words: 'Photo' }, 'a photo with no caption: its picture and the kind\'s word, never the picture alone');
  assert.deepEqual(rowShows('video', 'the fountain'), { picture: true, words: 'the fountain' });
  assert.deepEqual(rowShows('text', 'cardamom'), { picture: false, words: 'cardamom' });
  assert.deepEqual(rowShows('voice', null), { picture: false, words: 'Voice memo' });
});

test('TK8: once two moments are a thread the card offers an optional name; empty leaves it unnamed', { todo: 'test first' }, async () => {
  const { CAP_THREAD, nameToSave } = await cap();
  assert.equal(CAP_THREAD.made, 'The two moments are a thread now.');
  assert.equal(CAP_THREAD.nameLabel, 'Name this thread (optional)');
  assert.equal(CAP_THREAD.unnamed, 'Leave it unnamed');
  assert.equal(CAP_THREAD.done, 'Done');
  assert.equal(nameToSave('  Murals '), 'Murals');
  assert.equal(nameToSave('   '), null, 'nothing typed: nothing is saved and nothing names it');
});

test('TK9: "Connected" is said once, and no digit but a date leaves the pill, the card or the acknowledgement', { todo: 'test first' }, async () => {
  const { CAP_THREAD } = await cap();
  assert.equal(CAP_THREAD.connected, 'Connected');
  assert.equal(CAP_THREAD.inIt, 'This moment is in it');
  assert.equal(CAP_THREAD.thread, 'Add this moment to a thread');
  for (const [k, v] of Object.entries(CAP_THREAD)) assert.doesNotMatch(String(v), /\d/, `${k} holds no digit`);
});

test('TK11: a thread that cannot be made says "Could not connect" and changes nothing; a failed name says so', { todo: 'test first' }, async () => {
  const { CAP_THREAD } = await cap();
  assert.equal(CAP_THREAD.failed, 'Could not connect');
  assert.equal(CAP_THREAD.nameFailed, 'Could not name it');
  const ports = fakePorts();
  const threads = createThreads(ports, { schedule: () => {} });
  await ports.db.addMoment(momentOf(moment('m1', 1)));
  assert.equal(await threads.startThread(['m1', 'gone']), null, 'a moment no longer kept makes no thread');
  assert.equal((await ports.db.listThreads()).threads.length, 0);
  await ports.db.addMoment(momentOf(moment('m2', 2)));
  const id = await threads.startThread(['m1', 'm2']);
  assert.ok(id);
  ports.db.failNext('applyThreads');
  await assert.rejects(threads.rename(id!, 'Murals'), 'a failed rename reaches the card, which keeps the field');
  assert.equal((await ports.db.listThreads()).threads[0].name, null, 'and the thread stays unnamed');
});
