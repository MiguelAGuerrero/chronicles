/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pinHeadKinds, pinInto, pinKey, pinKindsWords, pinSpoken, pinsFor, pinThumb, walkClocks, type CapturePin, type WalkClock } from '../../pins';
import type { CaptureKind } from '../../types';

// tend map T14 (the owner's yes, decision 0154; amends QL26, NY10, MR2, RB7): a pin of several moments is drawn with
// its kinds, never a numeral, and named in words with how far into its walk it was. VISION.md Always, "Counts are
// words, in a clause"; "A moment carries its context ... It never appears as a bare thumbnail, filename or count".

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const cap = (id: string, kind: CaptureKind, min: number, o: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w1', t: T0 + min * MIN, lat: 41.812, lon: -71.4, kind, file_path: null, body: kind === 'text' ? 'words' : null, segment_id: null, ...o,
});
const pinOf = (...cs: Faced[]): CapturePin => {
  const pins = pinsFor(cs, 30);
  assert.equal(pins.length, 1);
  return pins[0];
};
const W1: WalkClock = { id: 'w1', started_at: T0, pauses: [] };

test('tend map T14: a pin of several moments shows its kinds in its head, up to two, in the order first taken', () => {
  assert.equal(pinHeadKinds(pinOf(cap('a', 'photo', 1))), null, 'a single moment keeps its own head');
  assert.deepEqual(pinHeadKinds(pinOf(cap('a', 'photo', 1), cap('b', 'text', 2))), ['photo', 'text']);
  assert.deepEqual(pinHeadKinds(pinOf(cap('a', 'text', 1), cap('b', 'photo', 2), cap('c', 'text', 3))), ['text', 'photo']);
  // Three kinds or more: the first two taken; the words name every one.
  assert.deepEqual(pinHeadKinds(pinOf(cap('a', 'photo', 1), cap('b', 'voice', 2), cap('c', 'text', 3), cap('d', 'video', 4))), ['photo', 'voice']);
  // One kind several times: its icon twice, so a pin of several never reads as one moment.
  assert.deepEqual(pinHeadKinds(pinOf(cap('a', 'photo', 1), cap('b', 'photo', 2), cap('c', 'photo', 3))), ['photo', 'photo']);
});

test('tend map T14: its kinds in words, counts as words, never a numeral', () => {
  assert.equal(pinKindsWords(pinOf(cap('a', 'photo', 1), cap('b', 'text', 2))), 'A photo and a note');
  assert.equal(pinKindsWords(pinOf(cap('a', 'photo', 1), cap('b', 'photo', 2))), 'Two photos');
  assert.equal(
    pinKindsWords(pinOf(cap('a', 'photo', 1), cap('b', 'voice', 2), cap('c', 'photo', 3), cap('d', 'text', 4), cap('e', 'video', 5))),
    'Two photos, a voice memo, a note and a video',
  );
  const many = Array.from({ length: 23 }, (_, i) => cap(`n${i}`, 'text', i));
  assert.equal(pinKindsWords(pinOf(...many)), 'Twenty-three notes');
  assert.doesNotMatch(pinKindsWords(pinOf(...many, cap('p', 'photo', 30))), /\d/);
});

test('tend map T14: how far into its walk, in walked time, from its first moment', () => {
  const pin = pinOf(cap('a', 'photo', 12), cap('b', 'text', 15));
  assert.equal(pinInto(pin, [W1]), 'twelve minutes in');
  // Walked time leaves out the pauses before it, as the moment's own line does (MC3).
  assert.equal(pinInto(pin, [{ ...W1, pauses: [{ started_at: T0 + 2 * MIN, ended_at: T0 + 7 * MIN }] }]), 'seven minutes in');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 0), cap('b', 'text', 0.2)), [W1]), 'at the start');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 65), cap('b', 'text', 70)), [W1]), 'one hour and five minutes in');
  // Unknown: the walk's clock not given, moments of two walks, or a moment made outside a walk.
  assert.equal(pinInto(pin, []), null);
  assert.equal(pinInto(pin, undefined), null);
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 15, { walk_id: 'w2' })), [W1, { id: 'w2', started_at: T0, pauses: [] }]), null);
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12, { walk_id: null }), cap('b', 'text', 15, { walk_id: null })), [W1]), null);
});

