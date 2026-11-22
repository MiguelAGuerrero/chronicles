import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as picker from '../../threads/picker';
import type { Member } from '../../threads/types';

// Thread a moment as it is kept (specs/thread-at-capture, decision 0253): what the card offers first and what its
// search finds, from the owner's threads alone. Read through the module so a missing export fails at the call.
type Row = { id: string; title: string; words: string | null; latest: number; has: boolean };
const api = picker as unknown as {
  lastAddedTo: (members: Member[], threadIds: ReadonlySet<string>) => string | null;
  threadMatches: (row: { title: string; words: string | null }, query: string) => boolean;
  threadChoices: (rows: Row[], o: { query: string; last: string | null }) => { last: Row | null; rest: Row[] };
};

const m = (thread_id: string, moment_id: string, added_at: number): Member => ({ thread_id, moment_id, added_at });
const row = (id: string, title: string, latest: number, more: Partial<Row> = {}): Row => ({ id, title, words: null, latest, has: false, ...more });

test('CT4: the thread last added to is the one whose newest membership is the latest, read from the members alone', () => {
  const members = [m('murals', 'a', 10), m('murals', 'b', 10), m('compliments', 'c', 5), m('compliments', 'd', 30), m('gone', 'e', 99)];
  assert.equal(api.lastAddedTo(members, new Set(['murals', 'compliments'])), 'compliments', 'the newest membership wins, not the newest thread');
  assert.equal(api.lastAddedTo(members, new Set(['murals'])), 'murals', 'a thread not shown (dissolved, hidden) is never offered');
  assert.equal(api.lastAddedTo([], new Set()), null, 'no thread yet: nothing is first');
});

test('CT4: with no search the card opens on Last added to, then the other threads by their newest moment', () => {
  const rows = [row('old', 'Fox Point, Oct 20', 100), row('murals', 'Murals', 50), row('new', 'Compliments', 300, { has: true })];
  const c = api.threadChoices(rows, { query: '', last: 'murals' });
  assert.equal(c.last?.id, 'murals');
  assert.deepEqual(c.rest.map((r) => r.id), ['new', 'old'], 'the rest, newest moment first, the last one not repeated');
  assert.equal(c.rest[0].has, true, 'a thread holding the moment stays listed, to be shown as "This moment is in it"');
  const none = api.threadChoices(rows, { query: '', last: null });
  assert.equal(none.last, null);
  assert.deepEqual(none.rest.map((r) => r.id), ['new', 'old', 'murals']);
});

test('CT5: the search finds a thread by its name or its heading words, and nothing else', () => {
  assert.equal(api.threadMatches({ title: 'Murals', words: null }, 'mur'), true, 'by its name, any case');
  assert.equal(api.threadMatches({ title: 'Fox Point, Oct 20', words: 'the painted wall behind the laundromat' }, 'laundromat'), true, 'by its first words');
  assert.equal(api.threadMatches({ title: 'Fox Point, Oct 20', words: null }, 'fox point'), true, 'by its place and date heading');
  assert.equal(api.threadMatches({ title: 'Murals', words: null }, 'bakery'), false);
  assert.equal(api.threadMatches({ title: 'Murals', words: null }, '   '), true, 'a blank search is no search');
  const rows = [row('a', 'Murals', 1), row('b', 'Compliments', 2), row('c', 'Mural walk', 3)];
  const c = api.threadChoices(rows, { query: 'mural', last: 'a' });
  assert.equal(c.last, null, 'while searching there is no "Last added to" heading');
  assert.deepEqual(c.rest.map((r) => r.id), ['c', 'a'], 'the matches, newest moment first');
  assert.deepEqual(api.threadChoices(rows, { query: 'zzz', last: 'a' }).rest, [], 'nothing found is an empty list, said in words by the card');
});

test('CT12: a row in Add to a thread says its time of day after its date, so two moments of one walk read apart', async () => {
  const lines = (await import('../../threads/lines')) as unknown as { pickLine?: (o: { place: string | null; t: number; walkLine: string | null; now: number }) => string };
  assert.equal(typeof lines.pickLine, 'function');
  const now = new Date(2026, 10, 21, 18, 0).getTime();
  const walk = 'From Saturday afternoon walk';
  const a = lines.pickLine!({ place: null, t: new Date(2026, 10, 21, 16, 12).getTime(), walkLine: walk, now });
  const b = lines.pickLine!({ place: null, t: new Date(2026, 10, 21, 15, 48).getTime(), walkLine: walk, now });
  assert.equal(a, 'Nov 21, 4:12 pm · From Saturday afternoon walk');
  assert.notEqual(a, b, 'two moments of one walk read apart in words');
  assert.equal(lines.pickLine!({ place: 'Fox Point', t: new Date(2026, 10, 2, 10, 5).getTime(), walkLine: null, now }), 'Fox Point, Nov 2, 10:05 am', 'the place first, as the context line has it');
});

test('tend threads T56: Back and Escape on "Join it with another moment" return to the threads; elsewhere they close', () => {
  const backFrom = (picker as unknown as { backFrom: (step: 'threads' | 'moment' | 'name') => 'threads' | 'close' }).backFrom;
  assert.equal(typeof backFrom, 'function', 'the card asks one core rule what Back does');
  assert.equal(backFrom('moment'), 'threads', 'changing one\'s mind on the second step keeps the card (NN/g H3)');
  assert.equal(backFrom('threads'), 'close');
  assert.equal(backFrom('name'), 'close', 'the thread is made: Back leaves, the typed name kept (thread-at-capture audit 3)');
});
