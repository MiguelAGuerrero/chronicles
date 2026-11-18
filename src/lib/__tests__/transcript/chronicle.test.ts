import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facedOf } from '../../moment';
import { THREAD_RULES } from '../../resurface/threads';
import { toMomentViews, wordsOf } from '../../resurface/views';
import { EMPTY_PREFS, renameThread, removeThread } from '../../resurface/prefs';

const voice = (id: string) => facedOf({ id, walk_id: null, t: 1, lat: null, lon: null, kind: 'voice', file_path: 'f', body: '4200', segment_id: null });

test('TX10: a memo\'s words are its stored transcript, so it can join a thread and be found', async () => {
  const { wordsOfRow } = (await import('../../transcript/core' as string)) as Record<string, (...a: any[]) => any>;
  const rows: Record<string, ReturnType<typeof mkRow>> = { a: mkRow('a', ' the  bakery ') };
  const at = (c: { id: string }) => wordsOfRow(rows[c.id]);
  assert.equal(wordsOf(voice('a'), at), 'the bakery');
  assert.equal(wordsOf(voice('b'), at), null);
  assert.equal(toMomentViews([voice('a')], [], at)[0].words, 'the bakery');
});
const mkRow = (capture_id: string, text: string) => ({ capture_id, text, lang: 'en-US', from_ms: null, to_ms: null, made_at: 1 });

test('TX17: THREAD_RULES is bumped for the new signals, and a thread the owner renamed or removed keeps that state', () => {
  assert.notEqual(THREAD_RULES, 'resurface-1');
  const p = removeThread(renameThread(EMPTY_PREFS, 'statue', 'The foxes'), 'harbor');
  assert.deepEqual(p.renames, { statue: 'The foxes' });
  assert.deepEqual(p.removed, ['harbor']);
});