test('tend map T14: the spoken name says the kinds and the minutes in; one moment keeps its name', () => {
  const two = pinOf(cap('a', 'photo', 12), cap('b', 'text', 15));
  assert.equal(pinSpoken(two, { clocks: [W1] }), 'A photo and a note, twelve minutes in');
  assert.equal(pinSpoken(two, {}), 'A photo and a note');
  assert.equal(pinSpoken(two, { memory: true }), 'Memories: a photo and a note');
  // Amended by tend map T28 (decision 0164): a pin of one moment says its minutes too.
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12)), { clocks: [W1] }), 'Photo, twelve minutes in');
  assert.equal(pinSpoken(pinOf(cap('a', 'voice', 12)), { memory: true }), 'Memory: Voice memo');
  assert.equal(pinSpoken(pinOf(cap('a', 'text', 12, { note_type: 'idea' })), {}), 'Note, idea');
  assert.doesNotMatch(pinSpoken(pinOf(cap('a', 'photo', 1), cap('b', 'photo', 2), cap('c', 'voice', 3)), { clocks: [W1] }), /\d/);
});

// Video thumbnails (VS3, VS4) act on a pin of one video; T14 on a pin of several. The two stay apart: a pin of two
// videos gets no still (so the view draws no picture and no `pin-video-mark`, both gated on one moment) and shows the
// fan; a pin of one video keeps its still, its own head and its name "Video".
test('tend map T14: a pin of two videos is the fan with no still; a pin of one video is as video thumbnails made it', () => {
  const v = (id: string, min: number) => cap(id, 'video', min, { file_path: `walks/w1/${id}.webm`, thumb_path: `walks/w1/${id}.still.jpg` });
  const two = pinOf(v('a', 1), v('b', 2));
  assert.equal(pinThumb(two), null);
  assert.deepEqual(pinHeadKinds(two), ['video', 'video']);
  assert.equal(pinSpoken(two, { clocks: [W1] }), 'Two videos, one minute in');
  const one = pinOf(v('a', 1));
  assert.equal(pinThumb(one), 'walks/w1/a.still.jpg');
  assert.equal(pinHeadKinds(one), null);
  assert.equal(pinSpoken(one, { clocks: [W1] }), 'Video, one minute in', 'its minutes since tend map T28');
});

// tend map audit 19 (the T14 review's F1, accepted in part; U3): pins group by place, never time, so a loop's start
// and end share a pin; "at the start" for a note taken 58 minutes later was false. A pin whose moments lie more than
// JUST_AFTER_MS apart in walked time says its kinds alone; a pin of three kinds names all three (only two are drawn).
test('tend map audit 19: a pin of moments far apart in its walk says no one time; three kinds are all named', () => {
  // Amended by tend map T28 (decision 0164): it says the span, never the first one's time alone.
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 0), cap('b', 'text', 58)), { clocks: [W1] }), 'A photo and a note, from the start to fifty-eight minutes in');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 50)), [W1]), null);
  // Within ten walked minutes it still says the first one's time; a pause between them is not walked time.
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 22)), [W1]), 'twelve minutes in');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 40)), [{ ...W1, pauses: [{ started_at: T0 + 15 * MIN, ended_at: T0 + 35 * MIN }] }]), 'twelve minutes in');
  assert.equal(
    pinSpoken(pinOf(cap('a', 'photo', 1), cap('b', 'voice', 2), cap('c', 'text', 3)), { clocks: [W1] }),
    'A photo, a voice memo and a note, one minute in',
  );
});

