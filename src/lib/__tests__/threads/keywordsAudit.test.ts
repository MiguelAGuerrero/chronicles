import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { facedOf } from '../../moment';
import { enterPicks, freshFix, mapPickValue, orderPlaces, resolveTime, timeEntries } from '../../refKeywords';
import { hasRefs, insertKeyword, keywordToken, menuStaysOpen, plainRefs, refToken, wordAfterAt } from '../../refs';
import { createRefValues } from '../../refValues/shell';
import { noteExtractor } from '../../resurface/extractors';
import type { MomentView } from '../../resurface/types';
import { fakePorts } from '../fakes';

// Reference keywords audit (specs/reference-keywords, "Audit"): one regression test for each accepted finding.

const T = Date.UTC(2026, 9, 20, 14, 20);

test('reference-keywords audit 1: a keyword-only note is a reference, so no reader shows its raw token', () => {
  const keyword = keywordToken({ key: 'here', word: 'here', value: 'the science center', payload: '-71.4,41.8' });
  assert.equal(hasRefs(`Back ${keyword}`), true, 'a note with only a keyword');
  assert.equal(hasRefs(`See ${refToken('pier')}`), true, 'a moment');
  assert.equal(hasRefs('Plain words, @ alone and { braces }'), false);
  assert.equal(hasRefs(null), false);
  // The owner's thread draws a note with a reference through NoteText, never as its body.
  const bubble = readFileSync(new URL('../../../components/threads/NoteBubble.tsx', import.meta.url), 'utf8');
  assert.ok(/hasRefs\(body\)/.test(bubble) && !/refIds\(body\)/.test(bubble), 'NoteBubble asks hasRefs, which knows keywords');
});

test('reference-keywords audit 3: a late place entry never moves "over there" off the first row', () => {
  const there = { key: 'there', word: 'over there' };
  const here = { key: 'here', word: 'here' };
  const near = { key: 'near', word: 'next to me' };
  assert.deepEqual(orderPlaces([there]).map((e) => e.key), ['there']);
  assert.deepEqual(orderPlaces([here, near, there]).map((e) => e.key), ['there', 'here', 'near'], 'the read answers: still first');
  assert.equal(orderPlaces([here, there])[0].key, 'there');
});

test('reference-keywords audit 4: a selection event while "over there" is resolving keeps the menu\'s place', () => {
  assert.equal(menuStaysOpen('Back @', 5, 0, true), true, 'the field lost focus; the cursor reads 0');
  assert.equal(menuStaysOpen('Back @', 5, 0, false), false, 'not resolving: the cursor before the @ closes it');
  assert.equal(menuStaysOpen('Back @to', 5, 8, false), true);
  assert.equal(menuStaysOpen('Back @to ', 5, 9, false), false, 'a space still ends it');
});

test('reference-keywords audit 5: a pick with the cursor inside the typed word replaces the whole word', () => {
  assert.equal(wordAfterAt('@tomorrow', 0), 'tomorrow');
  assert.equal(wordAfterAt('Back @to later', 5), 'to', 'to the next space');
  assert.equal(wordAfterAt('Back @', 5), '');
  assert.equal(wordAfterAt('Back @to@x', 5), 'to', 'a second @ ends it');
  assert.equal(wordAfterAt('no at', 1), '');
  const text = '@tomorrow later';
  const k = { key: 'time' as const, word: 'tomorrow', value: 'Oct 21', payload: '1' };
  assert.equal(insertKeyword(text, 0, [], k, wordAfterAt(text, 0)).text, '@tomorrow (Oct 21) later', 'nothing of "morrow" is left behind');
});

test('reference-keywords audit 6: Enter picks only after a letter or an arrow, and never during composition', () => {
  assert.equal(enterPicks('', false, false), false, 'a lone @ then Enter is a newline');
  assert.equal(enterPicks('t', false, false), true, 'a letter typed');
  assert.equal(enterPicks('', true, false), true, 'an arrow pressed');
  assert.equal(enterPicks('t', true, true), false, 'an IME confirming');
});

test('reference-keywords audit 8: a keyword\'s value is not a thread term', () => {
  const body = `Meet ${keywordToken({ key: 'time', word: 'tomorrow', value: 'Nov 12, 2026', payload: '1' })} at ${keywordToken({ key: 'here', word: 'here', value: 'Zeppelin Street', payload: '1,2' })}`;
  const capture = facedOf({ id: 'n', walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const m: MomentView = { id: 'n', t: 1, kind: 'text', walkId: null, words: plainRefs(body), place: null, hasMedia: false, capture };
  const terms = noteExtractor.extract(m).map((s) => s.term);
  assert.ok(!terms.some((t) => /nov|2026|zeppelin|street/.test(t)), `no value in ${terms.join(', ')}`);
  assert.ok(terms.some((t) => /meet/.test(t)), 'the owner\'s own words still are');
});

test('reference-keywords audit 9: a save made during the setting\'s load survives the load', async () => {
  const p = fakePorts();
  const slow = { ...p, db: { ...p.db, getMeta: async () => { await new Promise((r) => setTimeout(r, 20)); return 'on'; } } };
  const v = createRefValues(slow);
  const loading = v.load();
  await v.save(false);
  await loading;
  assert.equal(v.store.get(), false, 'the earlier read did not overwrite the save');
});

test('reference-keywords audit 13: a fix older than the stamp\'s limit offers no place entry', () => {
  const last = { at: [-71.4, 41.8] as [number, number], t: 1_000_000 };
  assert.deepEqual(freshFix(last, 1_000_000 + 10_000, 15_000), last.at, 'fresh');
  assert.equal(freshFix(last, 1_000_000 + 15_001, 15_000), null, 'older than the limit');
  assert.equal(freshFix(last, 1_000_000 - 1, 15_000), null, 'a fix from the future is no fix');
  assert.equal(freshFix(null, 5, 15_000), null);
});

test('reference-keywords audit 15: an unnamed map pick stores no label the owner did not write', () => {
  assert.equal(mapPickValue('', 'over there'), 'over there');
  assert.equal(mapPickValue('   ', 'over there'), 'over there');
  assert.equal(mapPickValue('  the old pier ', 'over there'), 'the old pier');
  const token = keywordToken({ key: 'there', word: 'over there', value: mapPickValue('', 'over there'), payload: '-71.4,41.8' });
  assert.equal(plainRefs(`Meet ${token}`), 'Meet over there', 'the note reads as the owner wrote it, the coordinates kept');
});

test('reference-keywords audit 17: a time value reads in the viewer\'s own clock style', () => {
  assert.equal(resolveTime('now', T, 0), '2:20 PM', 'twelve hours as the viewer, not 14:20');
  assert.equal(resolveTime('now', Date.UTC(2026, 9, 20, 0, 5), 0), '12:05 AM');
  assert.equal(resolveTime('soon', T, 0, () => '14:20'), 'after 14:20', 'the device\'s own formatter when given');
  assert.equal(timeEntries(T, 0, null, () => '14:20').find((e) => e.word === 'now')?.value, '14:20');
});
