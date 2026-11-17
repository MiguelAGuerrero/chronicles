/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Unsaved captures have one owner (specs/unsaved-captures, UN1-UN15): the words and the decisions, no fakes.

const core = async () => import('../../unsaved/core');

test('UN2: the memo pill names one or several in words, in each screen’s noun', async () => {
  const { memoLabel } = await core();
  assert.equal(memoLabel(0, 'Voice memo'), null);
  assert.equal(memoLabel(1, 'Voice memo'), 'Voice memo not saved');
  assert.equal(memoLabel(3, 'Voice memo'), 'Voice memos not saved');
  assert.equal(memoLabel(2, 'Voice note'), 'Voice notes not saved');
});

test('UN2: what is held is read as a key of its kinds, in the order taken, and back', async () => {
  const { heldKey, kindsOf, shotKinds } = await core();
  const list = [{ kind: 'voice' as const }, { kind: 'photo' as const }, { kind: 'video' as const }];
  assert.equal(heldKey(list), 'voice,photo,video');
  assert.equal(heldKey([]), '');
  assert.deepEqual(kindsOf('voice,photo,video'), ['voice', 'photo', 'video']);
  assert.deepEqual(kindsOf(''), []);
  assert.deepEqual(shotKinds(list), ['photo', 'video']);
});

test('UN4: a held capture is kept into its own walk, or as a moment of its own outside one', async () => {
  const { folderOf } = await core();
  assert.equal(folderOf('w1'), 'w1');
  assert.equal(folderOf(null), 'moments');
});

test('UN5: Stop warns while something of the walk is held that it has not warned of, and only then', async () => {
  const { stopWarns } = await core();
  assert.equal(stopWarns([], []), false);
  assert.equal(stopWarns(['a'], []), true);
  // The second hold ends the walk without it.
  assert.equal(stopWarns(['a'], ['a']), false);
  // One held after the warning is warned of again, even with the first kept meanwhile.
  assert.equal(stopWarns(['b'], ['a']), true);
  assert.equal(stopWarns(['a', 'b'], ['a']), true);
});

test('UN5: the walk screen’s warning names what is held in words, as today', async () => {
  const { stopWarning } = await core();
  assert.equal(stopWarning(['voice']), 'The voice memo could not be saved. Retry, or hold Stop again to end the walk without it.');
  assert.equal(stopWarning(['voice', 'voice']), 'Voice memos not saved yet. Retry, or hold Stop again to end the walk without them.');
  assert.equal(stopWarning(['photo']), 'Photo not saved yet. Retry, or hold Stop again to end the walk without it.');
  assert.equal(stopWarning(['photo', 'photo']), 'Photos not saved yet. Retry, or hold Stop again to end the walk without them.');
  assert.equal(stopWarning(['photo', 'voice']), 'Photo and voice memo not saved yet. Retry, or hold Stop again to end the walk without them.');
  assert.equal(stopWarning(['video', 'photo', 'voice', 'voice']), 'Photos, videos and voice memos not saved yet. Retry, or hold Stop again to end the walk without them.');
});

test('UN6: the recording bar’s warning promises no Retry on the bar', async () => {
  const { barWarning } = await core();
  assert.equal(barWarning(false), 'Not saved yet. Hold Stop again to end without it.');
  assert.equal(barWarning(true), 'Not saved yet. Hold Stop again to end without them.');
  assert.doesNotMatch(barWarning(true), /Retry/);
});

test('UN8, UN12: a walk let go leaves no file: a file not yet kept is dropped, a kept one removed', async () => {
  const { letGoFiles } = await core();
  assert.deepEqual(letGoFiles([
    { uri: 'blob:a', path: null },
    { uri: 'blob:b', path: 'walks/w1/b.jpg' },
    { uri: null, path: null },
  ]), { temps: ['blob:a'], kept: ['walks/w1/b.jpg'] });
});

test('UN9: a failure is said in SA9’s words where its pill shows', async () => {
  const { heldWhere } = await core();
  assert.equal(heldWhere('voice', true, 'here'), 'Not saved: there is no room left. It is held here for Retry.');
  assert.equal(heldWhere('photo', false, 'here'), 'Couldn’t save this photo.');
});

test('UN10: a screen with no Retry says where the Retry is, never "held here"', async () => {
  const { heldWhere } = await core();
  assert.equal(heldWhere('photo', true, 'walk'), 'Not saved: there is no room left. It is held for Retry on the walk screen.');
  assert.equal(heldWhere('voice', true, 'memories'), 'Not saved: there is no room left. It is held for Retry on Memories.');
  assert.equal(heldWhere('video', false, 'walk'), 'Couldn’t save this video.');
  assert.equal(heldWhere('voice', false, 'memories'), 'Couldn’t save this voice memo.');
});

test('UN11: a capture for an open moment deleted meanwhile is kept as a moment of its own', async () => {
  const { retryInto } = await core();
  assert.equal(retryInto('m1', true), 'm1');
  assert.equal(retryInto('m1', false), null);
  assert.equal(retryInto(null, false), null);
});

test('UN13: a memo lost at Stop is said, and the walk ends only on a second hold', async () => {
  const { lostAtStop } = await core();
  assert.equal(lostAtStop('Couldn’t save this voice memo.'), 'Couldn’t save this voice memo. Hold Stop again to end the walk.');
});

test('UN14: no pill or warning holds a digit', async () => {
  const { memoLabel, stopWarning, barWarning, heldWhere } = await core();
  const many = Array.from({ length: 12 }, () => 'voice' as const);
  const words = [memoLabel(12, 'Voice memo'), memoLabel(12, 'Voice note'), stopWarning(many), stopWarning(['photo', 'video', ...many]), barWarning(true),
    heldWhere('photo', true, 'walk'), heldWhere('voice', true, 'memories')];
  for (const w of words) assert.doesNotMatch(String(w), /[0-9]/, String(w));
});