// tend map audit 20 (the T14 review's F2): the native Marker was keyed by the pin's first id and its count, so a
// regroup that kept both (a photo and a note becoming two photos) kept the old fan of kinds on a phone.
test('tend map audit 20: a pin\'s key changes with its moments, not only with their count', () => {
  const a = cap('a', 'photo', 1);
  const k1 = pinKey(pinOf(a, cap('b', 'text', 2)));
  const k2 = pinKey(pinOf(a, cap('c', 'photo', 3)));
  assert.notEqual(k1, k2);
  assert.equal(pinKey(pinOf(a, cap('b', 'text', 2))), k1, 'the same moments, the same key');
  assert.notEqual(pinKey(pinOf(cap('a', 'photo', 1, { thumb_path: 'walks/w1/a.thumb.jpg' }))), pinKey(pinOf(a)), 'a small copy made since redraws it (QL27)');
});

// tend map audit 21 (the T14 review's F3): after Stop the open-walk state holds no walk and no pauses while the walk
// screen still shows the walk, so its pins' minutes counted the pauses as walked. The walk screen's clock is given only
// while the open-walk state holds that same walk.
test('tend map audit 21: the walk screen gives its walk\'s clock only while the open walk is that walk', () => {
  const walk = { id: 'w1', started_at: T0 };
  const pauses = [{ started_at: T0 + 2 * MIN, ended_at: T0 + 7 * MIN }];
  assert.deepEqual(walkClocks(walk, { id: 'w1' }, pauses), [{ id: 'w1', started_at: T0, pauses }]);
  assert.equal(walkClocks(walk, null, []), undefined, 'stopped: the open walk is gone, and its pauses with it');
  assert.equal(walkClocks(walk, { id: 'w2' }, pauses), undefined, 'another walk is open');
  assert.equal(walkClocks(null, { id: 'w1' }, pauses), undefined, 'no walk on the screen');
});

// tend map T28 (the owner's yes, decision 0164, "Time on every pin"; amends 0154, QL26, NY10, RB7): every pin that can
// say when says it. A pin of one moment says its minutes when its walk's clock is known; a pin whose moments lie more
// than ten walked minutes apart says the span; a map with no walk clock (Chronicle's map, memory pins, the ready
// screen), or a pin no one walk's clock holds (two walks on a day, a moment outside a walk), says the part of the day
// of its first moment, as a moment's own line does (MC4, `dayPartLine`). VISION.md Always, "A moment carries its
// context: place, time, its walk, what came just before".
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
/** Friday Nov 13, 2026, 22:00 local: the 10th is a Tuesday. */
const NOW = at(13, 22);
const day = (id: string, kind: CaptureKind, t: number, o: Partial<Faced> = {}): Faced => cap(id, kind, (t - T0) / MIN, o);

test('tend map T28: a pin of one moment says its minutes when its walk\'s clock is known', () => {
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12)), { clocks: [W1], now: NOW }), 'Photo, twelve minutes in');
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 0.2)), { clocks: [W1], now: NOW }), 'Photo, at the start');
  assert.equal(pinSpoken(pinOf(cap('a', 'text', 65, { note_type: 'idea' })), { clocks: [W1], now: NOW }), 'Note, idea, one hour and five minutes in');
  // A pause before it is not walked time.
  assert.equal(pinSpoken(pinOf(cap('a', 'voice', 12)), { clocks: [{ ...W1, pauses: [{ started_at: T0 + 2 * MIN, ended_at: T0 + 7 * MIN }] }], now: NOW }), 'Voice memo, seven minutes in');
  // Several close together keep the first one's minutes (tend map T14).
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12), cap('b', 'text', 15)), { clocks: [W1], now: NOW }), 'A photo and a note, twelve minutes in');
});

