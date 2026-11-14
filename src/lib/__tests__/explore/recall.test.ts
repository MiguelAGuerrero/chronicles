/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECALL_RULES, afterFire, dueRecalls, editedRecall, isExpired, newRecall, reminderSpoken, reminderText } from '../../discovery/recall';
import { pinKindsWords } from '../../pins';
import type { Recall } from '../../discovery/types';
import type { LngLat } from '../../types';

// Slice 4 of v1 (remind me here), written from criteria R2-R9 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 31, 15);

const capture = (id: string, over: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w0', t: Date.UTC(2026, 9, 20, 15), lat: O[1], lon: O[0], kind: 'text', file_path: null,
  body: 'The bakery smelled of cardamom.', segment_id: null, caption: null, caption_y: null, ...over,
});
const recall = (captureId: string, over: Partial<Recall> = {}): Recall => ({
  capture_id: captureId, frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null, ...over,
});
const due = (o: { recalls: Recall[]; captures: Faced[]; here?: LngLat; walkId?: string; now?: number; quiet?: boolean }) =>
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
  assert.equal(reminderText(both.map((d) => d.capture)).title, 'Two memories here', 'in words since tend explore T29');
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

// Audit regressions (slice 4).

test('recall: a flag set during a walk waits for the next one (audit 1)', () => {
  const r = newRecall('a', 'once', null, 'w1');
  assert.equal(r.last_walk_id, 'w1');
  assert.deepEqual(due({ recalls: [r], captures: [capture('a')], walkId: 'w1' }), []);
  assert.deepEqual(due({ recalls: [r], captures: [capture('a')], walkId: 'w2' }), ['a']);
  assert.equal(newRecall('a', 'once', null, null).last_walk_id, null);
});

test('recall: an edit keeps what firing wrote (audit 11)', () => {
  const fresh = recall('a', { frequency: 'weekly', last_fired_at: NOW, fired_count: 4, last_walk_id: 'w3' });
  assert.deepEqual(editedRecall(fresh, 'monthly', NOW + DAY), { ...fresh, frequency: 'monthly', until: NOW + DAY });
});

test('recall: any accepted fix of a batch can bring it back (audit 10)', () => {
  const got = dueRecalls({ here: [m(200, 0), m(60, 0), m(-200, 0)], walkId: 'w1', now: NOW, quiet: false, recalls: [recall('a')], captures: [capture('a')] });
  assert.equal(got.length, 1);
});

test('recall: two memories name their kinds (UI review)', () => {
  const t = reminderText([capture('a', { kind: 'photo', body: null }), capture('b')]);
  assert.deepEqual(t, { title: 'Two memories here', body: 'A photo and a note' });
  assert.equal(reminderText([capture('a', { kind: 'voice', body: null }), capture('b', { kind: 'voice', body: null }), capture('c')]).body, 'Two voice memos and a note');
});

test('tend explore T29: a reminder of several says its count and kinds in words, as the pins do', () => {
  const at = (id: string, kind: Faced['kind'], min: number) => capture(id, { kind, body: kind === 'text' ? 'x' : null, t: Date.UTC(2026, 9, 20, 15, min) });
  // The kinds in the order taken, whatever order the flags came due in (the pins' order, pinKindsWords).
  const three = [at('n', 'text', 9), at('p', 'photo', 5), at('v', 'voice', 1)];
  assert.deepEqual(reminderText(three), { title: 'Three memories here', body: 'A voice memo, a photo and a note' });
  // The words are the pins' own, from one table.
  const pinOf = [...three].sort((a, b) => a.t - b.t);
  assert.equal(reminderText(three).body, pinKindsWords({ captures: pinOf }));
  // Two of one kind, said in words.
  assert.deepEqual(reminderText([at('a', 'photo', 1), at('b', 'photo', 2)]), { title: 'Two memories here', body: 'Two photos' });
  // Very many: never a numeral.
  const many = Array.from({ length: 64 }, (_, i) => at(`m${i}`, i === 0 ? 'text' : 'photo', i));
  const said = reminderText(many);
  assert.deepEqual(said, { title: 'Many memories here', body: 'A note and many photos' });
  assert.doesNotMatch(`${said.title} ${said.body}`, /\d/);
  // The announcements say the reminder's own words; one memory keeps "A memory from here".
  assert.equal(reminderSpoken(three), 'Three memories here');
  assert.equal(reminderSpoken([at('a', 'photo', 1), at('b', 'text', 2)]), 'Two memories here');
  assert.equal(reminderSpoken([at('a', 'text', 1)]), 'A memory from here');
  // One memory's body keeps its kind's name and date ("Voice memo, Oct 20"), from the pins' table too.
  assert.deepEqual(reminderText([at('a', 'voice', 1)]), { title: 'A memory from here', body: 'Voice memo, Oct 20' });
});

test('audit (moments 15): a moment made outside a walk does not come back on a walk started right after, at the spot', () => {
  const loose = [capture('m', { walk_id: null, t: NOW - 10 * 60_000 })];
  assert.deepEqual(due({ recalls: [recall('m')], captures: loose }), []);
  // Once it has rested, it comes back as any flagged capture does.
  const old = [capture('m', { walk_id: null, t: NOW - RECALL_RULES.looseRestMs - 1 })];
  assert.deepEqual(due({ recalls: [recall('m')], captures: old }), ['m']);
});
