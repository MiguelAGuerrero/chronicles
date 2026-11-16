/// <reference types="node" />
// The replay's cards say their counts in clauses, with one hint (tend replay T19, decision 0165), and the walks row
// shares the walk card's clause (decision 0170).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Faced, facedOf } from '../../moment';
import { buildDays, dayCard, dayLine, momentPlace, type WalkPlaces } from '../../days';
import { formatCaptures } from '../../format';
import { kindsClause, pinKindsWords } from '../../pins';
import { newStreetsLine, walkCardStreets, walkRowMeta, walkRowSpoken } from '../../quietLines';
import { foundList } from '../../explore/explore';
import { pinHint } from '../../replay';
import type { StreetSegment, Walk } from '../../types';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const walk = (id: string, area: string | null): Walk => ({
  id, started_at: at(3, 10), ended_at: at(3, 11), title: null, epilogue: null, open: false, area, snapped_build: null,
});
const cap = (id: string, t: number, walk_id: string | null, lon: number | null = -71.4, lat: number | null = 41.812): Faced => facedOf({
  id, walk_id, t, lat, lon, kind: 'text', file_path: null, body: id, segment_id: null,
});
// A street running east-west through the moments' latitude.
const street = (id: string, name: string | null, lon0: number, lon1: number): StreetSegment => ({
  id, name, kind_detail: 'residential', length_m: 100, build: 'b', geometry: [[[lon0, 41.812], [lon1, 41.812]]],
});

test('tend replay T19: the walk card says what was kept as one clause in the pins\' words', () => {
  assert.equal(formatCaptures({ photos: 2, videos: 1, voices: 1, notes: 1 }), 'Two photos, a\u00a0video, a\u00a0voice memo and a\u00a0note');
  assert.equal(formatCaptures({ photos: 1, voices: 0, notes: 3 }), 'A\u00a0photo and three notes');
  assert.equal(formatCaptures({ photos: 0, videos: 0, voices: 1, notes: 0 }), 'A\u00a0voice memo');
  assert.equal(formatCaptures({ photos: 0, voices: 0, notes: 0 }), '');
  // One table: the pins say a group the same way.
  assert.equal(kindsClause([['photo', 2], ['voice', 1]]), pinKindsWords({ captures: [{ kind: 'photo' }, { kind: 'voice' }, { kind: 'photo' }] }));
});

test('tend replay T19: the walks row takes the walk card\'s clause, no digit among what was kept', () => {
  const meta = walkRowMeta('Nov 2, 2026', { distance_m: 1234, duration_ms: 25 * 60_000, photos: 1, videos: 1, voices: 1, notes: 1 });
  assert.equal(meta, 'Nov 2, 2026 · 1.2\u00a0km · 25\u00a0min · a\u00a0photo, a\u00a0video, a\u00a0voice memo and a\u00a0note');
  assert.equal(walkRowSpoken('Plums', meta, null), 'Replay Plums. Nov 2, 2026, 1.2\u00a0km, 25\u00a0min, a\u00a0photo, a\u00a0video, a\u00a0voice memo and a\u00a0note');
});

test('tend replay T19: the day card names one or two places its moments were at', () => {
  assert.equal(dayLine(4, ['Wickenden Street', 'the Old Mill', 'Wickenden Street'], 'Fox Point'), 'Four moments, around Wickenden Street and the Old Mill');
  assert.equal(dayLine(1, ['Wickenden Street'], null), 'One moment, around Wickenden Street');
  // Three named places, or a placed moment with none: the day's area.
  assert.equal(dayLine(4, ['A Street', 'B Street', 'C Street'], 'Fox Point'), 'Four moments around Fox Point');
  assert.equal(dayLine(4, ['A Street', null], 'Fox Point'), 'Four moments around Fox Point');
  // No area either, or no placed moment: the count alone.
  assert.equal(dayLine(4, ['A Street', 'B Street', 'C Street'], null), 'Four moments');
  assert.equal(dayLine(2, [], null), 'Two moments');
  assert.equal(dayLine(0, [], 'Fox Point'), null);
});

