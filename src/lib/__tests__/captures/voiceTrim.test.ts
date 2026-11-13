/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { emptyEdit, trimLabel } from '../../mediaEdit';
import { applyPatch, captureBus } from '../../captureBus';
import { facedAt, type Faced } from '../../moment';
import { memoLengthMs, memoLengthText, memoWords, trimmedLine, voiceClock, voiceReachedEnd, voiceSpan, voiceState, wholeMs } from '../../voiceTrim';

// Voice trim (VT6, VT8, VT10, VT11, VT12), written from the criteria before the code.

const trimmed = (start_ms: number, end_ms: number) => ({ ...emptyEdit(), trim: { start_ms, end_ms } });

test('VT8: with no trim the span is the whole memo', () => {
  assert.deepEqual(voiceSpan(null, 58_000), { startMs: 0, endMs: 58_000, lengthMs: 58_000 });
  assert.deepEqual(voiceSpan(undefined, 58_000), { startMs: 0, endMs: 58_000, lengthMs: 58_000 });
});

test('VT8: a trim is the span, clamped to the memo’s length', () => {
  assert.deepEqual(voiceSpan({ start_ms: 2000, end_ms: 41_000 }, 58_000), { startMs: 2000, endMs: 41_000, lengthMs: 39_000 });
  assert.deepEqual(voiceSpan({ start_ms: 2000, end_ms: 90_000 }, 58_000), { startMs: 2000, endMs: 58_000, lengthMs: 56_000 });
  assert.deepEqual(voiceSpan({ start_ms: 2000, end_ms: 9000 }, 0), { startMs: 0, endMs: 0, lengthMs: 0 });
});

test('VT6, VT8: the clock reads inside the kept part and never outside it', () => {
  const span = voiceSpan({ start_ms: 2000, end_ms: 41_000 }, 58_000);
  assert.deepEqual(voiceClock(2, span), { atMs: 0, ofMs: 39_000 });
  assert.deepEqual(voiceClock(5.5, span), { atMs: 3500, ofMs: 39_000 });
  assert.deepEqual(voiceClock(0.5, span), { atMs: 0, ofMs: 39_000 });
  assert.deepEqual(voiceClock(50, span), { atMs: 39_000, ofMs: 39_000 });
});

test('VT6, VT8: a position before the start is brought to it, at the end the memo is finished', () => {
  const span = voiceSpan({ start_ms: 2000, end_ms: 41_000 }, 58_000);
  assert.equal(voiceState(0, span), 'before');
  assert.equal(voiceState(1.9, span), 'before');
  assert.equal(voiceState(2, span), 'inside');
  assert.equal(voiceState(20, span), 'inside');
  assert.equal(voiceState(41, span), 'end');
  assert.equal(voiceState(60, span), 'end');
  // No trim: the start is 0, so nothing is ever "before".
  assert.equal(voiceState(0, voiceSpan(null, 10_000)), 'inside');
});

test('VT10: the length said is the kept length', () => {
  assert.equal(memoLengthMs({ body: '58000' }), 58_000);
  assert.equal(memoLengthMs({ body: '58000', edit: trimmed(2000, 41_000) }), 39_000);
  assert.equal(memoWords({ body: '58000' }), 'Voice memo, 0:58');
  assert.equal(memoWords({ body: '58000', edit: trimmed(2000, 41_000) }), 'Voice memo, 0:39');
  // A memo with no known length says no time.
  assert.equal(memoWords({ body: '' }), 'Voice memo');
  assert.equal(memoWords({ body: '0' }), 'Voice memo');
});

test('VT11: a trimmed memo says so with both times; a whole one says nothing', () => {
  assert.equal(trimmedLine({ body: '58000', edit: trimmed(2000, 41_000) }), 'Trimmed · 0:39 of 0:58');
  assert.equal(trimmedLine({ body: '58000' }), null);
  assert.equal(trimmedLine({ body: '58000', edit: emptyEdit() }), null);
  assert.equal(trimmedLine({ body: '58000', edit: trimmed(0, 58_000) }), null);
});

