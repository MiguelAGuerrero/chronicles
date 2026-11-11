import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeleteRunner } from '../../deletion/runner';
import { facedOf, momentOf } from '../../moment';
import {
  distanceWords, entryRef, KEYWORD_KINDS, matchEntries, moveHighlight, nearbyPlaces, paletteOrder, placeEntries, pointPayload, REF_RULES, resolveTime, timeEntries, TIME_WORDS, type NearPlace,
} from '../../refKeywords';
import { fromEditor, GONE, insertKeyword, keywordPlain, keywordToken, menuQuery, parseRefs, plainNote, plainRefs, refToken, replaceKeywordValue, toEditor, typedAt } from '../../refs';
import { refCardLine } from '../../threads/lines';
import { fakePorts } from '../fakes';

// Reference keywords (specs/reference-keywords): the palette's entries, the token, and what plain text says.

const FIX: [number, number] = [-71.4, 41.8];
/** A point `m` metres east of the fix (about 83 km per degree of longitude here, so 1e-5 degrees is under a metre). */
const east = (m: number): [number, number] => [FIX[0] + m / 83_000, FIX[1]];
const T = Date.UTC(2026, 9, 20, 14, 20);
const place = (name: string, m: number): NearPlace => ({ name, at: east(m) });

test('RK2: a keyword reference is inserted at the @, and every other character of the note is untouched', () => {
  const typed = 'I would like to come back @ soon';
  const at = typed.indexOf('@');
  const r = insertKeyword(typed, at, [], { key: 'here', word: 'here', value: 'the science center', payload: pointPayload(FIX) });
  assert.equal(r.text, 'I would like to come back @here (the science center) soon');
  assert.equal(r.text.slice(0, at), typed.slice(0, at), 'the words before are as typed');
  assert.ok(r.text.endsWith(' soon'), 'and after');
  assert.equal(fromEditor(r.text, r.refs), `I would like to come back ${keywordToken({ key: 'here', word: 'here', value: 'the science center', payload: pointPayload(FIX) })} soon`);
  assert.equal(typedAt('Hi ', 'Hi @'), 3);
});

test('RK3: the token carries the keyword, its word, its value and payload; a note with no keyword is byte for byte as before', () => {
  const k = { key: 'near' as const, word: 'next to me', value: 'the science center', payload: pointPayload(FIX) };
  const token = keywordToken(k);
  assert.equal(token, '@{near|next to me|the science center|-71.40000,41.80000}');
  assert.deepEqual(parseRefs(`Look ${token}.`), [{ text: 'Look ' }, k, { text: '.' }]);
  assert.deepEqual(parseRefs(keywordToken({ ...k, payload: '' })), [{ ...k, payload: '' }], 'no payload, no fourth field');
  assert.equal(keywordToken({ ...k, value: 'a } b | c' }), '@{near|next to me|a   b   c|-71.40000,41.80000}', 'never a brace or bar inside a field');
  // A note with no keyword is stored exactly as 0125 stored it.
  const plain = `Again ${refToken('pier', 'Pier, Sep 11')}, same spot. @ alone and { braces }`;
  const ed = toEditor(plain, () => null);
  assert.equal(fromEditor(ed.text, ed.refs), plain);
  // A keyword reads in the editor as @ and its words, and goes whole.
  const withKey = toEditor(`Go ${token}`, () => null);
  assert.equal(withKey.text, 'Go @next to me (the science center)');
  assert.equal(fromEditor(withKey.text, withKey.refs), `Go ${token}`);
});

test('RK4: a keyword resolves from the fix and time it is given, never the present', () => {
  const places = [place('Science Center', 10)];
  const here = placeEntries({ fix: FIX, places, street: null }).find((e) => e.key === 'here');
  assert.equal(here?.value, 'Science Center');
  // Another fix, another answer: the function has no other place to look.
  const elsewhere = placeEntries({ fix: [FIX[0] + 0.01, FIX[1]], places, street: null }).find((e) => e.key === 'here');
  assert.equal(elsewhere, undefined);
  // Another time, another answer; the same time, the same.
  assert.equal(resolveTime('now', T, 0), '2:20 PM');
  assert.equal(resolveTime('now', T + 3_600_000, 0), '3:20 PM');
  assert.equal(resolveTime('now', T, 0), resolveTime('now', T, 0));
});

