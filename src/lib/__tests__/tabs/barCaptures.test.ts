/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as band from '../../captureBand';
import * as bar from '../../recordingBar';

// The recording bar keeps a memo and a note (specs/recording-bar-captures, BC1-BC10, from T11). The bar's own checks
// are in the `barcaptures` journey; these are its decisions.

// Read loosely, so the file loads before the functions exist (written first, TG24).
const fn = (m: object, name: string) => (m as Record<string, unknown>)[name] as ((...a: unknown[]) => unknown) | undefined;

test('BC1: the bar\'s camera, mic and pencil show on every tab but Memories', () => {
  const captures = fn(band, 'barCaptures');
  assert.ok(captures, 'barCaptures exists');
  assert.deepEqual(captures('/', 'memories'), []);
  assert.deepEqual(captures('/', 'walks'), ['photo', 'voice', 'note']);
  assert.deepEqual(captures('/explore', 'memories'), ['photo', 'voice', 'note']);
  assert.deepEqual(captures('/day/2026-11-09', 'memories'), ['photo', 'voice', 'note']);
});

test('BC6: the line\'s words are the time alone; the distance stays in its spoken name', () => {
  const on = bar.recordingLine({ startedAt: 0, pauses: [], now: 12 * 60_000 + 5_000, distanceM: 1300 }) as ReturnType<typeof bar.recordingLine> & { time?: string };
  assert.equal(on.time, '12 min');
  assert.match(on.label, /1\.3[  ]km walked in 12 min/);
  const paused = bar.recordingLine({ startedAt: 0, pauses: [{ started_at: 60_000, ended_at: null }], now: 30 * 60_000, distanceM: 84 }) as typeof on;
  assert.equal(paused.time, '1 min');
  assert.equal(paused.text, paused.numbers); // no word drawn since T59
  assert.match(paused.label, /^Walk paused, 84[  ]m walked/);
});

test('BC6: the chevron shows on the line, never while a memo records', () => {
  const chevron = fn(bar, 'barChevron');
  assert.ok(chevron, 'barChevron exists');
  // At 320 px too since T58 (the owner's yes, Nov 22): the dot gives way there, not the chevron (`tend tabs T58`).
  assert.equal(chevron(360, false), true);
  assert.equal(chevron(390, false), true);
  assert.equal(chevron(390, true), false);
  assert.equal(chevron(640, true), false);
});

test('BC6: while a memo records the line says its time, and its name says the walk is paused when it is', () => {
  const memo = fn(bar, 'memoLine');
  assert.ok(memo, 'memoLine exists');
  const r = memo({ startedAt: 1_000, now: 8_400, paused: false }) as { time: string; label: string };
  assert.equal(r.time, '0:07');
  assert.equal(r.label, 'Recording voice memo, 0:07. Saves it and returns to the walk');
  const p = memo({ startedAt: 0, now: 75_000, paused: true }) as { time: string; label: string };
  assert.equal(p.time, '1:15');
  assert.equal(p.label, 'Recording voice memo, 1:15, walk paused. Saves it and returns to the walk');
  // Never a negative time from a clock read before the stamp.
  assert.equal((memo({ startedAt: 5_000, now: 4_000, paused: false }) as { time: string }).time, '0:00');
});

// The diff review (Nov 22): regression tests, each written to fail before its fix.

test('recording-bar-captures audit 1: a memo is saved when a full-screen card folds the bar away (Plan an outing, the area card)', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: true }), true);
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: false }), false);
  assert.equal(saves({ memoOn: false, moved: true, captures: false, covered: true }), false);
});

test('recording-bar-captures audit 2: a change of Chronicle\'s section with the bar in sight keeps the memo recording', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  // Walks to Days: the path is the same, the captures stay in sight.
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: false }), false);
  // Another tab: saved.
  assert.equal(saves({ memoOn: true, moved: true, captures: true, covered: false }), true);
});

test('recording-bar-captures audit 3: a memo recording where the bar holds no captures (Memories) is saved, however it began there', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  assert.equal(saves({ memoOn: true, moved: false, captures: false, covered: false }), true);
});

test('recording-bar-captures audit 4: the mic and the pencil are off while the bar\'s Stop runs, as while a capture is kept', () => {
  const off = fn(bar, 'barCapturesOff');
  assert.ok(off, 'barCapturesOff exists');
  assert.equal(off({ capturing: false, stopping: true }), true);
  assert.equal(off({ capturing: true, stopping: false }), true);
  assert.equal(off({ capturing: false, stopping: false }), false);
});

