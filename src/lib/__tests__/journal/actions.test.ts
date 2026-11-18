/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Quick actions on an entry (SW1, SW4, SW5, decision 0197): which of the four slots apply. Test first.
type Slot = { id: 'respond' | 'thread' | 'edit' | 'stack'; available: boolean; label: string };
type Actions = { quickActions(entry: { pieces: number }, ctx: { joinable: boolean }): Slot[] };
const mod = () => import('../../journal/actions' + '') as Promise<Actions>;

test('SW1: slots in the order Reaction, Respond, Thread, Edit, Stack, each named and none moved when another is empty', async () => {
  const { quickActions } = await mod();
  const full = quickActions({ pieces: 1 }, { joinable: true });
  assert.deepEqual(full.map((s) => s.id), ['react', 'respond', 'thread', 'edit', 'stack']);
  assert.deepEqual(full.map((s) => s.label), ['Reaction', 'Respond', 'Add to a thread', 'Edit', 'Join with previous']);
  assert.deepEqual(full.map((s) => s.available), [true, true, true, true, true]);
  const stack = quickActions({ pieces: 3 }, { joinable: false });
  assert.deepEqual(stack.map((s) => s.id), ['react', 'respond', 'thread', 'edit', 'stack'], 'the slots do not move');
});

test('SW4: Edit is available on a one-piece entry and empty on a stack', async () => {
  const { quickActions } = await mod();
  assert.equal(quickActions({ pieces: 1 }, { joinable: false }).find((s) => s.id === 'edit')?.available, true);
  assert.equal(quickActions({ pieces: 2 }, { joinable: false }).find((s) => s.id === 'edit')?.available, false);
});

test('SW5: Stack with previous is available only when the entry is joinable', async () => {
  const { quickActions } = await mod();
  assert.equal(quickActions({ pieces: 1 }, { joinable: true }).find((s) => s.id === 'stack')?.available, true);
  assert.equal(quickActions({ pieces: 1 }, { joinable: false }).find((s) => s.id === 'stack')?.available, false);
});

test('SW1: no label carries a digit or a count', async () => {
  const { quickActions } = await mod();
  for (const s of quickActions({ pieces: 5 }, { joinable: true })) assert.ok(!/\d/.test(s.label), s.label);
});

// Reaction in the row, captions (SW1, SW20, decision 0197, Nov 17). Test first.
type Cap = { quickActions(entry: { pieces: number }, ctx: { joinable: boolean }): { id: string; available: boolean; label: string; caption: string }[] };
const capMod = () => import('../../journal/actions' + '') as Promise<Cap>;

test('SW1: five slots, Reaction first, each with a one-word caption and none moved when another is empty', async () => {
  const { quickActions } = await capMod();
  const row = quickActions({ pieces: 1 }, { joinable: true });
  assert.deepEqual(row.map((s) => s.id), ['react', 'respond', 'thread', 'edit', 'stack']);
  assert.deepEqual(row.map((s) => s.caption), ['Reaction', 'Respond', 'Thread', 'Edit', 'Join']);
  assert.ok(row.every((s) => !/\s/.test(s.caption) && !/\d/.test(s.caption)), 'one word, no number');
  assert.deepEqual(quickActions({ pieces: 3 }, { joinable: false }).map((s) => s.id), ['react', 'respond', 'thread', 'edit', 'stack']);
});

test('SW20: Reaction is available on every entry, a stack included', async () => {
  const { quickActions } = await capMod();
  for (const n of [1, 4]) assert.equal(quickActions({ pieces: n }, { joinable: false }).find((s) => s.id === 'react')?.available, true);
});

test('stack-with-previous audit 11: the caption is the first word of the spoken name, and the toast uses the same word', async () => {
  const { quickActions } = await capMod();
  for (const s of quickActions({ pieces: 1 }, { joinable: true })) assert.ok(s.label.startsWith(s.caption) || s.id === 'thread', `${s.caption} / ${s.label}`);
  const stack = quickActions({ pieces: 1 }, { joinable: true }).find((x) => x.id === 'stack');
  assert.equal(stack?.label, 'Join with previous');
  const { toastText } = (await import('../../deletion/core' + '')) as { toastText(k: string): string };
  assert.equal(toastText('join'), 'Joined with the earlier moment');
});
