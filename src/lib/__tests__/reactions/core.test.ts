import assert from 'node:assert/strict';
import { test } from 'node:test';

// Reactions (specs/reactions, decision 0172): the model. The module is reached by name: this file ran before it existed (test first).
type Fn = (...a: any[]) => any;
const core = () => import('../../reactions/core' as string) as Promise<Record<string, any>>;

const ORDER = ['happy', 'neutral', 'sad', 'like', 'dislike', 'question', 'emphasis', 'idea'];

test('RX4: eight reactions in three families in a fixed order, each with a distinct glyph, name and family; the lows in it; a value outside the set is none', { todo: 'test first' }, async () => {
  const { REACTIONS, FAMILIES, reactionOf } = await core();
  assert.deepEqual(REACTIONS.map((r: { id: string }) => r.id), ORDER);
  assert.deepEqual(FAMILIES.map((f: { id: string; name: string }) => [f.id, f.name]), [['feeling', 'Feeling'], ['taste', 'Taste'], ['thought', 'Thought']]);
  assert.deepEqual(REACTIONS.map((r: { family: string }) => r.family), ['feeling', 'feeling', 'feeling', 'taste', 'taste', 'thought', 'thought', 'thought']);
  assert.equal(new Set(REACTIONS.map((r: { glyph: string }) => r.glyph)).size, 8);
  assert.equal(new Set(REACTIONS.map((r: { name: string }) => r.name)).size, 8);
  assert.deepEqual(REACTIONS.map((r: { lens: string }) => r.lens), ['Happy moments', 'Neutral moments', 'Sad moments', 'Likes', 'Dislikes', 'Questions', 'Emphasis', 'Ideas']);
  assert.ok(REACTIONS.some((r: { id: string }) => r.id === 'sad') && REACTIONS.some((r: { id: string }) => r.id === 'dislike'));
  assert.equal(reactionOf('idea'), 'idea');
  for (const bad of ['', 'angry', 42, {}, null, undefined, 'IDEA']) assert.equal(reactionOf(bad), null);
});

test('RX5: one per family: a reaction replaces its family\'s, the same one clears it, the other families are untouched', { todo: 'test first' }, async () => {
  const { pick } = await core();
  let s = pick({}, 'happy');
  assert.deepEqual(s, { feeling: 'happy' });
  s = pick(s, 'idea');
  assert.deepEqual(s, { feeling: 'happy', thought: 'idea' });
  s = pick(s, 'sad');
  assert.deepEqual(s, { feeling: 'sad', thought: 'idea' });
  s = pick(s, 'idea');
  assert.deepEqual(s, { feeling: 'sad' });
  const before = { taste: 'like' };
  pick(before, 'dislike');
  assert.deepEqual(before, { taste: 'like' }, 'the set given is not changed');
});

test('RX9: the sign is the face with a plus for none, else the first reaction in the families\' order', { todo: 'test first' }, async () => {
  const { signOf } = await core();
  assert.equal(signOf({}), null);
  assert.equal(signOf({ thought: 'idea', feeling: 'sad' })?.id, 'sad');
  assert.equal(signOf({ thought: 'question', taste: 'like' })?.id, 'like');
});

test('RX16, RX21: spoken in the families\' order, by name in lower case; none says nothing', { todo: 'test first' }, async () => {
  const { spokenReactions, ordered } = await core();
  assert.deepEqual(spokenReactions({ thought: 'idea', feeling: 'happy' }), ['happy', 'idea']);
  assert.deepEqual(spokenReactions({}), []);
  assert.deepEqual(ordered({ taste: 'dislike', thought: 'emphasis', feeling: 'neutral' }).map((r: { id: string }) => r.id), ['neutral', 'dislike', 'emphasis']);
});

test('RX28: stored rows read as sets: one per moment and family; a bad value or a reaction in the wrong family is dropped', { todo: 'test first' }, async () => {
  const { setsOf } = await core();
  const sets = setsOf([
    { moment_id: 'm1', family: 'feeling', reaction: 'happy', set_at: 1 },
    { moment_id: 'm1', family: 'thought', reaction: 'idea', set_at: 2 },
    { moment_id: 'm2', family: 'taste', reaction: 'nonsense', set_at: 3 },
    { moment_id: 'm3', family: 'taste', reaction: 'idea', set_at: 4 },
  ]) as Map<string, unknown>;
  assert.deepEqual(sets.get('m1'), { feeling: 'happy', thought: 'idea' });
  assert.equal(sets.has('m2'), false);
  assert.equal(sets.has('m3'), false);
});

test('RX29: kept note types become their moment\'s reactions, the earliest note winning its family; nothing else is read', { todo: 'test first' }, async () => {
  const { migrateTypes } = await core();
  const rows = migrateTypes([
    { id: 'p2', moment_id: 'm1', t: 20, kind: 'text', note_type: 'sad' },
    { id: 'p1', moment_id: 'm1', t: 10, kind: 'text', note_type: 'happy' },
    { id: 'p3', moment_id: 'm1', t: 30, kind: 'text', note_type: 'idea' },
    { id: 'p4', moment_id: 'm2', t: 5, kind: 'text', note_type: 'like' },
    { id: 'p5', moment_id: 'm3', t: 5, kind: 'text', note_type: 'bogus' },
    { id: 'p6', moment_id: 'm4', t: 5, kind: 'text', note_type: null },
  ]);
  assert.deepEqual(rows.map((r: { moment_id: string; family: string; reaction: string }) => [r.moment_id, r.family, r.reaction]).sort(), [
    ['m1', 'feeling', 'happy'], ['m1', 'thought', 'idea'], ['m2', 'taste', 'like'],
  ]);
});

test('RX33: nothing in the model takes a moment\'s words, picture, time or place: no function reads a body, a file or a fix', { todo: 'test first' }, async () => {
  const mod = await core();
  const fns = Object.entries(mod).filter(([, v]) => typeof v === 'function') as [string, Fn][];
  assert.ok(fns.length > 0);
  for (const [name] of fns) assert.doesNotMatch(name, /infer|guess|suggest|detect|auto/i, `${name}: no reaction is ever guessed`);
  // A moment's words never choose one: setsOf and migrateTypes read only stored reactions and types.
  assert.deepEqual([...mod.setsOf([{ moment_id: 'm', family: 'thought', reaction: null, set_at: 1, body: 'what an idea' }]).keys()], []);
  assert.deepEqual(mod.migrateTypes([{ id: 'p', moment_id: 'm', t: 1, kind: 'text', body: 'such a happy idea', note_type: null }]), []);
});