test('VT12: every file that plays a memo reads the trim through lib/voiceTrim', () => {
  const root = join(__dirname, '..', '..', '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(name)) files.push(p);
    }
  };
  walk(join(root, 'components'));
  walk(join(root, 'app'));
  const players = files.filter((f) => /useAudioPlayer\(/.test(readFileSync(f, 'utf8')));
  assert.ok(players.length >= 2, `the viewer's and the replay's players are found (${players.length})`);
  const missing = players.filter((f) => !/lib\/voiceTrim/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(missing, [], 'a memo player that never reads the trim plays the cut tail');
});

test('voice-trim ui 6: a long memo\u2019s lengths and kept times stay one line of plain numbers', () => {
  for (const ms of [754_000, 5_999_000, 6_000_000]) {
    const words = memoWords({ body: String(ms), edit: trimmed(1000, ms - 1000) });
    assert.ok(!/NaN|undefined|\n/.test(words), words);
    const line = trimmedLine({ body: String(ms), edit: trimmed(1000, ms - 1000) });
    assert.ok(line && !/NaN|undefined|\n/.test(line), String(line));
    assert.ok(!/NaN|\n/.test(trimLabel(1000, ms - 1000)));
  }
});

// The audit (Nov 13): the findings' regression tests, written before their fixes.
const PHOTO_EDIT = { ...emptyEdit(), rotate: 90 as const };
const twoPieces = () => ({
  id: 'm1', piece_id: 'm1', kind: 'photo', edit: PHOTO_EDIT,
  pieces: [{ id: 'm1', kind: 'photo', edit: PHOTO_EDIT }, { id: 'p2', kind: 'voice', body: '58000', edit: null }],
}) as unknown as Faced;

test('voice-trim audit 1: an edit on a moment\u2019s second piece leaves the face alone and lands on that piece', { todo: 'test first' }, () => {
  const patch = { edit: trimmed(2000, 41_000) };
  const after = applyPatch([twoPieces()], 'm1', patch, 'p2');
  assert.deepEqual(after[0].edit, PHOTO_EDIT, 'the photo keeps its own edit');
  assert.deepEqual(after[0].pieces[1].edit, patch.edit, 'the memo piece holds its trim');
  assert.deepEqual(facedAt(after[0], 'p2').edit, patch.edit, 'the viewer reads the memo with its trim');
  assert.deepEqual(applyPatch([twoPieces()], 'm1', patch)[0].edit, patch.edit, 'with no piece named, the face is patched as before');
});

test('voice-trim audit 1: the bus tells a listener which piece changed', { todo: 'test first' }, () => {
  const heard: unknown[] = [];
  const off = captureBus.subscribe('w1', {}, () => {}, (id, _patch, pieceId) => heard.push([id, pieceId]));
  captureBus.patch('w1', 'm1', { edit: trimmed(2000, 41_000) }, null, 'p2');
  off();
  assert.deepEqual(heard, [['m1', 'p2']]);
});

test('voice-trim audit 2: a press at the end, until the position has left it, is not the end again', { todo: 'test first' }, () => {
  const span = voiceSpan({ start_ms: 2000, end_ms: 41_000 }, 58_000);
  assert.equal(voiceReachedEnd(41, span, false), true);
  assert.equal(voiceReachedEnd(41, span, true), false, 'a stale position right after the press');
  assert.equal(voiceReachedEnd(20, span, false), false);
});

test('voice-trim audit 3, 4: the whole length is the stored one, else the file\u2019s', { todo: 'test first' }, () => {
  assert.equal(wholeMs('4000', 3800), 4000);
  assert.equal(wholeMs('', 3800), 3800);
  assert.equal(wholeMs('0', 3800), 3800);
  assert.equal(wholeMs(null, 0), 0);
});

test('voice-trim audit 9: a memo with no length says no time anywhere', { todo: 'test first' }, () => {
  assert.equal(memoLengthText({ body: '' }), null);
  assert.equal(memoLengthText({ body: '0', edit: trimmed(0, 1000) }), null);
  assert.equal(memoLengthText({ body: '58000', edit: trimmed(2000, 41_000) }), '0:39');
  assert.equal(memoLengthText({ body: '58000' }), '0:58');
});
