/// <reference types="node" />
// The replay's cards say their counts in clauses, with one hint (tend replay T19, decision 0165), and the walks row
// shares the walk card's clause (decision 0170).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Faced, facedOf } from '../../moment';
import { buildDays, dayCard, dayLine, momentPlace, type WalkPlaces } from '../../days';
import { formatCaptures } from '../../format';
import { kindsClause, pinKindsWords } from '../../pins';
import { walkRowMeta, walkRowSpoken } from '../../quietLines';
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
  assert.equal(formatCaptures({ photos: 2, videos: 1, voices: 1, notes: 1 }), 'Two photos, a video, a voice memo and a note');
  assert.equal(formatCaptures({ photos: 1, voices: 0, notes: 3 }), 'A photo and three notes');
  assert.equal(formatCaptures({ photos: 0, videos: 0, voices: 1, notes: 0 }), 'A voice memo');
  assert.equal(formatCaptures({ photos: 0, voices: 0, notes: 0 }), '');
  // One table: the pins say a group the same way.
  assert.equal(kindsClause([['photo', 2], ['voice', 1]]), pinKindsWords({ captures: [{ kind: 'photo' }, { kind: 'voice' }, { kind: 'photo' }] }));
});

test('tend replay T19: the walks row takes the walk card\'s clause, no digit among what was kept', () => {
  const meta = walkRowMeta('Nov 2, 2026', { distance_m: 1234, duration_ms: 25 * 60_000, photos: 1, videos: 1, voices: 1, notes: 1 });
  assert.equal(meta, 'Nov 2, 2026 · 1.2 km · 25 min · A photo, a video, a voice memo and a note');
  assert.equal(walkRowSpoken('Plums', meta, null), 'Replay Plums. Nov 2, 2026, 1.2 km, 25 min, A photo, a video, a voice memo and a note');
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
  const [named] = buildDays([w], [cap('a', at(3, 10, 10), 'w'), cap('b', at(3, 10, 20), 'w'), cap('c', at(3, 10, 30), 'w', null, null)]);
  assert.equal(dayCard(named, at(20, 9), new Map(), undefined, places).line, 'Three moments, around Wickenden Street');
  // A loose moment has no street read: the day's area.
  const [mixed] = buildDays([w], [cap('a', at(3, 9), null), cap('b', at(3, 10, 30), 'w')]);
  assert.equal(dayCard(mixed, at(20, 9), new Map(), undefined, places).line, 'Two moments around Fox Point');
  const [loose] = buildDays([], [cap('a', at(3, 9), null)]);
  assert.equal(dayCard(loose, at(20, 9), new Map()).line, 'One moment');
  assert.doesNotMatch(dayCard(mixed, at(20, 9), new Map([['w', 2100]]), undefined, places).line ?? '', /\d/);
});

test('tend replay audit 11: no pin, no hint, on either card', () => {
  const placed = cap('a', at(3, 10, 10), 'w');
  const nowhere = cap('b', at(3, 10, 20), null, null, null);
  assert.equal(pinHint([placed, nowhere]), 'Tap a pin to open it');
  assert.equal(pinHint([nowhere]), null);
  assert.equal(pinHint([]), null);
  // The day's card carries it from its model, so a day of placeless moments gives no hint.
  const [placeless] = buildDays([], [nowhere]);
  assert.equal(dayCard(placeless, at(20, 9), new Map()).hint, null);
  const [one] = buildDays([], [cap('c', at(3, 9), null)]);
  assert.equal(dayCard(one, at(20, 9), new Map()).hint, 'Tap a pin to open it');
});