// T58 (the owner's yes, Nov 22, "Keep chevron, drop dot (Recommended)"): at 320 px the line keeps its chevron, the way
// back the cold find could not place without it, and leaves out the red dot; from 360 px both. Paused, the glyph shows.
test('tend tabs T58: at 320 px the bar keeps its chevron and leaves out the red dot; from 360 px both', () => {
  const chevron = fn(bar, 'barChevron');
  const dot = fn(bar, 'barDot');
  assert.ok(chevron && dot, 'barChevron and barDot exist');
  assert.equal(chevron(320, false), true);
  assert.equal(chevron(359, false), true);
  assert.equal(chevron(320, true), false);
  assert.equal(dot(320), false);
  assert.equal(dot(359), false);
  assert.equal(dot(360), true);
  assert.equal(dot(390), true);
  // Paused below 360 px the chevron gives way to the pause glyph, so the time stays whole (the owner, Nov 22, Paused320).
  assert.equal(chevron(320, false, true), false);
  assert.equal(chevron(359, false, true), false);
  assert.equal(chevron(360, false, true), true);
  assert.equal(chevron(390, false, true), true);
});

// The run's review (Nov 22): regression tests, each written to fail before its fix.

test('tend tabs audit 63: the line\'s gaps follow the drawings: 4 with the chevron below 360 px, 8 paused there, 10 elsewhere', () => {
  const gaps = fn(bar, 'barLineGaps');
  assert.ok(gaps, 'barLineGaps exists');
  // Recording below 360 px: the chevron and no dot (Proposed320B: gap 4, 6 on the right).
  assert.deepEqual(gaps(320, false, false), { gap: 4, right: 6 });
  // Paused below 360 px: the glyph and no chevron (Paused320: gap 8, 10 on the right).
  assert.deepEqual(gaps(320, false, true), { gap: 8, right: 10 });
  // From 360 px, and mid-memo at any width: as before.
  assert.deepEqual(gaps(390, false, false), { gap: 10, right: 10 });
  assert.deepEqual(gaps(390, false, true), { gap: 10, right: 10 });
  assert.deepEqual(gaps(320, true, false), { gap: 10, right: 10 });
});

test('tend tabs audit 65: the bar reads whether the walk is paused once, for its chevron, its gaps and its glyph alike', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');
  assert.equal((src.match(/pauses\.some\(/g) ?? []).length, 1, 'one reading of the open pause');
  assert.match(src, /barChevron\(width, memoOn, paused\)/);
  assert.match(src, /barLineGaps\(width, memoOn, paused\)/);
});

// T59 (the owner's yes, Nov 22, "Drop the word (Recommended)"; the drawing's Paused390, approved as drawn): with four
// buttons and the chevron the line had about 100 px at 390 px and " · Paused" shrank to "Pau…". Paused, the line draws
// the time alone; the pause glyph (0051, U10) shows it, a shape, and the spoken name keeps "Walk paused".
test('tend tabs T59: paused, the bar draws the time alone, no " · Paused"; the glyph and the spoken name say it', async () => {
  const paused = bar.recordingLine({ startedAt: 0, pauses: [{ started_at: 60_000, ended_at: null }], now: 30 * 60_000, distanceM: 84 });
  assert.equal(paused.paused, true);
  assert.equal(paused.time, '1 min');
  assert.doesNotMatch(paused.text, /Paused/);
  assert.equal(paused.text, paused.numbers);
  assert.equal('word' in paused, false, 'no word to draw');
  assert.match(paused.label, /^Walk paused, 84[ \u00a0\u202f]m walked in 1 min\. Return to the walk$/);
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');
  assert.doesNotMatch(src, /recording-word|· Paused/, 'the bar draws no word beside the time');
  assert.match(src, /testID="recording-paused"/, 'the pause glyph stays');
});

// The T59 review (auditor F2): test names still promised a drawn paused word after T59 took it away, for a later fix to
// "restore".
test('tend tabs audit 67: no test name in tabs/ promises a drawn paused word', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const titles = readdirSync(__dirname).filter((f) => f.endsWith('.test.ts'))
    .flatMap((f) => [...readFileSync(join(__dirname, f), 'utf8').matchAll(/^test\('((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1]));
  const stale = titles.filter((t) => /cuts the word|only the word|says Paused|its word apart/.test(t));
  assert.deepEqual(stale, []);
});
