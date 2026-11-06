import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addChange, canMakeThread, cleanName, replyChange, thinThreads, threadForReply, threadsOf, visibleThreads } from '../../threads/rules';
import { answeringLine, contextLine, headingOf, IN_A_THREAD, sizeWord, threadLine } from '../../threads/lines';
import { buildTimeline } from '../../threads/timeline';
import type { Member, ThreadsData } from '../../threads/types';

const NOW = new Date(2026, 10, 6, 12).getTime();
const at = (m: number, d: number, y = 2026) => new Date(y, m, d, 9).getTime();
const mem = (thread_id: string, moment_id: string, added_at = 1): Member => ({ thread_id, moment_id, added_at });

test('OT2: a reply joins the thread it was started from, else the oldest, else a new unnamed thread of the two', () => {
  const members = [mem('a', 'm1', 1), mem('b', 'm1', 2), mem('b', 'm2', 3)];
  assert.equal(threadForReply('m1', members, 'b'), 'b');
  assert.equal(threadForReply('m1', members, 'zzz'), 'a', 'a thread the answered moment is not in is ignored');
  assert.equal(threadForReply('m1', members), 'a');
  const joined = replyChange({ replyId: 'r', answeredId: 'm1', members, from: 'b', newThreadId: 'new', now: 9 });
  assert.deepEqual(joined.putLinks, [{ from_id: 'r', to_id: 'm1', created_at: 9 }]);
  assert.deepEqual(joined.putMembers, [{ thread_id: 'b', moment_id: 'r', added_at: 9 }]);
  assert.equal(joined.putThreads, undefined);
  const fresh = replyChange({ replyId: 'r', answeredId: 'x', members, newThreadId: 'new', now: 9 });
  assert.deepEqual(fresh.putThreads, [{ id: 'new', name: null, created_at: 9 }]);
  assert.deepEqual(fresh.putMembers?.map((m) => m.moment_id).sort(), ['r', 'x']);
  assert.deepEqual(fresh.putLinks, [{ from_id: 'r', to_id: 'x', created_at: 9 }]);
});

test('OT6: a thread needs two distinct kept moments, and nothing else joins', () => {
  const kept = new Set(['m1', 'm2']);
  assert.equal(canMakeThread(['m1', 'm2'], kept), true);
  assert.equal(canMakeThread([], kept), false, 'no empty thread');
  assert.equal(canMakeThread(['m1'], kept), false, 'none before its second moment');
  assert.equal(canMakeThread(['m1', 'm1'], kept), false, 'one moment twice is one');
  assert.equal(canMakeThread(['m1', 'a-place'], kept), false, 'only a kept moment joins');
});

test('OT7: adding a moment to a thread it is already in changes nothing', () => {
  const members = [mem('a', 'm1')];
  assert.equal(addChange('a', 'm1', members, 5), null);
  assert.deepEqual(addChange('b', 'm1', members, 5), { putMembers: [{ thread_id: 'b', moment_id: 'm1', added_at: 5 }] });
  assert.deepEqual(threadsOf('m1', { threads: [{ id: 'a', name: null, created_at: 1 }, { id: 'b', name: 'B', created_at: 1 }], members: [mem('a', 'm1', 1), mem('b', 'm1', 2)], links: [] }).map((t) => t.id), ['a', 'b'], 'a moment may be in several');
});

test('OT15: a thread with fewer than two moments dissolves, and what a waiting delete hides counts', () => {
  const members = [mem('a', 'm1'), mem('a', 'm2'), mem('b', 'm1'), mem('b', 'm2'), mem('b', 'm3')];
  assert.deepEqual(thinThreads(['a', 'b', 'c'], members), ['c'], 'a thread with no members is thin too');
  assert.deepEqual(thinThreads(['a', 'b'], members.filter((m) => m.moment_id !== 'm2')), ['a']);
  const data: ThreadsData = {
    threads: [{ id: 'a', name: 'Alpha', created_at: 1 }, { id: 'b', name: null, created_at: 1 }],
    members,
    links: [{ from_id: 'm2', to_id: 'm1', created_at: 1 }, { from_id: 'm3', to_id: 'm1', created_at: 1 }],
  };
  const seen = visibleThreads(data, new Set(['m2']));
  assert.deepEqual(seen.threads.map((t) => t.id), ['b'], 'thread a is thin while m2 waits in Undo');
  assert.deepEqual(seen.links, [{ from_id: 'm3', to_id: 'm1', created_at: 1 }]);
  assert.deepEqual(visibleThreads(data, new Set(['b'])).threads.map((t) => t.id), ['a'], 'a deleted thread is hidden at once');
  assert.deepEqual(visibleThreads(data, new Set()).threads.length, 2, 'Undo brings everything back, name and members');
});