test('tend map T28: a pin whose moments lie more than ten walked minutes apart says the span', () => {
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 0), cap('b', 'text', 58)), { clocks: [W1], now: NOW }), 'A photo and a note, from the start to fifty-eight minutes in');
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12), cap('b', 'text', 50)), { clocks: [W1] }), 'A photo and a note, from twelve minutes to fifty minutes in');
  assert.equal(
    pinSpoken(pinOf(cap('a', 'photo', 50), cap('b', 'voice', 52), cap('c', 'photo', 125)), { clocks: [W1] }),
    'Two photos and a voice memo, from fifty minutes to two hours and five minutes in',
  );
  // Ten walked minutes or less is not a span; a pause between them is not walked time, wherever it falls.
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12), cap('b', 'text', 22)), { clocks: [W1] }), 'A photo and a note, twelve minutes in');
  const paused = [{ ...W1, pauses: [{ started_at: T0 + 15 * MIN, ended_at: T0 + 35 * MIN }] }];
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12), cap('b', 'text', 40)), { clocks: paused }), 'A photo and a note, twelve minutes in');
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12), cap('b', 'text', 60)), { clocks: paused }), 'A photo and a note, from twelve minutes to forty minutes in');
});

test('tend map T28: with no walk clock, the part of the day of the pin\'s first moment, as a moment\'s own line says it', () => {
  const evening = (id: string, kind: CaptureKind, min = 0, o: Partial<Faced> = {}) => day(id, kind, at(10, 19, min), o);
  const two = pinOf(evening('a', 'photo'), evening('b', 'text', 5));
  // Chronicle's map and the ready screen: no clocks.
  assert.equal(pinSpoken(two, { now: NOW }), 'A photo and a note, Tuesday evening');
  assert.equal(pinSpoken(pinOf(evening('a', 'photo')), { now: NOW }), 'Photo, Tuesday evening');
  // Memory pins say it whatever clocks the map has: their moments are of other walks.
  assert.equal(pinSpoken(two, { memory: true, clocks: [W1], now: NOW }), 'Memories: a photo and a note, Tuesday evening');
  assert.equal(pinSpoken(pinOf(evening('a', 'voice')), { memory: true, now: NOW }), 'Memory: Voice memo, Tuesday evening');
  // Morning, today's evening, night, and the small hours, which belong to the evening before (MC4, audit 10).
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(12, 9))), { now: NOW }), 'Photo, yesterday morning');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(13, 18))), { now: NOW }), 'Photo, this evening');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(13, 21, 30))), { now: NOW }), 'Photo, tonight');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(11, 23))), { now: NOW }), 'Photo, Wednesday night');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(11, 1, 30))), { now: NOW }), 'Photo, late Tuesday night');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(13, 2))), { now: NOW }), 'Photo, late last night');
  assert.equal(pinSpoken(pinOf(day('a', 'photo', new Date(2026, 9, 20, 15).getTime())), { now: NOW }), 'Photo, three weeks ago, afternoon');
  // The first moment's part, though a later one is in another.
  assert.equal(pinSpoken(pinOf(evening('a', 'photo'), day('b', 'text', at(10, 22))), { now: NOW }), 'A photo and a note, Tuesday evening');
  // A pin no one walk's clock holds: a day of two walks, or a moment outside a walk.
  const clocks: WalkClock[] = [{ id: 'w1', started_at: at(10, 18, 30), pauses: [] }, { id: 'w2', started_at: at(10, 18, 50), pauses: [] }];
  assert.equal(pinSpoken(pinOf(evening('a', 'photo'), evening('b', 'text', 3, { walk_id: 'w2' })), { clocks, now: NOW }), 'A photo and a note, Tuesday evening');
  assert.equal(pinSpoken(pinOf(evening('a', 'photo', 0, { walk_id: null })), { clocks, now: NOW }), 'Photo, Tuesday evening');
  // Amended by tend map audit 28 (the owner's answer to ux 2): on a map of several walks a pin of one walk says its
  // part of the day too.
  assert.equal(pinSpoken(pinOf(evening('a', 'photo', 0, { walk_id: 'w2' })), { clocks, now: NOW }), 'Photo, Tuesday evening');
  // No clock and no now (a caller that gives neither): the kinds alone, never a guess.
  assert.equal(pinSpoken(two, {}), 'A photo and a note');
  for (const p of [two, pinOf(evening('a', 'photo'))]) assert.doesNotMatch(pinSpoken(p, { now: NOW }), /\d/);
});

