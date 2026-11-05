/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { StreetSegment } from '../../types';
import { at, NOW } from './fixtures';

// Memories in context (MC1-MC5, MC7, MC16): written before the module, which a todo loads inside its body.
const ctx = (): Promise<any> => import(`../../resurface/${'context'}`);

const seg = (id: string, name: string | null, lon: number, lat: number): StreetSegment => ({
  id, name, kind_detail: 'residential', length_m: 100, geometry: [[[lon - 0.001, lat], [lon + 0.001, lat]]], build: 'b',
});
/** A fix this many metres north of the segments' line (111,320 m per degree of latitude). */
const north = (m: number): [number, number] => [-71.4, 41.8 + m / 111_320];

test('MC1: a place line says what is known: street and town, a street alone, a town alone, else "No place kept"', async () => {
  const { placeLine } = await ctx();
  assert.equal(placeLine({ street: 'Hope Street', town: 'Fox Point' }), 'Hope Street, Fox Point');
  assert.equal(placeLine({ street: 'Hope Street', town: null }), 'Hope Street');
  assert.equal(placeLine({ street: null, town: 'Fox Point' }), 'Fox Point');
  assert.equal(placeLine({ street: null, town: null }), 'No place kept');
  assert.notEqual(placeLine({ street: null, town: 'Fox Point' }), 'No place kept', 'never "No place kept" with a known town');
});

test('MC2: a street is shown only within 40 m of the fix; the snapped street wins only inside that', async () => {
  const { nearestStreet } = await ctx();
  const hope = seg('s1', 'Hope Street', -71.4, 41.8);
  const wickenden = seg('s2', 'Wickenden Street', -71.4, 41.8 + 30 / 111_320);
  assert.equal(nearestStreet(north(20), [hope], null), 'Hope Street', 'the nearest within 40 m');
  assert.equal(nearestStreet(north(60), [hope], null), null, 'nothing within 40 m');
  assert.equal(nearestStreet(north(25), [hope, wickenden], 's1'), 'Hope Street', 'the snapped one wins inside 40 m');
  assert.equal(nearestStreet(north(90), [hope, wickenden], 's1'), null, 'the snapped one is not stated beyond 40 m');
  assert.equal(nearestStreet(north(20), [hope, wickenden], 'gone'), 'Wickenden Street', 'a snapped id no longer cached falls back to the nearest');
  assert.equal(nearestStreet(north(10), [seg('s3', null, -71.4, 41.8)], null), null, 'an unnamed street is none');
  assert.equal(nearestStreet(null, [hope], 's1'), null, 'no fix, no street');
});

test('MC3: how far into the walk, in words, or "On its own"', async () => {
  const { minutesInLine } = await ctx();
  const min = 60_000;
  assert.equal(minutesInLine(null), 'On its own');
  assert.equal(minutesInLine(20_000), 'At the start');
  assert.equal(minutesInLine(10 * min), 'Ten minutes in');
  assert.equal(minutesInLine(1 * min), 'One minute in');
  assert.equal(minutesInLine(65 * min), 'One hour and five minutes in');
  assert.equal(minutesInLine(120 * min), 'Two hours in');
});

test('MC4: time of day in words with its day, by the walkTitle boundaries', async () => {
  const { partOfDay, dayPartLine } = await ctx();
  const h = (hour: number) => new Date(2026, 10, 3, hour, 30).getTime();
  assert.deepEqual([4, 5, 11, 12, 16, 17, 20, 21, 23].map((x) => partOfDay(h(x))), ['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night']);
  assert.equal(dayPartLine(new Date(2026, 10, 3, 19).getTime(), NOW), 'Tuesday evening');
  assert.equal(dayPartLine(new Date(2026, 10, 4, 9).getTime(), NOW), 'Yesterday morning');
  assert.equal(dayPartLine(new Date(2026, 10, 5, 8).getTime(), NOW), 'This morning');
  assert.equal(dayPartLine(at(2026, 10, 15), NOW), 'Three weeks ago, afternoon');
});

test('MC5: "just after a photo" names the immediately previous capture, within ten walked minutes, never its words', async () => {
  const { justAfter } = await ctx();
  const min = 60_000;
  assert.equal(justAfter({ kind: 'photo', walkedGapMs: 4 * min }), 'just after a photo');
  assert.equal(justAfter({ kind: 'text', walkedGapMs: 10 * min }), 'just after a note');
  assert.equal(justAfter({ kind: 'voice', walkedGapMs: 1 * min }), 'just after a voice memo');
  assert.equal(justAfter({ kind: 'video', walkedGapMs: 2 * min }), 'just after a video');
  assert.equal(justAfter({ kind: 'photo', walkedGapMs: 11 * min }), null, 'not at eleven minutes');
  assert.equal(justAfter(null), null, 'nothing before it');
});

test('MC5: the previous capture of the walk is the one just before, skipping deleted ones', async () => {
  const { previousCapture } = await ctx();
  const caps = [{ id: 'a', t: 1000, kind: 'photo' }, { id: 'b', t: 2000, kind: 'text' }, { id: 'c', t: 3000, kind: 'voice' }];
  assert.equal(previousCapture(caps, 'c', new Set())?.id, 'b', 'an intervening capture is the one named');
  assert.equal(previousCapture(caps, 'c', new Set(['b']))?.id, 'a', 'a deleted one never is');
  assert.equal(previousCapture(caps, 'a', new Set()), null);
});

test('MC1, MC3, MC4, MC5: one arrival line, clauses joined, the walk-time clause only inside a walk', async () => {
  const { arrivalLine } = await ctx();
  const t = new Date(2026, 10, 3, 19).getTime();
  assert.equal(
    arrivalLine({ street: 'Hope Street', town: 'Fox Point', t, now: NOW, walkedMs: 10 * 60_000, prev: { kind: 'photo', walkedGapMs: 4 * 60_000 } }),
    'Hope Street, Fox Point · Tuesday evening · Ten minutes in, just after a photo',
  );
  assert.equal(
    arrivalLine({ street: null, town: null, t, now: NOW, walkedMs: null, prev: null }),
    'No place kept · Tuesday evening · On its own',
  );
});

test('MC7: no digit in the walk-time clause or the words written here, across a range of durations', async () => {
  const { minutesInLine, arrivalLine, justAfter } = await ctx();
  for (let m = 0; m <= 400; m += 7) assert.ok(!/\d/.test(minutesInLine(m * 60_000)), `${m} min`);
  for (const k of ['photo', 'text', 'voice', 'video']) assert.ok(!/\d/.test(justAfter({ kind: k, walkedGapMs: 60_000 })), k);
  const line = arrivalLine({ street: '5th Avenue', town: 'Fox Point', t: NOW - 86_400_000, now: NOW, walkedMs: 9 * 60_000, prev: null });
  assert.match(line, /^5th Avenue, Fox Point/, 'a street name keeps its digit');
  assert.ok(!/\d/.test(line.replace('5th Avenue', '')), 'nothing else holds one');
});

test('MC16: "No place kept" and "On its own" name the app\'s lack, not the moment\'s', async () => {
  const { placeLine, minutesInLine } = await ctx();
  for (const s of [placeLine({ street: null, town: null }), minutesInLine(null)]) {
    assert.ok(!/not placed|failed|missing|lost|error/i.test(s), s);
  }
});
