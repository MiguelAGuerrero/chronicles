/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECALL_RULES, afterFire, dueRecalls, isExpired, reminderText } from '../discovery/recall';
import type { Recall } from '../discovery/types';
import type { Capture, LngLat } from '../types';

// Slice 4 of v1 (remind me here), written from criteria R2-R9 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 31, 15);

const capture = (id: string, over: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w0', t: Date.UTC(2026, 9, 20, 15), lat: O[1], lon: O[0], kind: 'text', file_path: null,
  body: 'The bakery smelled of cardamom.', segment_id: null, caption: null, caption_y: null, ...over,
});
const recall = (captureId: string, over: Partial<Recall> = {}): Recall => ({
  capture_id: captureId, frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null, ...over,
});
const due = (o: { recalls: Recall[]; captures: Capture[]; here?: LngLat; walkId?: string; now?: number; quiet?: boolean }) =>
  dueRecalls({ here: o.here ?? m(0, 0), walkId: o.walkId ?? 'w1', now: o.now ?? NOW, quiet: o.quiet ?? false, recalls: o.recalls, captures: o.captures })
    .map((d) => d.capture.id);

test('recall: fires within 75 m; never in its own walk; once per walk (R2)', () => {
  const c = [capture('a')];
  assert.equal(RECALL_RULES.reachM, 75);
  assert.deepEqual(due({ recalls: [recall('a')], captures: c, here: m(70, 0) }), ['a']);
  assert.deepEqual(due({ recalls: [recall('a')], captures: c, here: m(80, 0) }), []);
  assert.deepEqual(due({ recalls: [recall('a')], captures: c, walkId: 'w0' }), [], 'the walk that recorded it');
  assert.deepEqual(due({ recalls: [recall('a', { frequency: 'visit', last_walk_id: 'w1', last_fired_at: NOW - 1000 })], captures: c }), [], 'already fired in this walk');
  assert.deepEqual(due({ recalls: [recall('a', { frequency: 'visit', last_walk_id: 'w9', last_fired_at: NOW - 1000 })], captures: c }), ['a'], 'every visit: the next walk');
  assert.deepEqual(due({ recalls: [recall('a')], captures: [capture('a', { lat: null, lon: null })] }), [], 'a capture with no place');
});

test('recall: weekly waits 7 days, monthly 30 (R5)', () => {
  const c = [capture('a')];
  const fired = (days: number, frequency: Recall['frequency']) =>
    due({ recalls: [recall('a', { frequency, last_fired_at: NOW - days * DAY, last_walk_id: 'w9', fired_count: 1 })], captures: c });
  assert.deepEqual(fired(6.9, 'weekly'), []);
  assert.deepEqual(fired(7, 'weekly'), ['a']);
  assert.deepEqual(fired(29, 'monthly'), []);
  assert.deepEqual(fired(30, 'monthly'), ['a']);
});

test('recall: once clears on its first fire; past its until-date it is silent (R6, R9)', () => {
  assert.deepEqual(afterFire(recall('a'), 'w1', NOW), { kind: 'clear' });
  assert.deepEqual(afterFire(recall('a', { frequency: 'weekly', fired_count: 2 }), 'w1', NOW), {
    kind: 'update', patch: { last_fired_at: NOW, fired_count: 3, last_walk_id: 'w1' },
  });
  const until = recall('a', { frequency: 'visit', until: NOW - 1 });
  assert.equal(isExpired(until, NOW), true);
  assert.equal(isExpired(recall('a', { until: NOW + DAY }), NOW), false);
  assert.equal(isExpired(recall('a'), NOW), false);
  assert.deepEqual(due({ recalls: [until], captures: [capture('a')] }), []);
});

test('recall: two in reach show as one; quiet walk silences (R7, R8)', () => {
  const c = [capture('a'), capture('b', { lat: m(0, 30)[1] })];
  const both = dueRecalls({ here: m(0, 10), walkId: 'w1', now: NOW, quiet: false, recalls: [recall('a'), recall('b')], captures: c });
  assert.equal(both.length, 2);
  assert.equal(reminderText(both.map((d) => d.capture)).title, '2 memories here');
  assert.deepEqual(due({ recalls: [recall('a')], captures: c, quiet: true }), []);
});

test('recall: the reminder carries the content (R4)', () => {
  const long = 'x'.repeat(130);
  assert.deepEqual(reminderText([capture('a')]), { title: 'A note from here', body: 'The bakery smelled of cardamom.' });
  assert.equal(reminderText([capture('a', { body: long })]).body, `${'x'.repeat(120)}…`);
  assert.deepEqual(reminderText([capture('a', { kind: 'voice', body: null })]), { title: 'A memory from here', body: 'Voice memo, Oct 20' });
  assert.deepEqual(reminderText([capture('a', { kind: 'video', body: null })]), { title: 'A memory from here', body: 'Video, Oct 20' });
  assert.deepEqual(reminderText([capture('a', { kind: 'photo', body: null })]), { title: 'A memory from here', body: 'Photo, Oct 20' });
  assert.deepEqual(reminderText([capture('a', { kind: 'photo', body: null, caption: 'Mural on Wickenden' })]), { title: 'A memory from here', body: 'Mural on Wickenden' });
});