test('OT13: the name is the owner\'s, trimmed, and none when blank', () => {
  assert.equal(cleanName('  Compliments '), 'Compliments');
  assert.equal(cleanName('   '), null);
  const h = headingOf({ name: null, place: 'Providence', t: at(9, 20), words: 'Someone said I looked strong' }, NOW);
  assert.equal(h.title, 'Providence, Oct 20', 'an unnamed thread is headed by place and date');
  assert.equal(h.sub, 'Someone said I looked strong', 'the first words are a second line, never the heading');
  assert.equal(headingOf({ name: 'Compliments', place: 'Providence', t: at(9, 20), words: 'x' }, NOW).title, 'Compliments');
  assert.equal(headingOf({ name: null, place: null, t: at(9, 20), words: null }, NOW).title, 'Oct 20', 'no place: the date alone');
});

test('OT10: a thread\'s size is a fixed set of words, nothing above three, no digit but a date', () => {
  const words = new Set<string>();
  for (let n = 0; n <= 500; n++) {
    const w = sizeWord(n);
    words.add(w);
    assert.doesNotMatch(w, /\d/);
    assert.doesNotMatch(w, /\b(four|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
  }
  assert.deepEqual([...words].sort(), ['a couple of moments', 'a few moments', 'many moments', 'several moments']);
  assert.equal(threadLine(4, at(2, 3), NOW), 'a few moments, since March');
  assert.equal(threadLine(4, at(2, 3, 2025), NOW), 'a few moments, since March 2025');
});

test('OT11: the viewer says "in a thread" and never the thread\'s name', () => {
  assert.equal(IN_A_THREAD, 'in a thread');
});

test('OT4: a reply names what it answers with both places; an orphan names nothing', () => {
  assert.equal(answeringLine({ place: 'Providence', t: at(9, 20), walkLine: 'just after the bakery' }, NOW), 'answering Providence, Oct 20, just after the bakery');
  assert.equal(answeringLine({ place: null, t: at(9, 20), walkLine: null }, NOW), 'answering Oct 20');
  const rows = buildTimeline([{ id: 'r', t: 5 }, { id: 'x', t: 1 }], [{ from_id: 'r', to_id: 'gone', created_at: 1 }]);
  assert.deepEqual(rows.map((r) => [r.moment.id, r.depth, r.answering]), [['x', 0, null], ['r', 0, null]], 'a reply whose parent is gone shows no "answering"');
});

test('OT9: a thread reads oldest first, a reply set under what it answers, every moment in context', () => {
  const ms = [{ id: 'a', t: 1 }, { id: 'b', t: 2 }, { id: 'c', t: 3 }, { id: 'd', t: 9 }];
  const rows = buildTimeline(ms, [{ from_id: 'd', to_id: 'a', created_at: 9 }]);
  assert.deepEqual(rows.map((r) => r.moment.id), ['a', 'd', 'b', 'c'], 'the late reply sits under its parent');
  assert.deepEqual(rows.map((r) => r.depth), [0, 1, 0, 0]);
  assert.equal(rows[1].answering?.id, 'a');
  assert.deepEqual(buildTimeline(ms, []).map((r) => r.moment.id), ['a', 'b', 'c', 'd']);
  const cyc = buildTimeline(ms.slice(0, 2), [{ from_id: 'a', to_id: 'b', created_at: 1 }, { from_id: 'b', to_id: 'a', created_at: 1 }]);
  assert.equal(cyc.length, 2, 'a cycle of links cannot lose or repeat a moment');
  assert.equal(contextLine({ place: 'Providence', t: at(9, 20), walkLine: '40 minutes in', now: NOW }), 'Providence, Oct 20 · 40 minutes in');
  assert.equal(contextLine({ place: null, t: at(9, 20), walkLine: null, now: NOW }), 'Oct 20', 'a moment with no walk shows place and date');
  assert.match(contextLine({ place: 'Providence', t: at(9, 20), walkLine: null, now: NOW }), /Providence/);
});
