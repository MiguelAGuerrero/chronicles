/// <reference types="node" />
// The recording bar's way back (its line, a tapped reminder) and its held Stop (decision 0048) can both be under way:
// Stop waits up to 5 s for a memo or the bar's photo to be saved, and a tap on the line meanwhile opened the walk screen
// while the stop landed and pushed the replay over it, a flash of Navigate's ready screen and a second screen beneath
// the replay (NV27; the /tend tabs review's F4).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BAR_STOP_HOLD_MS, BAR_WAIT_MS, barGoesBack, barStopLeftMs, barStopping, type BarStop } from '../../recordingBar';
import { barStop } from '../../tabsHidden';

const bar = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');

test('tend tabs 12: the bar\'s way back does nothing while the walk is stopping from the bar, before its wait or after it', () => {
  const stop: BarStop = { walkId: 'w1', since: 1000 };
  assert.equal(barGoesBack({ returning: false, stop: null, walkId: 'w1', now: 1500 }), true, 'a tap on the line goes back');
  assert.equal(barGoesBack({ returning: true, stop: null, walkId: 'w1', now: 1500 }), false, 'one way back at a time');
  assert.equal(barGoesBack({ returning: false, stop, walkId: 'w1', now: 1500 }), false, 'held to stop: the stop goes alone');
  // The wiring: Stop says it is stopping before its first wait, and the way back asks before and after its own.
  assert.match(bar, /const stop = async \(\) => \{\n\s+if \(barStopping\(barStop\.get\(\), walk\.id, Date\.now\(\)\)\) return;\n\s+const mine = \{ walkId: walk\.id, since: Date\.now\(\) \};\n\s+barStop\.set\(mine\);/);
  assert.match(bar, /if \(!goesBack\(returning\.current\)\) return;\n\s+returning\.current = true;/);
  assert.match(bar, /await settleWithin\(keeping\.current, RETURN_WAIT_MS\);\n(\s+\/\/.*\n)*\s+if \(!goesBack\(false\)\) return;/);
  assert.match(bar, /finally \{\n\s+barStop\.set\(\(s\) => \(s === mine \? null : s\)\);/);
});

// A stop outlives the bar that began it: the tab bar unmounts the bar on blur ((tabs)/_layout.tsx, `minimized`), so a
// bar back from a day or a replay over the tabs knew nothing of it, opened the walk under the coming replay and let a
// second hold stop the walk again (the review's F1).
test('tend tabs audit 26: a bar remounted while its stop is under way still refuses the way back and a second stop', () => {
  assert.equal(barStop.get(), null, 'no stop at first');
  const mine: BarStop = { walkId: 'w1', since: 1000 };
  barStop.set(mine);
  assert.equal(barStopping(barStop.get(), 'w1', 2000), true, 'the walk\'s stop is under way for any bar');
  assert.equal(barStopping(barStop.get(), 'w2', 2000), false, 'another walk is not stopping');
  barStop.set((s) => (s === mine ? null : s));
  assert.equal(barStop.get(), null, 'the stop that set it clears it');
  // The wiring: the bar reads the shared stop, never its own instance's, for its busy Stop, its way back and its Stop.
  assert.match(bar, /const stopSince = useStore\(barStop, \(s\) => \(s\?\.walkId === walk\.id \? s\.since : null\)\);/);
  assert.match(bar, /const goesBack = \(returningNow: boolean\) => barGoesBack\(\{ returning: returningNow, stop: barStop\.get\(\), walkId: walk\.id, now: Date\.now\(\) \}\);/);
  assert.doesNotMatch(bar, /stoppingNow|useState\(false\);\n.*setStopping/);
});

// A stop could begin while a tapped reminder's key was being written (the single native write queue), and the walk
// screen still opened under the stop's replay (the review's F2).
test('tend tabs audit 27: the bar\'s way back asks again after a reminder\'s write, just before it shows the walk', () => {
  assert.match(
    bar,
    /if \(!goesBack\(false\)\) return;\n\s+\/\/ The walk screen opens what a tapped reminder asks for as it mounts \(R4\)\.\n\s+if \(open\) await db\.setMeta\(RECALL_OPEN_KEY, [^\n]*\n(\s+\/\/.*\n)*\s+if \(!goesBack\(false\)\) return;\n\s+feedback\('tap'\);\n\s+showWalk\(\);/,
  );
});

// endWalk has no bound of its own: a stop that hung (a wedged store, a recorder that never stops) left the bar's ›
// dead until the app was reopened, the owner's Nov 2 symptom (the review's F3). The way back is held only for as long
// as a stop can rightly take: its memo wait, its keep wait and a margin.
test('tend tabs audit 28: a stop that never settles stops refusing the bar\'s way back after its bound', () => {
  const stop: BarStop = { walkId: 'w1', since: 1000 };
  assert.ok(BAR_STOP_HOLD_MS > 2 * BAR_WAIT_MS, 'longer than the two waits a stop makes');
  assert.ok(BAR_STOP_HOLD_MS <= 2 * BAR_WAIT_MS + 5000, 'but not much longer');
  assert.equal(barGoesBack({ returning: false, stop, walkId: 'w1', now: 1000 + BAR_STOP_HOLD_MS - 1 }), false, 'within its bound');
  assert.equal(barGoesBack({ returning: false, stop, walkId: 'w1', now: 1000 + BAR_STOP_HOLD_MS }), true, 'past it, the › works again');
  assert.equal(barStopping(stop, 'w1', 1000 + BAR_STOP_HOLD_MS), false, 'and a second hold may stop the walk');
  // The bar's waits are the core's.
  assert.match(bar, /const RETURN_WAIT_MS = BAR_WAIT_MS;/);
});

test('tend tabs 13: the recording bar\'s own comment names its held Stop (decision 0048), not "no Stop"', () => {
  const doc = bar.slice(bar.indexOf('/**\n * The recording bar (NV9)'), bar.indexOf('export function RecordingBar'));
  assert.ok(doc.length > 0, 'the bar keeps its comment');
  assert.doesNotMatch(doc, /no Stop/);
  assert.match(doc, /held Stop \(decision 0048\)/);
});

// The bar's own busy Stop read the shared stop with no bound: a stop that hung left the Stop spinning and disabled for
// good, while the way back worked again, and a second hold was allowed, after BAR_STOP_HOLD_MS (the lenses' auditor 4).
test('tend tabs 19: a stop that never settles stops holding the bar\'s Stop busy after its bound', () => {
  const stop: BarStop = { walkId: 'w1', since: 1000 };
  assert.equal(barStopLeftMs(stop, 'w1', 1000), BAR_STOP_HOLD_MS, 'the whole bound as it begins');
  assert.equal(barStopLeftMs(stop, 'w1', 1000 + BAR_STOP_HOLD_MS - 1), 1, 'what is left of it');
  assert.equal(barStopLeftMs(stop, 'w1', 1000 + BAR_STOP_HOLD_MS), 0, 'none past it');
  assert.equal(barStopLeftMs(stop, 'w2', 1500), 0, 'another walk\'s stop holds nothing');
  assert.equal(barStopLeftMs(null, 'w1', 1500), 0);
  for (const now of [1000, 1000 + BAR_STOP_HOLD_MS - 1, 1000 + BAR_STOP_HOLD_MS]) {
    assert.equal(barStopping(stop, 'w1', now), barStopLeftMs(stop, 'w1', now) > 0, 'the way back, a second hold and the busy Stop agree');
  }
  // The wiring: the bar's `stopping` (its busy, disabled Stop) ends when the bound's timer fires, not only when the stop
  // clears the shared store.
  assert.match(bar, /const stopSince = useStore\(barStop, \(s\) => \(s\?\.walkId === walk\.id \? s\.since : null\)\);/);
  assert.match(bar, /setTimeout\(\(\) => setStopOver\(stopSince\), barStopLeftMs\(\{ walkId: walk\.id, since: stopSince \}, walk\.id, Date\.now\(\)\)\)/);
  assert.match(bar, /const stopping = stopSince != null && stopOver !== stopSince;/);
});

// A bar mounted after its walk's stop outlived the bound (its tab back in front) drew the spinning, disabled Stop for its
// first render, until the timer of 0 ms fired (the diff review's auditor 4, a regression of tend tabs 19). The bound is
// read as it mounts.
test('tend tabs audit 54: a bar mounted after its stop\'s bound draws the Stop at rest from its first render', () => {
  const stop: BarStop = { walkId: 'w1', since: 1000 };
  // What the initializer decides: past the bound, the stop counts as over from the start.
  assert.equal(barStopping(stop, 'w1', 1000 + BAR_STOP_HOLD_MS), false);
  assert.match(
    bar,
    /const \[stopOver, setStopOver\] = useState<number \| null>\(\(\) => \{\n\s+const s = barStop\.get\(\);\n\s+return s && s\.walkId === walk\.id && !barStopping\(s, walk\.id, Date\.now\(\)\) \? s\.since : null;\n\s+\}\);/,
  );
});