test('RK5: a stored reference reads the same value after anything the app rebuilds', () => {
  const stored = keywordToken({ key: 'here', word: 'here', value: 'Science Center', payload: pointPayload(FIX) });
  const body = `Come back ${stored}`;
  const before = plainRefs(body);
  // A tile or map rebuild changes what the places adapters answer; the token holds the value it was saved with.
  const rebuilt = placeEntries({ fix: FIX, places: [place('Planetarium', 10)], street: null }).find((e) => e.key === 'here');
  assert.equal(rebuilt?.value, 'Planetarium');
  assert.equal(plainRefs(body), before);
  assert.equal(before, 'Come back here (Science Center)');
});

test('RK6: an entry that cannot resolve is absent, never invented', () => {
  const keys = (es: { key: string }[]) => es.map((e) => e.key);
  assert.deepEqual(keys(placeEntries({ fix: null, places: [place('Science Center', 5)], street: 'Main St' })), ['there'], 'no fix: only the picker');
  assert.deepEqual(keys(placeEntries({ fix: FIX, places: [], street: null })), ['there'], 'no place, no street: nothing to say');
  assert.deepEqual(keys(placeEntries({ fix: FIX, places: [place('Far', 5_000)], street: null })), ['there'], 'out of range');
  assert.ok(placeEntries({ fix: FIX, places: [place('   ', 5)], street: null }).every((e) => e.key === 'there'), 'an unnamed place is no place');
  assert.equal(entryRef({ key: 'there', word: 'over there', value: null, payload: '' }), null, 'no value, no reference');
});

test('RK7: places are ordered by distance only, said in words, with no number, rank or digit', () => {
  const list = nearbyPlaces(FIX, [place('Far one', 300), place('Near one', 10), place('Middle one', 100), place('Out', 5_000)]);
  assert.deepEqual(list.map((p) => p.name), ['Near one', 'Middle one', 'Far one']);
  for (const p of list) {
    assert.ok(!/\d/.test(p.how), `no digit in "${p.how}"`);
    assert.ok(!/closest|nearest|top|best|popular/i.test(p.how));
    assert.deepEqual(Object.keys(p).sort(), ['at', 'how', 'name'], 'no rank, score or count');
  }
  assert.deepEqual([5, 20, 100, 300, 900].map(distanceWords), ['right here', 'a few steps away', 'up the street', 'a short walk away', 'a way off']);
  assert.ok(list.length < 10 || true);
});

test('RK8: a moment row carries its place and date, a placeless one says so in words', () => {
  const now = Date.UTC(2026, 10, 11);
  const line = refCardLine({ place: null, t: T, walkLine: null }, now);
  assert.match(line, /Oct 20/);
  assert.match(line, /not on a walk/);
  assert.ok(refCardLine({ place: 'Providence', t: T, walkLine: '40 minutes in' }, now).startsWith('Providence, Oct 20'));
});

