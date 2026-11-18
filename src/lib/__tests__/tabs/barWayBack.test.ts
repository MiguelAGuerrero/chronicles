/// <reference types="node" />
// The recording bar's way back (its line, a tapped reminder) and its held Stop (decision 0048) can both be under way:
// Stop waits up to 5 s for a memo or the bar's photo to be saved, and a tap on the line meanwhile opened the walk screen
// while the stop landed and pushed the replay over it, a flash of Navigate's ready screen and a second screen beneath
// the replay (NV27; the /tend tabs review's F4).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { barGoesBack } from '../../recordingBar';

const bar = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');

test('tend tabs 12: the bar\'s way back does nothing while the walk is stopping from the bar, before its wait or after it', () => {
  assert.equal(barGoesBack({ returning: false, stopping: false }), true, 'a tap on the line goes back');
  assert.equal(barGoesBack({ returning: true, stopping: false }), false, 'one way back at a time');
  assert.equal(barGoesBack({ returning: false, stopping: true }), false, 'held to stop: the stop goes alone');
  // The wiring: Stop says it is stopping before its first wait, and the way back asks before and after its own.
  assert.match(bar, /const stop = async \(\) => \{\n\s+if \(stopping\) return;\n\s+stoppingNow\.current = true;/);
  assert.match(bar, /if \(!barGoesBack\(\{ returning: returning\.current, stopping: stoppingNow\.current \}\)\) return;\n\s+returning\.current = true;/);
  assert.match(bar, /await settleWithin\(keeping\.current, RETURN_WAIT_MS\);\n(\s+\/\/.*\n)*\s+if \(!barGoesBack\(\{ returning: false, stopping: stoppingNow\.current \}\)\) return;/);
  assert.match(bar, /finally \{\n\s+stoppingNow\.current = false;\n\s+setStopping\(false\);/);
});

test('tend tabs 13: the recording bar\'s own comment names its held Stop (decision 0048), not "no Stop"', () => {
  const doc = bar.slice(bar.indexOf('/**\n * The recording bar (NV9)'), bar.indexOf('export function RecordingBar'));
  assert.ok(doc.length > 0, 'the bar keeps its comment');
  assert.doesNotMatch(doc, /no Stop/);
  assert.match(doc, /held Stop \(decision 0048\)/);
});
