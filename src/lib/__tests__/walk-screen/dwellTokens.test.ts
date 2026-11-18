/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { MOTION } from '../../motionTokens';

// tend walk-screen 8 (decision 0172, O23, the owner's answer to "Dwell times hard-coded in the walk screen"): how long a
// line stays on the walk screen by itself is a timing, so each dwell is a named token in `lib/motionTokens` beside
// `MOTION.tip`, named for what it holds (as Explore's `MOTION.exploreToast`); nothing visible changes.

const read = (rel: string) => readFileSync(join(__dirname, '../../..', rel), 'utf8');
const tokens = MOTION as Record<string, unknown>;

/** Each `setTimeout` whose delay is a number written in the file, above 0 (a 0 only defers to the next turn). */
const literalDelays = (src: string) =>
  [...src.matchAll(/setTimeout\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?,\s*([\d_]+)\s*\)/g)].map((m) => Number(m[1].replace(/_/g, ''))).filter((n) => n > 0);

test('tend walk-screen 8: the walk screen\'s dwells are motion tokens, each as long as before', () => {
  assert.equal(tokens.walkToast, 1500);
  assert.equal(tokens.arrival, 4000);
  assert.equal(tokens.deadZoneNudge, 20_000);
  assert.equal(tokens.saveFocus, 300);
  assert.equal(tokens.walkNotice, 6000);
  assert.equal(tokens.reminder, 30_000);
  assert.equal(tokens.momentToast, 4000);
});

test('tend walk-screen 8: no dwell is a number written in the walk screen, its moment bar or the recording bar\'s reminder', () => {
  const walk = read('app/walk.tsx');
  const bar = read('components/MomentBar.tsx');
  const recording = read('components/RecordingBar.tsx');
  assert.deepEqual(literalDelays(walk), [], 'walk.tsx');
  assert.deepEqual(literalDelays(bar), [], 'MomentBar.tsx');
  for (const name of ['NOTICE_MS', 'REMINDER_MS']) assert.doesNotMatch(walk, new RegExp(`^const ${name} = `, 'm'), `walk.tsx's ${name}`);
  assert.doesNotMatch(recording, /^const REMINDER_MS = /m, "RecordingBar.tsx's REMINDER_MS");
  // Each timer reads its own token.
  assert.match(walk, /setTimeout\(\(\) => setToast\(null\), MOTION\.walkToast\)/);
  assert.match(walk, /setTimeout\(\(\) => setArrived\(null\), MOTION\.arrival\)/);
  assert.match(walk, /setTimeout\(\(\) => setNudge\(null\), MOTION\.deadZoneNudge\)/);
  assert.match(walk, /setTimeout\(\(\) => focusOn\(saveRef\), MOTION\.saveFocus\)/);
  assert.match(walk, /setTimeout\(\(\) => setNotice\(null\), MOTION\.walkNotice\)/);
  assert.match(walk, /reminder\.shownAt \+ MOTION\.reminder - Date\.now\(\)/);
  assert.match(bar, /setTimeout\(\(\) => setToast\(null\), MOTION\.momentToast\)/);
  // Since tend explore 22 the bar's half-minute is time in sight, still the reminder's own token.
  assert.match(recording, /reminderSight\(\{ sight: [^}]*showMs: MOTION\.reminder \}\)/);
  assert.match(recording, /setTimeout\(\(\) => setReminder\(null\), sight\.goesInMs\)/);
});