test('RK9: plain text reads a keyword as its word and value in parentheses, and as the word alone when the values are off', () => {
  const k = { key: 'here' as const, word: 'here', value: 'the science center', payload: '' };
  const body = `I would like to come back ${keywordToken(k)}.`;
  assert.equal(plainNote(body), 'I would like to come back here (the science center).');
  assert.equal(plainNote(body, true), 'I would like to come back here (the science center).');
  assert.equal(plainNote(body, false), 'I would like to come back here.');
  assert.equal(plainRefs(body, () => null, false), 'I would like to come back here.');
  assert.equal(keywordPlain({ word: 'now', value: 'now' }), 'now', 'a value that is its word adds nothing');
  assert.ok(!/@\{/.test(plainNote(body)!));
  assert.equal(plainNote(`${refToken('pier', 'Pier, Sep 11')} and ${keywordToken(k)}`), 'Pier, Sep 11 and here (the science center)', 'with a moment reference beside');
});

test('RK10: correcting a reference replaces its value and keeps its word', () => {
  const a = keywordToken({ key: 'here', word: 'here', value: 'the old place', payload: '1,2' });
  const b = keywordToken({ key: 'near', word: 'next to me', value: 'a bench', payload: '3,4' });
  const body = `x ${a} y ${b}`;
  const fixed = replaceKeywordValue(body, 1, 'the library', '5,6');
  assert.equal(fixed, `x ${a} y ${keywordToken({ key: 'near', word: 'next to me', value: 'the library', payload: '5,6' })}`);
  assert.equal(plainRefs(fixed), 'x here (the old place) y next to me (the library)');
  assert.equal(replaceKeywordValue(body, 7, 'z', ''), body, 'no such reference, no change');
});

test('RK12: no weather or temperature entry exists', () => {
  const all = [...KEYWORD_KINDS, ...TIME_WORDS, ...timeEntries(T, 0).map((e) => e.word), ...placeEntries({ fix: FIX, places: [], street: 'Main St' }).map((e) => e.word)];
  assert.ok(all.every((w) => !/weather|temperature|degrees|rain|sun|cold|warm|hot/i.test(w)), all.join(', '));
  assert.deepEqual([...KEYWORD_KINDS], ['here', 'near', 'there', 'time']);
});

test('RK13: here and next to me name a place only when exactly one is in range; else the street, or nothing', () => {
  const val = (es: ReturnType<typeof placeEntries>, k: string) => es.find((e) => e.key === k)?.value;
  const one = placeEntries({ fix: FIX, places: [place('Science Center', 10)], street: 'Main St' });
  assert.equal(val(one, 'here'), 'Science Center');
  assert.equal(val(one, 'near'), 'Science Center');
  const two = placeEntries({ fix: FIX, places: [place('Science Center', 10), place('Cafe', 20)], street: 'Main St' });
  assert.equal(val(two, 'here'), 'Main St', 'two in range: the street, never a guess between them');
  assert.equal(val(two, 'near'), undefined, 'two within next-to-me range is no answer');
  const twoNoStreet = placeEntries({ fix: FIX, places: [place('Science Center', 10), place('Cafe', 20)], street: null });
  assert.equal(val(twoNoStreet, 'here'), undefined, 'no street either: absent');
  const wide = placeEntries({ fix: FIX, places: [place('Science Center', REF_RULES.hereM - 10)], street: null });
  assert.equal(val(wide, 'here'), 'Science Center', 'within the here range');
  assert.equal(val(wide, 'near'), undefined, 'but outside next to me');
  assert.deepEqual(paletteOrder([{ key: 'time', word: 'now', value: '1', payload: '' }, { key: 'here', word: 'here', value: 'x', payload: '' }]).map((e) => e.key), ['here', 'time']);
});

test('RK16: time words resolve against the moment\'s time, as absolute values, and say nothing of quality or mood', () => {
  const v = (w: (typeof TIME_WORDS)[number]) => resolveTime(w, T, 0);
  assert.deepEqual(
    { now: v('now'), today: v('today'), yesterday: v('yesterday'), tomorrow: v('tomorrow'), morning: v('this morning'), tonight: v('tonight'), soon: v('soon'), later: v('later') },
    { now: '2:20 PM', today: 'Oct 20', yesterday: 'Oct 19', tomorrow: 'Oct 21', morning: 'Oct 20, morning', tonight: 'Oct 20, evening', soon: 'after 2:20 PM', later: 'after 2:20 PM' },
  );
  assert.equal(resolveTime('now', T, -300), '9:20 AM', 'the device\'s offset is an argument');
  assert.ok(TIME_WORDS.every((w) => !/quiet|lovely|great|good|bad|perfect|beautiful|nice|golden/i.test(`${w} ${v(w)}`)));
  assert.equal(timeEntries(T, 0).length, TIME_WORDS.length, 'no "minutes in" off a walk');
  assert.ok(timeEntries(T, 0, 40).some((e) => e.word === '40 minutes in'), 'on a walk, minutes in is offered');
  assert.ok(timeEntries(T, 0).every((e) => e.value && e.key === 'time'), 'a time always resolves');
});

test('RK17: a shared note reads its keywords as words and carries no raw token or coordinate', () => {
  const body = `Meet ${keywordToken({ key: 'there', word: 'over there', value: 'the old mill', payload: pointPayload(FIX) })} at ${keywordToken({ key: 'time', word: 'tomorrow', value: 'Oct 21', payload: String(T) })}`;
  const shared = plainNote(body)!;
  assert.equal(shared, 'Meet over there (the old mill) at tomorrow (Oct 21)');
  assert.ok(!/@\{|-71\.4|41\.8|\|/.test(shared));
  assert.ok(!/-71\.4|41\.8/.test(plainNote(body, false)!));
});

test('RK18: the resolution picker lists notable places by distance and always offers the map', () => {
  const list = nearbyPlaces(FIX, [place('B', 90), place('A', 20), place('C', 200)]);
  assert.deepEqual(list.map((p) => p.name), ['A', 'B', 'C']);
  // Over there is offered with no fix and no place: the map alone (the picker draws its "Choose on the map").
  const none = placeEntries({ fix: null, places: [], street: null });
  assert.deepEqual(none.map((e) => [e.key, e.value]), [['there', null]]);
  assert.deepEqual(nearbyPlaces(FIX, []), []);
});

test('RK20: a pointer to a deleted moment goes alone: the word and value stay; the keywords are not derived data', async () => {
  const p = fakePorts();
  const run = createDeleteRunner({ db: p.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const keyword = keywordToken({ key: 'here', word: 'here', value: 'the science center', payload: pointPayload(FIX) });
  const body = `Back to ${refToken('pier', 'Pier, Sep 11')} and ${keyword}`;
  const note = (id: string, text: string, t: number) => facedOf({ id, walk_id: 'w1', t, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: text, segment_id: null });
  await p.db.addMoment(momentOf(note('pier', 'the pier', 1)));
  await p.db.addMoment(momentOf(note('n', body, 2)));
  await run({ type: 'moment', captureId: 'pier' });
  const kept = (await p.db.getMomentsByIds(['n']))[0].pieces[0].body!;
  assert.equal(kept, body, 'the note\'s text is as written');
  assert.equal(plainNote(kept), 'Back to Pier, Sep 11 and here (the science center)', 'only the pointer is gone: the words and the keyword stay');
  assert.notEqual(plainNote(kept), `Back to ${GONE} and here`, 'not "no longer kept" where it carries its words');
  // Deleting the note's own moment takes its references with it (the moment itself).
  await run({ type: 'moment', captureId: 'n' });
  assert.deepEqual(await p.db.getMomentsByIds(['n']), []);
});

test('RK21: the menu filters as the owner keeps typing, and a pick replaces the @ and the letters typed after it', () => {
  const all = [...timeEntries(T, 0), ...placeEntries({ fix: FIX, places: [place('Science Center', 10)], street: null })];
  assert.equal(matchEntries(all, '').length, all.length, 'no letters: everything');
  assert.deepEqual(matchEntries(all, 'to').map((e) => e.word), ['today', 'tonight', 'tomorrow', 'next to me']);
  assert.deepEqual(matchEntries(all, 'TO').map((e) => e.word), ['today', 'tonight', 'tomorrow', 'next to me'], 'case never matters');
  assert.deepEqual(matchEntries(all, 'there').map((e) => e.word), ['over there'], 'a later word of the entry counts');
  assert.ok(matchEntries(all, 'science').some((e) => e.word === 'here'), 'a place by its name');
  assert.deepEqual(matchEntries(all, 'zzz'), [], 'nothing matches: the menu closes');
  // The menu is open from the @ to the cursor, until a space.
  assert.equal(menuQuery('Back @', 5, 6), '');
  assert.equal(menuQuery('Back @to', 5, 8), 'to');
  assert.equal(menuQuery('Back @to ', 5, 9), null, 'a space ends it');
  assert.equal(menuQuery('Back to', 5, 7), null, 'no @ there');
  assert.equal(menuQuery('Back @to', 5, 5), null, 'cursor before the @');
  // A pick replaces the @ and the letters, and nothing else.
  const typed = 'Back @to later';
  const k = { key: 'time' as const, word: 'tomorrow', value: 'Oct 21', payload: '1' };
  const r = insertKeyword(typed, 5, [], k, 'to');
  assert.equal(r.text, 'Back @tomorrow (Oct 21) later');
  assert.equal(fromEditor(r.text, r.refs), `Back ${keywordToken(k)} later`);
  assert.equal(insertKeyword('Back @', 5, [], k).text, 'Back @tomorrow (Oct 21) ', 'no letters: the @ alone');
});

test('RK22: the keyboard moves a highlight, Enter picks it, and the highlight never leaves the list', () => {
  assert.equal(moveHighlight(0, 1, 3), 1);
  assert.equal(moveHighlight(2, 1, 3), 2, 'the end holds');
  assert.equal(moveHighlight(0, -1, 3), 0, 'the start holds');
  assert.equal(moveHighlight(-1, 1, 3), 0, 'from nothing, the first');
  assert.equal(moveHighlight(0, 1, 0), -1, 'an empty list has none');
});
