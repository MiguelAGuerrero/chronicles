/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { failedMemo, memoFile } from '../../media/memoSave';

// A voice memo whose save fails (docs/DEFERRED.md, Navigate, ready: the two [loop] memo items).

const hook = () => readFileSync('src/lib/useCaptures.ts', 'utf8');
/** The body of one of useCaptures' functions, from its name to the next of its siblings. */
const body = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  assert.ok(a >= 0, `useCaptures has ${from}`);
  const b = src.indexOf(to, a + from.length);
  return src.slice(a, b < 0 ? undefined : b);
};

test('tend captures 1: a stopped memo holds the recorder’s file only when this memo set it', () => {
  // Phones name a new file at each prepare; the web sets one when a stop answers.
  assert.equal(memoFile(null, 'blob:a'), 'blob:a');
  assert.equal(memoFile('file:///r-1.m4a', 'file:///r-2.m4a'), 'file:///r-2.m4a');
  // A web stop given up on after 3 s leaves no file, or the last memo's: neither is this memo's.
  assert.equal(memoFile(null, null), null);
  assert.equal(memoFile('blob:a', 'blob:a'), null);
  assert.equal(memoFile('blob:a', null), null);
});

test('tend captures 1: a memo with no file is never held for a Retry that cannot work; one with a file is', () => {
  assert.deepEqual(failedMemo({ file: null, outOfSpace: false }), { hold: 'none', line: 'Couldn’t save this voice memo.', result: 'lost' });
  // Out of room cannot be why a memo with no file failed: it is never told "held here for Retry".
  assert.deepEqual(failedMemo({ file: null, outOfSpace: true }), { hold: 'none', line: 'Couldn’t save this voice memo.', result: 'lost' });
  assert.deepEqual(failedMemo({ file: 'blob:b', outOfSpace: false }), { hold: 'here', line: 'Couldn’t save this voice memo.', result: 'failed' });
  assert.deepEqual(failedMemo({ file: 'blob:b', outOfSpace: true }), { hold: 'here', line: 'Not saved: there is no room left. It is held here for Retry.', result: 'failed' });
});

test('tend captures 1: useCaptures takes a stopped memo’s file and its failures through these decisions', () => {
  const src = hook();
  // The uri the recorder held before this memo is read before its prepare, and the stop keeps only a new one.
  const start = body(src, 'const startVoice', 'async function stopRecorder');
  assert.ok(start.indexOf('memoUriBefore.current = voice.uri') >= 0 && start.indexOf('memoUriBefore.current = voice.uri') < start.indexOf('voice.prepareToRecordAsync()'), 'startVoice notes the uri before its prepare');
  assert.match(body(src, 'async function stopRecorder', 'const memoKeepable'), /uri: memoFile\(memoUriBefore\.current, voice\.uri\)/);
  // Every save that fails is worded and held (or not) by failedMemo, through keepMemo: the save and its Undo. A memo is
  // held only by the one holder (unsaved captures UN1), never by a screen's own state.
  assert.match(body(src, 'async function keepMemo', 'const finishVoice'), /failedMemo\(/, 'keepMemo goes through failedMemo');
  for (const [from, to] of [['const finishVoice', 'const retrySave'], ['const undoDiscard', '// Leaving the screen']]) {
    const fn = body(src, from, to);
    assert.match(fn, /keepMemo\(m\)/, `${from} keeps the memo through keepMemo`);
    assert.doesNotMatch(fn, /setUnsaved\(/, `${from} never holds a memo by itself`);
  }
});
