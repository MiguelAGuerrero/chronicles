import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterPicker, type PickItem } from '../../threads/picker';
import { answeredBy } from '../../threads/timeline';
import { clipWords, headingOf } from '../../threads/lines';
import { removalDissolves } from '../../threads/rules';
import { createThreads } from '../../threads/shell';
import { fakePorts } from '../fakes';
import type { Capture } from '../../types';

const moment = (id: string, t: number): Capture => ({ id, walk_id: null, t, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: `note ${id}`, segment_id: null });
const item = (i: number, more: Partial<PickItem> = {}): PickItem => ({ id: `m${i}`, t: i, words: `word${i}`, context: `Providence, Oct ${(i % 28) + 1}`, ...more });

test('owner-threads audit 1: a reply names the moment it answers wherever it is kept, not only inside the thread', () => {
  const links = [{ from_id: 'r', to_id: 'a', created_at: 1 }, { from_id: 'r', to_id: 'b', created_at: 2 }];
  assert.equal(answeredBy('r', links), 'b', 'the latest link says what it answers');
  assert.equal(answeredBy('a', links), null);
});

test('owner-threads audit 3: the picker reaches a moment beyond the first page, and finds one by its place or date', () => {
  const items = Array.from({ length: 150 }, (_, i) => item(i, { words: i === 3 ? null : `word${i}`, context: i === 3 ? 'Fox Point, Mar 3' : 'Providence, Oct 20' }));
  const first = filterPicker(items, { hidden: new Set(), self: 'none', query: '', limit: 60 });
  assert.equal(first.shown.length, 60);
  assert.equal(first.more, true, 'there is more to show');
  assert.equal(filterPicker(items, { hidden: new Set(), self: 'none', query: '', limit: 200 }).shown.length, 150, 'asking for more reaches them all');
  const byPlace = filterPicker(items, { hidden: new Set(), self: 'none', query: 'fox point', limit: 60 });
  assert.deepEqual(byPlace.shown.map((i) => i.id), ['m3'], 'a photo with no words is found by its place');
  assert.deepEqual(filterPicker(items, { hidden: new Set(), self: 'none', query: 'word149', limit: 60 }).shown.map((i) => i.id), ['m149']);
});

test('owner-threads audit 4: a moment waiting in the Undo window, and the moment itself, are not offered', () => {
  const items = [item(1), item(2), item(3)];
  const got = filterPicker(items, { hidden: new Set(['m2']), self: 'm3', query: '', limit: 60 });
  assert.deepEqual(got.shown.map((i) => i.id), ['m1']);
});

test('owner-threads audit 5: removing the second-to-last moment would dissolve the thread, and the screen can say so', () => {
  const members = [{ thread_id: 't', moment_id: 'a', added_at: 1 }, { thread_id: 't', moment_id: 'b', added_at: 1 }, { thread_id: 'u', moment_id: 'a', added_at: 1 }, { thread_id: 'u', moment_id: 'b', added_at: 1 }, { thread_id: 'u', moment_id: 'c', added_at: 1 }];
  assert.equal(removalDissolves(members, 't'), true);
  assert.equal(removalDissolves(members, 'u'), false);
});

test('owner-threads audit 6: two replies fired together join one thread, not two', async () => {
  const ports = fakePorts();
  const threads = createThreads(ports, { schedule: () => {} });
  for (const id of ['a', 'r1', 'r2']) await ports.db.addCapture(moment(id, 1));
  await Promise.all([threads.reply('r1', 'a'), threads.reply('r2', 'a')]);
  const got = await ports.db.listThreads();
  assert.equal(got.threads.length, 1);
  assert.deepEqual(got.members.map((m) => m.moment_id).sort(), ['a', 'r1', 'r2']);
  assert.equal(got.links.length, 2);
});

test('owner-threads audit 7: a reply to a moment deleted before it was written makes nothing, and says so', async () => {
  const ports = fakePorts();
  const threads = createThreads(ports, { schedule: () => {} });
  for (const id of ['a', 'r']) await ports.db.addCapture(moment(id, 1));
  const first = threads.reply('r', 'a');
  await ports.db.deleteCaptures(['a']);
  assert.equal(await first, false);
  const got = await ports.db.listThreads();
  assert.deepEqual([got.threads, got.members, got.links], [[], [], []]);
});

test('owner-threads audit 13: Keep as my thread keeps no name the owner did not give', async () => {
  const ports = fakePorts();
  const threads = createThreads(ports, { schedule: () => {} });
  for (const id of ['a', 'b']) await ports.db.addCapture(moment(id, 1));
  const id = await threads.startThread(['a', 'b']);
  assert.equal((await ports.db.listThreads()).threads.find((t) => t.id === id)?.name, null);
});

test('owner-threads audit 16: an unnamed thread\'s second line ends at a word with an ellipsis, never mid-word', () => {
  const long = 'Someone said I looked strong at the pier and then another person agreed with them completely';
  assert.equal(clipWords(long, 40), 'Someone said I looked strong at the pier…');
  assert.equal(clipWords('Short words.', 40), 'Short words.');
  assert.equal(clipWords('Unbroken'.repeat(20), 10), 'UnbrokenUn…', 'one long word is cut, still with an ellipsis');
  const sub = headingOf({ name: null, place: null, t: 1, words: long.repeat(2) }, 2).sub!;
  assert.ok(sub.endsWith('…'));
  assert.ok(long.repeat(2).startsWith(sub.slice(0, -1)) && long.repeat(2).charAt(sub.length - 1) === ' ', 'cut at a space');
});
