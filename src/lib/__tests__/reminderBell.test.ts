/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExpired, liveRecalls, nextExpiry, remindedIds } from '../discovery/recall';
import type { Recall } from '../discovery/types';
import { pinReminded, pinsFor, type CapturePin } from '../pins';
import type { Capture, CaptureKind } from '../types';

const cap = (id: string, kind: CaptureKind, o: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w1', t: 1000, lat: 41.812, lon: -71.4, kind, file_path: `walks/w1/${id}`, body: null, segment_id: null, thumb_path: null, ...o,
});
const pinOf = (...cs: Capture[]): CapturePin => {
  const pins = pinsFor(cs, 30);
  assert.equal(pins.length, 1);
  return pins[0];
};
const recall = (capture_id: string, until: number | null = null): Recall => ({
  capture_id, frequency: 'visit', until, last_fired_at: null, fired_count: 0, last_walk_id: null,
});

test('RB1: a pin of one capture with a reminder is reminded, whatever its kind', () => {
  for (const kind of ['text', 'photo', 'voice', 'video'] as const) {
    assert.equal(pinReminded(pinOf(cap('a', kind)), new Set(['a'])), true, kind);
    assert.equal(pinReminded(pinOf(cap('a', kind)), new Set(['b'])), false, kind);
  }
});

test('RB2: a merged pin is reminded when any capture is, and not when none is', () => {
  const pin = pinOf(cap('a', 'text', { t: 1 }), cap('b', 'photo', { t: 2 }), cap('c', 'voice', { t: 3 }));
  assert.equal(pin.captures.length, 3);
  assert.equal(pinReminded(pin, new Set(['c'])), true);
  assert.equal(pinReminded(pin, new Set(['a', 'b', 'c'])), true);
  assert.equal(pinReminded(pin, new Set(['z'])), false);
  assert.equal(pinReminded(pin, new Set()), false);
});

test('RB3: a reminder past its until-date is not counted; one with no end or a later end is', () => {
  const now = 1_000_000;
  const ids = remindedIds([recall('open'), recall('later', now + 1), recall('today', now), recall('past', now - 1)], now);
  assert.deepEqual([...ids].sort(), ['later', 'open', 'today']);
});

test('reminder-bell audit 1: the viewer counts the same live reminders as the pin, never one past its end', () => {
  const now = 1_000_000;
  const live = liveRecalls([recall('open'), recall('past', now - 1), recall('later', now + 5)], now);
  assert.deepEqual(live.map((r) => r.capture_id).sort(), ['later', 'open']);
  assert.deepEqual([...remindedIds(live, now)].sort(), live.map((r) => r.capture_id).sort());
});

test('reminder-bell audit 2: a map open past a reminder\'s end re-reads at that end, and not before', () => {
  const now = 1_000_000;
  assert.equal(nextExpiry([recall('open')], now), null);
  assert.equal(nextExpiry([recall('a', now + 5000), recall('b', now + 2000), recall('past', now - 1)], now), now + 2000);
  // `until` is the last moment it is live (isExpired: until < now), so the bell goes just after it.
  assert.equal(isExpired(recall('b', now + 2000), now + 2000), false);
  assert.equal(isExpired(recall('b', now + 2000), now + 2001), true);
});
