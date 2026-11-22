/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { captureBus, mergeCaptures } from '../../captureBus';
import { barTime, recordingLine } from '../../recordingBar';
import { NAV_KEY, navValue, walkHerePlan } from '../../startPlan';
import { notifyWalkChanged, onWalkChange } from '../../walkEvents';
import type { Waypoint } from '../../nav/types';

const spot: Waypoint = { at: [-71.4, 41.812], label: 'Your spot', kind: 'point' };
const cap = (id: string, t: number, extra: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w1', t, kind: 'photo', file_path: `walks/w1/${id}.jpg`, body: null, segment_id: null, lat: 41.812, lon: -71.4, ...extra,
});

test('NV9: the recording bar shows the time walked and the distance', () => {
  const r = recordingLine({ startedAt: 0, pauses: [], now: 125_000, distanceM: 340 });
  assert.equal(r.text, '2 min · 340\u00a0m'); // minutes since tend tabs 21
  assert.equal(r.paused, false);
  assert.match(r.label, /340[ \u00a0]m walked in 2 min/);
  assert.match(r.label, /return to the walk/i);
});

test('NV9: paused, it says Paused, and paused time is not counted', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 60_000, ended_at: null }], now: 125_000, distanceM: 1250 });
  // The numbers first since tend tabs audit 17: NV9's "elapsed time, distance, and Paused when paused".
  assert.equal(r.text, '1 min · 1.3\u00a0km · Paused');
  assert.equal(r.paused, true);
  assert.match(r.label, /^Walk paused/);
});

test('NV9: an ended pause is left out of the time, and the bar is running again', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 10_000, ended_at: 40_000 }], now: 100_000, distanceM: 0 });
  assert.equal(r.text, '1 min · 0\u00a0m');
  assert.equal(r.paused, false);
});

test('NV9: before the walk is known, the bar shows nothing walked', () => {
  assert.equal(recordingLine({ startedAt: null, pauses: [], now: 5000, distanceM: 0 }).text, '< 1 min · 0\u00a0m');
});

test('NV9: a capture from the bar reaches the walk screen once, whichever comes first, load or news (no loss, no double)', () => {
  const fromBar = cap('bar', 30);
  // News first, then the screen's load, which was read before the capture was stored.
  const afterNews = mergeCaptures([], [fromBar]);
  const stale = [cap('a', 10), cap('b', 20)];
  assert.deepEqual(mergeCaptures(stale, afterNews).map((c) => c.id), ['a', 'b', 'bar']);
  // The load already has it: still once.
  const fresh = [cap('a', 10), { ...fromBar, lat: null, lon: null }];
  const merged = mergeCaptures(fresh, afterNews);
  assert.deepEqual(merged.map((c) => c.id), ['a', 'bar']);
  // The copy held on screen wins (it carries where it is pinned until stop, and any caption).
  assert.equal(merged[1].lat, 41.812);
});

test('NV9: the capture news reaches other listeners of that walk only, never the one that made it', () => {
  const got: string[] = [];
  const me = {};
  const other = {};
  const offMe = captureBus.subscribe('w1', me, (c) => got.push(`me:${c.id}`));
  const offOther = captureBus.subscribe('w1', other, (c) => got.push(`other:${c.id}`));
  const offElse = captureBus.subscribe('w2', {}, (c) => got.push(`w2:${c.id}`));
  captureBus.emit(cap('x', 1), me);
  offOther();
  captureBus.emit(cap('y', 2), me);
  offMe();
  offElse();
  assert.deepEqual(got, ['other:x']);
});

test('NV10: with no walk open, Walk here starts one', () => {
  assert.deepEqual(walkHerePlan(null, spot), { kind: 'start' });
});

test('NV10: with a walk open, Walk here routes that walk there and returns to it, as its own Go here', () => {
  const p = walkHerePlan('w9', spot);
  assert.equal(p.kind, 'route');
  assert.deepEqual(p.kind === 'route' && p.meta, [[NAV_KEY, navValue('w9', spot)]]);
});

test('NV10: with a walk open and nowhere chosen, it only returns to the walk', () => {
  assert.deepEqual(walkHerePlan('w9', null), { kind: 'return' });
});

test('NV8: whoever keeps the open walk hears it start, pause, resume and stop', async () => {
  let n = 0;
  const off = onWalkChange(async () => {
    n++;
  });
  await notifyWalkChanged();
  await notifyWalkChanged();
  off();
  await notifyWalkChanged();
  assert.equal(n, 2);
});

test('tend tabs audit 17: paused, the line puts its time and distance first, so a narrow bar cuts the word, never the numbers', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 1_000, ended_at: null }], now: 9_000, distanceM: 18 });
  assert.match(r.text, /^< 1 min · 18[ \u00a0]m · Paused$/);
  // The spoken label is unchanged: the state first.
  assert.match(r.label, /^Walk paused, 18[ \u00a0]m walked in /);
  // Recording, the line is the numbers alone, as before.
  assert.doesNotMatch(recordingLine({ startedAt: 0, pauses: [], now: 9_000, distanceM: 18 }).text, /Paused/);
});

