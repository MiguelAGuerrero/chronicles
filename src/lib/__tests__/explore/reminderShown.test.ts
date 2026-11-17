/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { firePlace, reminderSight } from '../../discovery/recall';

// A fired reminder is marked fired (a "once" one cleared) as it is shown, so it must go where a person can see it.
// The places that listen (the walk screen, the recording bar) import React Native, so their wiring is read as text;
// the memories journey's reminder steps check what is seen.
const lib = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(lib, ...p), 'utf8');

// After a reload with a walk open, the walk screen (mounted as the app opens, NR3) and the recording bar both listened
// in one slot, and whichever listened last took the fire: the walk screen, kept behind the tabs while minimized,
// took it out of sight, with no card, no bar line and no notification (docs/DEFERRED.md, "Reminders and
// notifications"). explore-marks: "the walk screen's card if it is in front and listening, else a notification".
test('tend explore 21: a fire goes to the newest place listening that is in front; one out of sight never takes it', () => {
  // The bar listened, then the walk screen kept behind the tabs: the bar, in front, takes it.
  assert.equal(firePlace(true, [true, false]), 0);
  // The walk screen in front, the bar gone or not: the walk's card.
  assert.equal(firePlace(true, [true]), 0);
  assert.equal(firePlace(true, [false, true]), 1);
  // Both in front for a moment (a screen on its way out): the newest, as the openers are asked (lib/openers).
  assert.equal(firePlace(true, [true, true]), 1);
  // None in front, none listening, or the app behind: a notification.
  assert.equal(firePlace(true, [false, false]), null);
  assert.equal(firePlace(true, []), null);
  assert.equal(firePlace(false, [true]), null);

  // The wiring: every place listens, none replaces another, and each says whether it is in front.
  const check = read('discovery', 'recallCheck.ts');
  assert.doesNotMatch(check, /let screen\b/, 'no single slot that the last listener takes');
  assert.match(check, /firePlace\(AppState\.currentState === 'active', \w+\.map\(\(p\) => p\.inFront\(\)\)\)/, 'deliver asks firePlace, with each place in front or not');
  const walk = readFileSync(join(lib, '..', 'app', 'walk.tsx'), 'utf8');
  assert.match(walk, /onRecallFired\(\s*\(due\) => \{[\s\S]*?\},\s*(\/\/[^\n]*\n\s*)*\(\) => focusedRef\.current,?\s*\)/, 'the walk screen takes a fire only while it is in front');
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /onRecallFired\(/, 'the recording bar listens too');
});

// A Remind me here fired while a walk is minimized and the tabs are folded under a full-screen card (the area card, the
// planner, the journal's keys) went to the recording bar, zero height and hidden then, which dropped it after 30 s:
// marked fired, never seen. The same under a viewer held over the tab. A notification is no way out: with the page in
// front the web shows none (docs/DEFERRED.md, "Tabs and the recording bar"). explore-marks: "The card goes after 30 s".
test('tend explore 22: a reminder the bar holds out of sight waits, however long; its half-minute runs from when it is seen', () => {
  const ms = 30_000;
  // Fired while folded: it waits, no clock.
  assert.deepEqual(reminderSight({ seenAt: null, inSight: false, now: 1_000, showMs: ms }), { seenAt: null, goesInMs: null });
  assert.deepEqual(reminderSight({ seenAt: null, inSight: false, now: 1_000_000, showMs: ms }), { seenAt: null, goesInMs: null });
  // Unfolded: seen now, and the whole half-minute is left.
  assert.deepEqual(reminderSight({ seenAt: null, inSight: true, now: 1_000_000, showMs: ms }), { seenAt: 1_000_000, goesInMs: ms });
  // Seen, then folded again: the half-minute it was seen for goes on.
  assert.deepEqual(reminderSight({ seenAt: 1_000_000, inSight: false, now: 1_010_000, showMs: ms }), { seenAt: 1_000_000, goesInMs: 20_000 });
  assert.deepEqual(reminderSight({ seenAt: 1_000_000, inSight: true, now: 1_040_000, showMs: ms }), { seenAt: 1_000_000, goesInMs: 0 });

  // The wiring: the bar is in sight only unfolded with nothing over it, and clears by the sight's clock alone.
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /useStore\(tabsHidden, /, 'the bar reads whether the tabs are folded');
  assert.match(bar, /useStore\(modalsUp, /, 'the bar reads whether anything is over it');
  assert.match(bar, /reminderSight\(\{ seenAt: [^}]*inSight[^}]*showMs: MOTION\.reminder \}\)/, 'its clock is the sight\'s');
  assert.doesNotMatch(bar, /setTimeout\(\(\) => setReminder\(null\), MOTION\.reminder\)/, 'no half-minute from the fire itself');
  const modal = read('..', 'components', 'Modal.tsx');
  assert.match(modal, /holdModal\(\)/, 'every Modal up says so');
});