// tend map audit 27 (the T28 review's ux 1; the owner's answer, "Say the span"): a pin whose moments fall on different
// days said the first one's part of the day for all ("Memories: a photo and a note, three weeks ago, afternoon"). It
// says the span of their days, each end that moment's `dayPartLine`; an end whose line carries its own comma ("three
// weeks ago, afternoon", "March, two years ago, evening") gives the part before its part of the day. Same day: the
// first moment's part, as built. The small hours belong to the evening before, as `dayPartLine` has it.
test('tend map audit 27: a pin whose moments fall on different days says the span of their days', () => {
  const old = day('a', 'photo', new Date(2026, 9, 20, 15).getTime());
  const tue = day('b', 'text', at(10, 19));
  assert.equal(pinSpoken(pinOf(old, tue), { memory: true, now: NOW }), 'Memories: a photo and a note, from three weeks ago to Tuesday evening');
  // Chronicle's map and the ready screen, not a memory: the same.
  assert.equal(pinSpoken(pinOf(old, tue), { now: NOW }), 'A photo and a note, from three weeks ago to Tuesday evening');
  assert.equal(pinSpoken(pinOf(tue, day('c', 'photo', at(12, 9))), { now: NOW }), 'A note and a photo, from Tuesday evening to yesterday morning');
  assert.equal(
    pinSpoken(pinOf(day('a', 'photo', new Date(2024, 2, 4, 19).getTime()), day('b', 'photo', new Date(2026, 9, 20, 15).getTime())), { now: NOW }),
    'Two photos, from March, two years ago to three weeks ago',
  );
  // Two days whose ends read alike ("three weeks ago"): said once, never "from three weeks ago to three weeks ago".
  assert.equal(pinSpoken(pinOf(old, day('c', 'photo', new Date(2026, 9, 21, 15).getTime())), { now: NOW }), 'Two photos, three weeks ago');
  // One day: the first moment's part, though a later one is in another part.
  assert.equal(pinSpoken(pinOf(day('a', 'photo', at(10, 9)), tue), { now: NOW }), 'A photo and a note, Tuesday morning');
  // The small hours of Wednesday are Tuesday's night: one day, not a span.
  assert.equal(pinSpoken(pinOf(tue, day('c', 'photo', at(11, 1, 30))), { now: NOW }), 'A note and a photo, Tuesday evening');
  for (const o of [{ now: NOW }, { memory: true, now: NOW }]) assert.doesNotMatch(pinSpoken(pinOf(old, tue), o), /\d/);
});

// tend map audit 28 (the T28 review's ux 2; the owner's answer, "Part of the day"): on a day replay of two walks a
// pin said "ten minutes in" of its own walk beside another's "fifty minutes in", never saying which walk. When a
// map's clocks hold more than one walk, every pin says its part of the day; a day of one walk keeps the minutes or
// the span.
test('tend map audit 28: on a map of several walks every pin says its part of the day', () => {
  const clocks: WalkClock[] = [{ id: 'w1', started_at: at(10, 18, 30), pauses: [] }, { id: 'w2', started_at: at(10, 18, 50), pauses: [] }];
  const e = (id: string, kind: CaptureKind, min: number, walk: string) => day(id, kind, at(10, 19, min), { walk_id: walk });
  assert.equal(pinSpoken(pinOf(e('a', 'photo', 0, 'w2')), { clocks, now: NOW }), 'Photo, Tuesday evening');
  assert.equal(pinSpoken(pinOf(e('a', 'photo', 0, 'w1'), e('b', 'text', 3, 'w1')), { clocks, now: NOW }), 'A photo and a note, Tuesday evening');
  assert.equal(pinSpoken(pinOf(e('a', 'photo', 0, 'w1'), e('b', 'text', 3, 'w2')), { clocks, now: NOW }), 'A photo and a note, Tuesday evening');
  // A day of one walk: its minutes, as the walk's own replay says them.
  assert.equal(pinSpoken(pinOf(e('a', 'photo', 0, 'w1')), { clocks: clocks.slice(0, 1), now: NOW }), 'Photo, thirty minutes in');
});