// The owner, Nov 20, on the lenses' steward silent 4 (the bar ticked seconds over the journal on every tab): "Minutes on
// the tabs (Recommended)". The bar above the tabs says the time walked in minutes; seconds stay on the walk screen.
test('tend tabs 21: the recording bar says the time walked in minutes, never seconds', () => {
  const at = (ms: number) => recordingLine({ startedAt: 0, pauses: [], now: ms, distanceM: 340 }).text;
  assert.equal(at(0), '< 1 min · 340\u00a0m');
  assert.equal(at(59_999), '< 1 min · 340\u00a0m');
  assert.equal(at(60_000), '1 min · 340\u00a0m');
  assert.equal(at(125_000), '2 min · 340\u00a0m');
  assert.equal(at(59 * 60_000 + 59_000), '59 min · 340\u00a0m');
  assert.equal(at(65 * 60_000), '1:05 · 340\u00a0m'); // hours:minutes past the hour since tend tabs audit 55
  for (const ms of [5_000, 125_000, 3_599_000]) assert.doesNotMatch(at(ms), /\d:\d\d|\bs\b/, 'under the hour no clock, no seconds');
  assert.doesNotMatch(at(3_725_000), /:\d\d:|\bs\b/, 'past it hours:minutes, never seconds (tend tabs audit 55)');
  assert.equal(recordingLine({ startedAt: 0, pauses: [{ started_at: 1_000, ended_at: null }], now: 9_000, distanceM: 18 }).text, '< 1 min · 18\u00a0m · Paused');
});

// The diff review's auditor 2, ux 2 and steward 2: past the hour "1 h 05 min · 4.2 km" filled the bar at 320 px and cut
// the distance, recording or paused. The owner, Nov 20, typed "1:45": past the hour the bar reads hours:minutes.
test('tend tabs audit 55: past the hour the bar reads hours:minutes ("1:45"), under it "< 1 min" and "N min"', () => {
  assert.equal(barTime(59 * 60_000 + 59_000), '59 min');
  assert.equal(barTime(60 * 60_000), '1:00');
  assert.equal(barTime(65 * 60_000 + 30_000), '1:05');
  assert.equal(barTime(105 * 60_000), '1:45');
  assert.equal(barTime(10 * 3_600_000 + 7 * 60_000), '10:07');
  assert.equal(recordingLine({ startedAt: 0, pauses: [], now: 65 * 60_000, distanceM: 4200 }).text, '1:05 · 4.2 km');
});

// The diff review's auditor 3 and steward 3: the bar drew whole minutes, floored (`barTime`), while its spoken label
// rounded (`formatDuration`): 30 s drawn "< 1 min" was said "30 s", 12 min 40 s drawn "12 min" said "13 min", 59 min 40 s
// said "1 h 00 min". The bar's spoken time is the time it draws.
test('tend tabs audit 56: the bar says the time it draws', () => {
  const said = (ms: number) => recordingLine({ startedAt: 0, pauses: [], now: ms, distanceM: 340 }).label;
  assert.match(said(30_000), /walked in under a minute\./);
  assert.match(said(12 * 60_000 + 40_000), /walked in 12 min\./);
  assert.match(said(59 * 60_000 + 40_000), /walked in 59 min\./);
  assert.match(said(65 * 60_000 + 30_000), /walked in 1 h 05 min\./);
  for (const ms of [0, 59_999, 60_000, 125_000, 12 * 60_000 + 59_000, 3_599_999, 3_600_000, 3_725_000]) {
    const drawn = barTime(ms);
    const spoken = /walked in (.+)\. Return/.exec(said(ms))?.[1] ?? '';
    const minutesOf = (t: string) => (t === '< 1 min' || t === 'under a minute' ? 0 : /^(\d+):(\d\d)$/.test(t) ? Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]) : /^(\d+) h (\d\d) min$/.test(t) ? Number(t.split(' ')[0]) * 60 + Number(t.split(' ')[2]) : Number(t.split(' ')[0]));
    assert.equal(minutesOf(spoken), minutesOf(drawn), `${ms} ms: drawn "${drawn}", said "${spoken}"`);
  }
});

// The diff review's ux 1, a regression of tend tabs 21: at 320 px, paused, the bar's one line ("< 1 min · 18 m · Paused")
// was cut inside its numbers ("< 1 min · 18…", the unit lost; "16…" for 168 m), since the numbers and the word were one
// string under one ellipsis. tend tabs audit 17 promised the word goes first.
test('tend tabs audit 57: the bar\'s line gives its numbers and its word apart, so only the word can shrink', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 1_000, ended_at: null }], now: 30_000, distanceM: 84 });
  assert.equal(r.numbers, '< 1 min · 84 m');
  assert.equal(r.word, 'Paused');
  assert.equal(r.text, `${r.numbers} · ${r.word}`);
  const on = recordingLine({ startedAt: 0, pauses: [], now: 9 * 60_000, distanceM: 750 });
  assert.equal(on.numbers, '9 min · 750 m');
  assert.equal(on.word, null);
  assert.equal(on.text, on.numbers);
  // The wiring: the time drawn never shrinks; the word, apart and hidden from a screen reader (the label says it), does.
  // Since T11 (BC6, the owner's drawing) the line draws the time alone, the distance in its label.
  const bar = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');
  assert.match(bar, /<Ticking testID="recording-numbers" style=\{\[styles\.text, styles\.numbers\]\} numberOfLines=\{1\} text=\{\(now\) => line\(now\)\.time\} label=\{\(now\) => line\(now\)\.label\}/);
  assert.match(bar, /numbers: \{[^}]*flexShrink: 0/);
  assert.match(bar, /word: \{[^}]*flexShrink: 1/);
});
