/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pinHeadKinds, pinInto, pinKindsWords, pinSpoken, pinsFor, pinThumb, type CapturePin, type WalkClock } from '../../pins';
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
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 12)), { clocks: [W1] }), 'Photo');
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
  assert.equal(pinSpoken(one, { clocks: [W1] }), 'Video');
});

// tend map audit 19 (the T14 review's F1, accepted in part; U3): pins group by place, never time, so a loop's start
// and end share a pin; "at the start" for a note taken 58 minutes later was false. A pin whose moments lie more than
// JUST_AFTER_MS apart in walked time says its kinds alone; a pin of three kinds names all three (only two are drawn).
test('tend map audit 19: a pin of moments far apart in its walk says no time; three kinds are all named', () => {
  assert.equal(pinSpoken(pinOf(cap('a', 'photo', 0), cap('b', 'text', 58)), { clocks: [W1] }), 'A photo and a note');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 50)), [W1]), null);
  // Within ten walked minutes it still says the first one's time; a pause between them is not walked time.
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 22)), [W1]), 'twelve minutes in');
  assert.equal(pinInto(pinOf(cap('a', 'photo', 12), cap('b', 'text', 40)), [{ ...W1, pauses: [{ started_at: T0 + 15 * MIN, ended_at: T0 + 35 * MIN }] }]), 'twelve minutes in');
  assert.equal(
    pinSpoken(pinOf(cap('a', 'photo', 1), cap('b', 'voice', 2), cap('c', 'text', 3)), { clocks: [W1] }),
    'A photo, a voice memo and a note, one minute in',
  );
});
