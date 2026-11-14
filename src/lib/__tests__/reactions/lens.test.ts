import assert from 'node:assert/strict';
import { test } from 'node:test';

// Reactions' lenses (RX23-RX27): the only code that gathers moments by a reaction. Reached by name: test first.
const lens = () => import('../../reactions/lens' as string) as Promise<Record<string, any>>;

const sets = new Map<string, Record<string, string>>([
  ['m1', { thought: 'idea', feeling: 'happy' }],
  ['m2', { thought: 'idea' }],
  ['m3', { taste: 'dislike' }],
  ['gone', { feeling: 'sad' }],
]);
const moment = (id: string, t: number, words = '') => ({ id, t, words });

test('RX23: one row per reaction a kept moment has, in the set\'s order under its family, with no number anywhere; with none, one line', async () => {
  const { lensRows, LENS_EMPTY } = await lens();
  const groups = lensRows(sets, new Set(['m1', 'm2', 'm3']));
  assert.deepEqual(groups.map((g: { family: string; rows: { id: string }[] }) => [g.family, g.rows.map((r) => r.id)]), [['feeling', ['happy']], ['taste', ['dislike']], ['thought', ['idea']]]);
  assert.deepEqual(groups.map((g: { name: string }) => g.name), ['Feeling', 'Taste', 'Thought']);
  assert.doesNotMatch(JSON.stringify(groups), /\d/, 'no count, number or share');
  assert.equal(groups.flatMap((g: { rows: { id: string }[] }) => g.rows).some((r: { id: string }) => r.id === 'sad'), false, 'a reaction only a deleted moment has is not listed');
  assert.deepEqual(lensRows(new Map(), new Set()), []);
  assert.equal(LENS_EMPTY, 'When you react to a moment, it gathers here.');
});

test('RX24: a lens is every kept moment with the reaction, oldest first, one list', async () => {
  const { lensMoments } = await lens();
  const got = lensMoments(sets, 'idea', [moment('m2', 30), moment('m3', 10), moment('m1', 20)]);
  assert.deepEqual(got.map((m: { id: string }) => m.id), ['m1', 'm2']);
});

test('RX26: a cleared reaction or a deleted moment leaves its lens; a lens left empty leaves the list', async () => {
  const { lensMoments, lensRows } = await lens();
  const cleared = new Map(sets);
  cleared.set('m2', {});
  assert.deepEqual(lensMoments(cleared, 'idea', [moment('m1', 1), moment('m2', 2)]).map((m: { id: string }) => m.id), ['m1']);
  assert.deepEqual(lensMoments(sets, 'idea', [moment('m2', 2)]).map((m: { id: string }) => m.id), ['m2'], 'm1 deleted: only what is kept');
  const rows = lensRows(sets, new Set(['m1', 'm2'])).flatMap((g: { rows: { id: string }[] }) => g.rows.map((r) => r.id));
  assert.equal(rows.includes('dislike'), false);
});

test('RX27: only the owner\'s reactions put a moment in a lens: its words, place, time or walk never do', async () => {
  const { lensMoments } = await lens();
  const got = lensMoments(sets, 'idea', [moment('m3', 1, 'a brilliant idea'), moment('x', 2, 'idea idea')]);
  assert.deepEqual(got, []);
});
