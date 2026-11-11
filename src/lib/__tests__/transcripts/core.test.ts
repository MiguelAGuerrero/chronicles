/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mod, row } from './fixtures';

// Memo transcripts (specs/memo-transcripts): the pure decisions. Written before the module (`transcribe/core`).
const A = 'fake-a@aaaa';
const B = 'fake-b@bbbb';
const memos = [{ piece_id: 'm3', t: 30 }, { piece_id: 'm1', t: 10 }, { piece_id: 'm2', t: 20 }];

test('MX17: the next memo to read is the oldest one with no transcript at the installed tag', async () => {
  const { nextToRead } = await mod('core');
  assert.equal(nextToRead(memos, [], A)?.piece_id, 'm1');
  assert.equal(nextToRead(memos, [row('m1', 'hi', A)], A)?.piece_id, 'm2');
  assert.equal(nextToRead(memos, memos.map((m) => row(m.piece_id, 'x', A)), A), null);
});

test('MX5: a transcript at another tag is stale and read again; its words stay until replaced', async () => {
  const { nextToRead, wordsOf } = await mod('core');
  const old = [row('m1', 'old words', B)];
  assert.equal(nextToRead(memos, old, A)?.piece_id, 'm1');
  assert.equal(wordsOf(old[0]), 'old words', 'a stale transcript is still shown (MX5, MX32)');
});

test('MX18: a memo tried twice at this tag is left; a failed try is a row with no words', async () => {
  const { nextToRead, wordsOf } = await mod('core');
  const failed = (n: number) => [row('m1', null, A, { tries: n })];
  assert.equal(nextToRead(memos, failed(1), A)?.piece_id, 'm1');
  assert.equal(nextToRead(memos, failed(2), A)?.piece_id, 'm2', 'two tries and it is left alone');
  assert.equal(wordsOf(failed(1)[0]), null);
  assert.equal(nextToRead(memos, [row('m1', null, B, { tries: 2 })], A)?.piece_id, 'm1', 'a new tag gets its own tries');
});

test('MX19: silence is a transcript of no words, read once and never shown', async () => {
  const { nextToRead, wordsOf } = await mod('core');
  assert.equal(nextToRead(memos, [row('m1', '', A)], A)?.piece_id, 'm2');
  assert.equal(wordsOf(row('m1', '', A)), null);
  assert.equal(wordsOf(row('m1', '   \n ', A)), null);
});

test('MX1, MX3: the words are trimmed and nothing else is changed', async () => {
  const { wordsOf } = await mod('core');
  assert.equal(wordsOf(row('m1', '  I like the  bakery, honestly.\n', A)), 'I like the  bakery, honestly.');
  assert.equal(wordsOf(undefined), null);
});

test('MX17: a run needs the switch, the model, the engine, the foreground and no recording walk', async () => {
  const { mayRun } = await mod('core');
  const ok = { on: true, installed: true, available: true, foreground: true, recording: false };
  assert.equal(mayRun(ok), true);
  for (const k of Object.keys(ok)) assert.equal(mayRun({ ...ok, [k]: !(ok as any)[k] }), false, k);
});

test('MX13: the state words appear only while the switch is on or its row is open', async () => {
  const { stateLine } = await mod('core');
  const gone = { installed: false, room: true, supported: true };
  assert.equal(stateLine({ ...gone, on: false, open: false }), null, 'off: the row shows its sub-line and nothing else');
  assert.match(stateLine({ ...gone, on: true, open: false }), /Not installed/);
  assert.match(stateLine({ ...gone, on: false, open: true }), /Not installed/);
  assert.equal(stateLine({ on: true, open: false, installed: true, room: true, supported: true }), null);
});

test('MX14, MX27: no room and no support are said in words', async () => {
  const { stateLine, roomEnough } = await mod('core');
  assert.equal(roomEnough(10, 60), false);
  assert.equal(roomEnough(null, 60), true, 'an unreadable room tries (as storage awareness reads nothing as fine, SA1)');
  assert.match(stateLine({ on: true, open: true, installed: false, room: false, supported: true }), /room/i);
  assert.match(stateLine({ on: true, open: true, installed: false, room: true, supported: false }), /can.t/i);
});

test('MX23, MX1: the copy has no digit and no count, and the label is the owner\'s', async () => {
  const core = await mod('core');
  assert.equal(core.LABEL, 'Heard by this phone');
  for (const [k, v] of Object.entries(core.COPY as Record<string, unknown>)) {
    const s = typeof v === 'function' ? (v as (x: string) => string)('about sixty megabytes') : String(v);
    assert.doesNotMatch(s, /[0-9]/, `${k}: ${s}`);
    assert.doesNotMatch(s, /whisper|transformers|onnx/i, `${k} names a library (MX28)`);
  }
});
