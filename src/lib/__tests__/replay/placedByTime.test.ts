/// <reference types="node" />
// tend replay T51 (the owner's "Place it by its time (Recommended)", Nov 20): a memo with no place of its own (no fix
// in the 15 s before it began, none found after, and kept after the walk's Stop had placed its moments) is told where
// its start time falls on the path, and its pin on the card stands there too. The story reads it once (`walkStory`);
// the card's pins are the story's captures (`useRevealed`), so the place it is told at is the one it is pinned at.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayStory, walkStory } from '../../ceremony/story';
import type { StoryMoment } from '../../ceremony/types';
import type { Day } from '../../days';
import { distanceM } from '../../geo';
import { pinHint } from '../../replay';
import type { TracePoint } from '../../types';
import { at, cap, endT, input, line, MIN, O } from './walks';

const momentOf = (s: ReturnType<typeof walkStory>) => s.events.filter((e): e is StoryMoment => e.kind === 'moment');
const pinOf = (s: ReturnType<typeof walkStory>, id: string) => {
  const c = s.captures.find((x) => x.id === id);
  assert.ok(c, 'the memo is among the story\'s captures');
  return c.lat != null && c.lon != null ? ([c.lon, c.lat] as [number, number]) : null;
};

test('tend replay T51: a memo with no place begun inside the trace is told at the point its start time falls on, at its time, and pinned there on the card', () => {
  const fixes = line(O, at(600), 9 * 60 * MIN);
  // Begun 2 s after the 41st fix (280 m in at 7 m a fix): kept with no fix, as one saved through Stop is.
  const t = fixes[40].t + 2000;
  const memo = cap('voice', t, null, '3000');
  const s = walkStory(input(fixes, [memo]));
  const [m] = momentOf(s);
  assert.ok(m.at, 'the moment is told somewhere');
  assert.ok(distanceM(m.at, at(282.8)) < 1, `told 282.8 m along the path, where its start time falls (${distanceM(m.at, O).toFixed(1)} m)`);
  assert.ok(m.arrive <= t && t <= m.leave && m.leave < endT(fixes), 'told at its own time (its stop round it), not after the walk');
  assert.ok(m.onTrace, 'on the trace');
  assert.ok(s.events.some((e) => e.kind === 'move' && e.t0 >= m.leave), 'the walk goes on after it');
  const pin = pinOf(s, memo.id);
  assert.ok(pin, 'pinned on the card');
  assert.ok(distanceM(pin, m.at) < 0.01, 'the pin stands where it is told');
  assert.equal(pinHint(s.captures), 'Tap a pin to open it', 'the card has a pin to tap, so its one hint shows');
});

test('tend replay T51: a memo with no place begun after the last fix is told where the walker was last known, and pinned there', () => {
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const memo = cap('voice', endT(fixes) + 30_000, null, '3000');
  const s = walkStory(input(fixes, [memo]));
  const [m] = momentOf(s);
  assert.ok(m.at && distanceM(m.at, at(600)) < 1, 'told at the last fix: the run before it is where the walker was last known');
  assert.equal(m.onTrace, false);
  const pin = pinOf(s, memo.id);
  assert.ok(pin && distanceM(pin, m.at) < 0.01, 'pinned where it is told');
});

test('tend replay T51: a memo with no place begun in a gap is told and pinned at the end of the run before it', () => {
  const a = line(O, at(300), 9 * 60 * MIN);
  const b = line(at(300, 200), at(600, 200), endT(a) + 10 * MIN);
  const fixes: TracePoint[] = [...a, ...b];
  const memo = cap('voice', endT(a) + 4 * MIN, null, '3000');
  const s = walkStory(input(fixes, [memo]));
  const [m] = momentOf(s);
  assert.ok(m.at && distanceM(m.at, at(300)) < 1, 'where the walker was last known before the gap');
  const pin = pinOf(s, memo.id);
  assert.ok(pin && distanceM(pin, m.at) < 0.01, 'pinned where it is told');
});

test('tend replay T51: a placed memo keeps its own place, and the stored capture is never changed', () => {
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const own = at(150, 30);
  const placed = cap('voice', fixes[40].t, own, '3000');
  const unplaced = cap('voice', fixes[70].t, null, '3000');
  const s = walkStory(input(fixes, [placed, unplaced]));
  const pin = pinOf(s, placed.id);
  assert.ok(pin && distanceM(pin, own) < 0.01, 'its own fix, not the trace');
  assert.equal(unplaced.lat, null, 'the capture read from the store is left as it was: the place is read, not written');
  assert.equal(unplaced.lon, null);
});

test('tend replay T51: the day replay pins a walk\'s memo with no place where its walk tells it; a loose one stays unpinned', () => {
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const memo = cap('voice', fixes[40].t + 2000, null, '3000');
  const loose = cap('text', 7 * 60 * MIN, null, 'Early', null);
  const walk = input(fixes, [memo]);
  const day: Day = { key: '2026-11-04', entries: [{ kind: 'moment', t: loose.t, capture: loose }, { kind: 'walk', t: fixes[0].t, walk: walk.walk, captures: walk.captures }], moments: 2, walks: 1 };
  const s = dayStory(day, new Map([['w', walk]]));
  const pin = pinOf(s, memo.id);
  assert.ok(pin && distanceM(pin, at(282.8)) < 1, 'pinned on its walk\'s path, where its start time falls');
  assert.equal(pinOf(s, loose.id), null, 'a moment with no walk to place it by stays without a pin');
});
