import assert from 'node:assert/strict';
import { test } from 'node:test';

type Memo = { id: string };
// The module is reached by name: this file runs before it exists (test first).
const core = () => import('../../transcript/core' as string) as Promise<Record<string, (...a: any[]) => any>>;
const memo = (id: string, t: number, body = '8000', trim?: { start_ms: number; end_ms: number }) => ({
  id, t, body, edit: trim ? { trim } : null,
});
const row = (capture_id: string, text = 'hello', from_ms: number | null = null, to_ms: number | null = null) => ({
  capture_id, text, lang: 'en-US', from_ms, to_ms, made_at: 1,
});

test('TX11: transcriptCaption trims, collapses whitespace and is null for nothing', async () => {
  const { transcriptCaption } = await core();
  assert.equal(transcriptCaption('  we  passed\nthe bakery '), 'we passed the bakery');
  assert.equal(transcriptCaption('   '), null);
  assert.equal(transcriptCaption(''), null);
  assert.equal(transcriptCaption(null), null);
});

test('TX11: needsTranscript names the kept memos with no row, newest first, and none that has one', async () => {
  const { needsTranscript } = await core();
  const out = needsTranscript([memo('a', 1), memo('b', 3), memo('c', 2)], [row('c')]);
  assert.deepEqual(out.map((m: Memo) => m.id), ['b', 'a']);
});

test('TX4: a memo that gave no words (an empty row) is not named again', async () => {
  const { needsTranscript } = await core();
  assert.deepEqual(needsTranscript([memo('a', 1)], [row('a', '')]), []);
});

test('TX13: a row read from another span than the memo keeps now is stale and named again', async () => {
  const { needsTranscript, isStale } = await core();
  const trimmed = memo('a', 1, '8000', { start_ms: 1000, end_ms: 5000 });
  assert.equal(isStale(row('a', 'x', 1000, 5000), trimmed), false);
  assert.equal(isStale(row('a', 'x', null, null), trimmed), true, 'read whole, now trimmed');
  assert.equal(isStale(row('a', 'x', 1000, 5000), memo('a', 1)), true, 'read trimmed, trim reverted');
  assert.equal(isStale(row('a', 'x', 1000, 4000), trimmed), true, 'trim moved');
  assert.deepEqual(needsTranscript([trimmed], [row('a', 'x', null, null)]).map((m: Memo) => m.id), ['a']);
});

test('TX13: the span a read is made from is the memo\'s kept span, null when the whole memo is kept', async () => {
  const { spanOf } = await core();
  assert.equal(spanOf(memo('a', 1)), null);
  assert.deepEqual(spanOf(memo('a', 1, '8000', { start_ms: 1000, end_ms: 5000 })), { from_ms: 1000, to_ms: 5000 });
});

test('TX10: words of a row are its caption; none for a missing or empty row', async () => {
  const { wordsOfRow } = await core();
  assert.equal(wordsOfRow(row('a', ' the  market ')), 'the market');
  assert.equal(wordsOfRow(row('a', '')), null);
  assert.equal(wordsOfRow(undefined), null);
});

test('memo-transcripts audit 9: a locale with -u- extensions or an underscore matches its installed pack, and a region falls back to its language', async () => {
  const { localeMatches } = await core();
  assert.equal(localeMatches(['en-US'], 'en-US-u-hc-h12'), true);
  assert.equal(localeMatches(['en_US'], 'en-US'), true);
  assert.equal(localeMatches(['en-US'], 'en-GB'), true, 'same language, another region: the phone reads it');
  assert.equal(localeMatches(['fr-FR'], 'en-US'), false);
  assert.equal(localeMatches([], 'en-US'), false);
});

test('memo-transcripts audit 11, 12: on-device reading needs the phone to say so for its own locale, and Android 13', async () => {
  const { onDeviceReady } = await core();
  const ok = { os: 'ios', version: 17, available: true, onDevice: true, installed: [], lang: 'en-US' };
  assert.equal(onDeviceReady(ok), true, 'iOS: the recognizer for the device locale says it is on-device');
  assert.equal(onDeviceReady({ ...ok, onDevice: false }), false);
  assert.equal(onDeviceReady({ ...ok, available: false }), false);
  const droid = { os: 'android', version: 33, available: true, onDevice: true, installed: ['en-US'], lang: 'en-US' };
  assert.equal(onDeviceReady(droid), true);
  assert.equal(onDeviceReady({ ...droid, version: 32 }), false, 'Android 12 may use the default, cloud recognizer');
  assert.equal(onDeviceReady({ ...droid, installed: [] }), false, 'no pack installed for the locale');
});
