/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { emptyEdit, trimLabel } from '../../mediaEdit';
import { memoLengthMs, memoWords, trimmedLine, voiceClock, voiceSpan, voiceState } from '../../voiceTrim';

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

test('voice-trim ui 6: a long memo\u2019s lengths and kept times stay one line of plain numbers', { todo: 'test first' }, () => {
  for (const ms of [754_000, 5_999_000, 6_000_000]) {
    const words = memoWords({ body: String(ms), edit: trimmed(1000, ms - 1000) });
    assert.ok(!/NaN|undefined|\n/.test(words), words);
    const line = trimmedLine({ body: String(ms), edit: trimmed(1000, ms - 1000) });
    assert.ok(line && !/NaN|undefined|\n/.test(line), String(line));
    assert.ok(!/NaN|\n/.test(trimLabel(1000, ms - 1000)));
  }
});