test('tend replay T19: a moment\'s named place is what it found, else its walk\'s street', () => {
  const places: WalkPlaces = {
    walked: [street('s1', 'Wickenden Street', -71.401, -71.399)],
    fog: [street('s2', null, -71.391, -71.389)],
    found: [{ capture_id: 'b', name: 'the Old Mill', generic: false }, { capture_id: 'c', name: 'A viewpoint', generic: true }],
  };
  assert.equal(momentPlace(cap('a', at(3, 10), 'w'), places), 'Wickenden Street');
  assert.equal(momentPlace(cap('b', at(3, 10), 'w'), places), 'the Old Mill');
  // A generic find names nothing; the street does.
  assert.equal(momentPlace(cap('c', at(3, 10), 'w'), places), 'Wickenden Street');
  // An unnamed street, no street in reach, or no place: none.
  assert.equal(momentPlace(cap('d', at(3, 10), 'w', -71.39), places), null);
  assert.equal(momentPlace(cap('e', at(3, 10), 'w', -71.3), places), null);
  assert.equal(momentPlace(cap('f', at(3, 10), 'w', null, null), places), null);
  assert.equal(momentPlace(cap('g', at(3, 10), null), null), null);
});

test('tend replay T19: the day card is wired to its walks\' places and its area, no digit in its line', () => {
  const w = walk('w', 'Fox Point');
  const places = new Map<string, WalkPlaces>([['w', { walked: [street('s1', 'Wickenden Street', -71.401, -71.399)], fog: [], found: [] }]]);
  const [named] = buildDays([w], [cap('a', at(3, 10, 10), 'w'), cap('b', at(3, 10, 20), 'w'), cap('c', at(3, 10, 30), 'w', -71.3999)]);
  assert.equal(dayCard(named, at(20, 9), { distance: new Map(), walks: places }).line, 'Three moments, around Wickenden Street');
  // A moment by no named street of the walk: the day's area (since the owner's "Only when all are placed", audit 12,
  // every moment must have a place inside it).
  const [mixed] = buildDays([w], [cap('a', at(3, 10, 10), 'w', -71.3), cap('b', at(3, 10, 30), 'w')]);
  assert.equal(dayCard(mixed, at(20, 9), { distance: new Map(), walks: places }).line, 'Two moments around Fox Point');
  const [loose] = buildDays([], [cap('a', at(3, 9), null)]);
  assert.equal(dayCard(loose, at(20, 9), { distance: new Map(), walks: new Map() }).line, 'One moment');
  assert.doesNotMatch(dayCard(mixed, at(20, 9), { distance: new Map([['w', 2100]]), walks: places }).line ?? '', /\d/);
});

test('tend replay audit 11: no pin, no hint, on either card', () => {
  const placed = cap('a', at(3, 10, 10), 'w');
  const nowhere = cap('b', at(3, 10, 20), null, null, null);
  assert.equal(pinHint([placed, nowhere]), 'Tap a pin to open it');
  assert.equal(pinHint([nowhere]), null);
  assert.equal(pinHint([]), null);
  // The day's card carries it from its model, so a day of placeless moments gives no hint.
  const [placeless] = buildDays([], [nowhere]);
  assert.equal(dayCard(placeless, at(20, 9), { distance: new Map(), walks: new Map() }).hint, null);
  const [one] = buildDays([], [cap('c', at(3, 9), null)]);
  assert.equal(dayCard(one, at(20, 9), { distance: new Map(), walks: new Map() }).hint, 'Tap a pin to open it');
});

test('tend replay audit 12: the day names a place or area only when every moment has a place inside it', () => {
  const w = walk('w', 'Fox Point');
  const places = new Map<string, WalkPlaces>([['w', { walked: [street('s1', 'Wickenden Street', -71.401, -71.399)], fog: [street('s2', null, -71.391, -71.389)], found: [] }]]);
  // A moment with no place: the count alone, never "around".
  const [nowhere] = buildDays([w], [cap('a', at(3, 10, 10), 'w'), cap('b', at(3, 10, 20), 'w', null, null)]);
  assert.equal(dayCard(nowhere, at(20, 9), { distance: new Map(), walks: places }).line, 'Two moments');
  // A loose moment on a street the day's walk read is checked against it: named.
  const [onStreet] = buildDays([w], [cap('a', at(3, 9), null), cap('b', at(3, 10, 30), 'w')]);
  assert.equal(dayCard(onStreet, at(20, 9), { distance: new Map(), walks: places }).line, 'Two moments, around Wickenden Street');
  // A loose moment by the walk's unnamed street is inside its area, not on a named place: the area.
  const [byWalk] = buildDays([w], [cap('a', at(3, 9), null, -71.39), cap('b', at(3, 10, 30), 'w')]);
  assert.equal(dayCard(byWalk, at(20, 9), { distance: new Map(), walks: places }).line, 'Two moments around Fox Point');
  // A loose moment across town is outside it: the count alone.
  const [far] = buildDays([w], [cap('a', at(3, 9), null, -71.3), cap('b', at(3, 10, 30), 'w')]);
  assert.equal(dayCard(far, at(20, 9), { distance: new Map(), walks: places }).line, 'Two moments');
});

