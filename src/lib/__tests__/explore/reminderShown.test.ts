/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { firePlace } from '../../discovery/recall';

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