test('tend replay audit 13: the day\'s card reads its places from what the day screen loaded, whole', () => {
  // The screen hands over what it loaded (its walks' replays and their distances) as one value, so a card that
  // forgot the walks could not be built: the walks are part of what the card is made from.
  const w = walk('w', 'Fox Point');
  const loaded = {
    distance: new Map([['w', 2100]]),
    walks: new Map<string, WalkPlaces>([['w', { walked: [street('s1', 'Wickenden Street', -71.401, -71.399)], fog: [], found: [] }]]),
  };
  const [day] = buildDays([w], [cap('a', at(3, 10, 10), 'w'), cap('b', at(3, 10, 20), 'w')]);
  const card = dayCard(day, at(20, 9), loaded);
  assert.equal(card.line, 'Two moments, around Wickenden Street');
  assert.equal(card.walked, '2.1 km walked');
});

// The walk's card and the fog beat say their last counts in words, through numberWord (tend replay T31, the owner's
// yes, Nov 14): streets walked, streets new to you past two, and the finds past four.
test('tend replay T31: the walk card says its streets walked and its new streets in words', () => {
  assert.equal(walkCardStreets(1, ['Transit Street']), 'one\u00a0street walked, your first time down Transit Street');
  assert.equal(walkCardStreets(7, ['A Street', 'B Street', 'C Street']), 'seven\u00a0streets walked, three\u00a0streets new to you');
  assert.equal(walkCardStreets(12, []), 'twelve\u00a0streets walked');
  // Past fifty-nine, numberWord's "many".
  assert.equal(walkCardStreets(75, []), 'many\u00a0streets walked');
  assert.equal(walkCardStreets(0, []), null);
  // The fog beat's headline takes the same words with a capital, and a screen reader hears plain spaces.
  assert.equal(newStreetsLine(['A Street', 'B Street', 'C Street']), 'three streets new to you');
  assert.equal(newStreetsLine(Array.from({ length: 21 }, (_, i) => `S${i}`)), 'twenty-one streets new to you');
  // One or two are still named.
  assert.equal(newStreetsLine(['Elm Street', 'Hope Street'], { bind: true }), 'your first time down Elm Street and Hope Street');
});

test('tend replay T31: the walk card says how many more it found in words', () => {
  assert.equal(foundList(['A', 'B', 'C', 'D', 'E']), 'Found A · B · C and two more');
  assert.equal(foundList(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']), 'Found A · B · C and twelve more');
  assert.equal(foundList(['A', 'B', 'C', 'D']), 'Found A · B · C · D');
});

// tend replay audit 14 (the review's silent question; the owner's answer in person, Nov 16, "three streets, all new to
// you"): when every street walked is new, the card says one clause, never the count twice. Otherwise both stay; one or
// two new streets are still named; streets not read yet say no new streets.
test('tend replay audit 14: every street walked new reads "three streets, all new to you"', () => {
  assert.equal(walkCardStreets(3, ['A Street', 'B Street', 'C Street']), 'three\u00a0streets, all new to you');
  assert.equal(walkCardStreets(4, ['A Street', 'B Street', 'C Street']), 'four\u00a0streets walked, three\u00a0streets new to you');
  assert.equal(walkCardStreets(2, ['A Street', 'B Street']), 'two\u00a0streets walked, your first time down A Street and B Street');
  assert.equal(walkCardStreets(3, null), 'three\u00a0streets walked');
});
