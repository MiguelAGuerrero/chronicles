/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as memoSave from '../../media/memoSave';
import { DISCARD_CLOSE_LABEL, setAside } from '../../media/memoSave';

// T48, the owner's yes (Nov 19, "Undo + Close, stays (Recommended)", decision 0233, amending 0008's 5 s): "Voice memo
// discarded" on Navigate's ready screen and on the walk went by itself after five seconds and had no Close. The pill has
// Undo and Close and stays until it is used, closed, or replaced by the next capture; a memo set aside is let go then
// (ui-patterns, "Undo stays until it is used or dismissed", decision 0113). The screens are read from the source: no
// test here renders React Native.

const SRC = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
/** One of a file's functions, from its name to the next of its siblings. */
const body = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  assert.ok(a >= 0, `has ${from}`);
  const b = src.indexOf(to, a + from.length);
  return src.slice(a, b < 0 ? undefined : b);
};

test('tend walk-screen T48: a memo set aside stays until it is used, closed, replaced or its screen goes', () => {
  const a = { uri: 'blob:a' };
  const b = { uri: 'blob:b' };
  // Discarded: set aside, nothing let go yet. No clock is asked for: nothing but these events moves it.
  assert.equal(setAside.length, 2, 'a step of the memo set aside and an event: no time');
  assert.deepEqual(setAside(null, { type: 'discard', memo: a }), { held: a, keep: null, letGo: null });
  // Undo: kept, nothing let go.
  assert.deepEqual(setAside(a, { type: 'undo' }), { held: null, keep: a, letGo: null });
  // Close, the next capture and the screen going each let it go.
  for (const type of ['close', 'capture', 'leave'] as const) {
    assert.deepEqual(setAside(a, { type }), { held: null, keep: null, letGo: a }, `${type} lets the memo go`);
  }
  // A second discard replaces the first, which is let go.
  assert.deepEqual(setAside(a, { type: 'discard', memo: b }), { held: b, keep: null, letGo: a });
  // With nothing set aside, nothing is kept or let go.
  for (const type of ['undo', 'close', 'capture', 'leave'] as const) {
    assert.deepEqual(setAside(null, { type }), { held: null, keep: null, letGo: null });
  }
  // Close says what it leaves, as the Undo pill's Close does for a delete (deletion `dismissLabel`).
  assert.equal(DISCARD_CLOSE_LABEL, 'Close, it stays discarded');
});

test('tend walk-screen T48: the ready screen’s and the walk’s discard pills have Undo and Close', () => {
  for (const [file, undoId, closeId] of [
    ['components/MomentBar.tsx', '`${p}-voice-undo`', '`${p}-voice-close`'],
    ['app/walk.tsx', '"voice-undo"', '"voice-close"'],
  ] as const) {
    const src = read(file);
    const pill = /\{cap\.discarded && [^\n]*\(\n([\s\S]*?)\n {8}\)\}/.exec(src)?.[1] ?? '';
    assert.match(pill, /Voice memo discarded/, `${file}: the pill`);
    assert.ok(pill.includes(`testID=${undoId.startsWith('`') ? `{${undoId}}` : undoId}`), `${file}: Undo`);
    assert.match(pill, /onPress=\{\(\) => cap\.undoDiscard\(\)\}/, `${file}: Undo keeps the memo`);
    const close = new RegExp(`<Pressable\\s+testID=${closeId.startsWith('`') ? `\\{${closeId.replace(/[$`{}]/g, '\\$&')}\\}` : closeId}([\\s\\S]*?)</Pressable>`).exec(pill);
    assert.ok(close, `${file}: a Close beside Undo`);
    assert.match(close[1], /accessibilityRole="button"/, `${file}: Close is a button`);
    assert.match(close[1], /accessibilityLabel=\{DISCARD_CLOSE_LABEL\}/, `${file}: Close says the memo stays discarded`);
    assert.match(close[1], /onPress=\{\(\) => cap\.closeDiscard\(\)\}/, `${file}: Close lets the memo go`);
    assert.match(close[1], /<Icon name="close"/, `${file}: the close glyph, as the delete's Undo pill`);
    // Undo first, then Close, at the pill's end.
    assert.ok(pill.indexOf('undoDiscard') < pill.indexOf('closeDiscard'), `${file}: Undo, then Close`);
  }
});

test('tend walk-screen T48: on those two screens no timer takes the memo; the next capture or the screen going lets it go', () => {
  // The two screens ask for a pill that stays.
  assert.match(read('components/MomentBar.tsx'), /useCaptures\(null, null, null, props\.onError, \{\n {4}loose: true,\n {4}discardStays: true,/);
  assert.match(read('app/walk.tsx'), /useCaptures\(walk\?\.id \?\? null, live\.here, live\.lastFixAt, onCaptureError, \{\n {4}discardStays: true,/);
  const hook = read('lib/useCaptures.ts');
  // The discard arms the timer only for a path whose pill has no Close.
  const discard = body(hook, 'const discardVoice', 'const undoDiscard');
  assert.match(discard, /asideStep\(\{ type: 'discard', memo: m \}\)/, 'a discard sets the memo aside through setAside');
  assert.match(discard, /if \(!opts\.discardStays\) discardTimer\.current = setTimeout\(/, 'no timer where the pill stays');
  // Undo and Close go through the same step.
  assert.match(body(hook, 'const undoDiscard', 'const closeDiscard'), /asideStep\(\{ type: 'undo' \}\)/);
  assert.match(body(hook, 'const closeDiscard', '// Leaving the screen'), /asideStep\(\{ type: 'close' \}\)/);
  // A capture kept replaces it where the pill stays (tend walk-screen audit 29: kept, not only begun).
  assert.match(body(hook, 'async function add(', '\n  /**'), /if \(opts\.discardStays\) asideStep\(\{ type: 'capture' \}\);/);
  // The screen going lets it go, on every path (docs/DEFERRED.md, Recording bar captures: never deleted once unmounted).
  assert.match(body(hook, '// Leaving the screen', '// A capture held'), /setAside\(setAsideRef\.current, \{ type: 'leave' \}\)/);
  assert.doesNotMatch(hook, /setDiscarded\(\(/, 'no effect runs inside a state updater');
});

test('tend walk-screen T48: the paths that draw no Close keep the 5 s, so no pill there waits with no way out', () => {
  // The recording bar, the journal's band and the planner: Undo alone (or none), so the timer still lets the memo go.
  for (const file of ['components/RecordingBar.tsx', 'components/journal/OpenLine.tsx', 'components/planner/PlannerCapture.tsx']) {
    const src = read(file);
    assert.doesNotMatch(src, /discardStays/, `${file} keeps the timer`);
    assert.doesNotMatch(src, /closeDiscard/, `${file} draws no Close`);
  }
  assert.match(read('lib/useCaptures.ts'), /\nexport const UNDO_MS = 5000;/);
});

// tend walk-screen audit 28 (the batch's review: auditor F1, ux U1, U2, steward S3): at 320 px on the walk Close hung
// outside its pill, over the capture stack, and the words wrapped to two lines at 390 and three at 320 on the ready
// screen. When the row cannot hold the words on one line, they take a line of their own above Undo and Close, as the
// dead-zone nudge lays out its pill below 360 (`nudgeNarrow`).
test('tend walk-screen audit 28: the discard pill\'s words take their own line when the row cannot hold them', () => {
  const stacks = (memoSave as Record<string, unknown>).discardPillStacks as ((room: number, fontScale?: number) => boolean) | undefined;
  assert.equal(typeof stacks, 'function', 'a pure rule in lib/media/memoSave');
  // The pills' room is the screen less the left inset and the stack's column: 278 px at 390, 208 at 320.
  assert.equal(stacks!(278), true, 'at 390 the row cannot hold the words, Undo and Close');
  assert.equal(stacks!(208), true, 'nor at 320');
  assert.equal(stacks!(544), false, 'a wide screen keeps the one row');
  assert.equal(stacks!(400, 1.5), true, 'larger text needs more room');
  // tend walk-screen audit 28: both screens measure the same room, the screen less the pills' insets.
  for (const [file, style] of [['components/MomentBar.tsx', 'pillStacked'], ['app/walk.tsx', 'undoStacked']] as const) {
    const src = read(file);
    const pill = /\{cap\.discarded && [^\n]*\(\n([\s\S]*?)\n {8}\)\}/.exec(src)?.[1] ?? '';
    assert.match(pill, new RegExp(`stacked && styles\\.${style}`), `${file}: the pill takes the stacked layout when it must`);
    assert.match(src, /discardPillStacks\(/, `${file}: from the rule`);
    assert.match(src, new RegExp(`\\n  ${style}: \\{[^}]*flexWrap: 'wrap'`), `${file}: the words a line of their own, Undo and Close under them`);
  }
});

// tend walk-screen audit 29 (the batch's review: auditor F2): a capture only begun threw the set-aside memo away: the step
// ran in `stampNow`, before the camera's permission and its picker, and as the note's page opened. A camera cancelled or
// refused, or a note page closed empty, kept nothing, yet the memo was gone. Only a capture kept replaces it (decision
// 0233, "replaced by the next capture"), and a memo once it records.
test('tend walk-screen audit 29: only a capture kept, or a memo recording, lets the set-aside memo go', () => {
  const hook = read('lib/useCaptures.ts');
  const step = "if (opts.discardStays) asideStep({ type: 'capture' });";
  assert.ok(!body(hook, 'const stampNow', 'const startLocating').includes(step), 'a stamp taken is not a capture kept');
  const addPiece = body(hook, 'async function addPiece', 'async function add(');
  assert.ok(addPiece.indexOf(step) > addPiece.indexOf('await db.addPiece('), 'a piece kept lets it go, once stored');
  const add = body(hook, 'async function add(', '\n  /**');
  assert.ok(add.indexOf(step) > add.indexOf('await db.addMoment('), 'a moment kept lets it go, once stored');
  const start = body(hook, 'const startVoice', 'async function stopRecorder');
  assert.ok(start.indexOf(step) > start.indexOf('voice.record();'), 'a memo lets it go once it records');
});

// tend walk-screen audit 31 (the batch's review: auditor F5, ux U4, steward S2): Discard's hint said "You can undo for a
// few seconds." on the ready screen and the walk, where the pill now stays. It says what each host does.
test('tend walk-screen audit 31: Discard\'s hint says the Undo stays where the pill stays, a few seconds elsewhere', () => {
  const hint = (memoSave as Record<string, unknown>).discardHint as ((stays: boolean) => string) | undefined;
  assert.equal(typeof hint, 'function', 'a pure line in lib/media/memoSave');
  assert.equal(hint!(true), 'Throws this recording away. You can undo it.');
  assert.equal(hint!(false), 'Throws this recording away. You can undo for a few seconds.');
  // tend walk-screen audit 31: the stack's words come from its host, through `discardStays`.
  const stack = read('components/walk/CaptureStack.tsx');
  assert.match(stack, /hint=\{discardHint\(!!props\.discardStays\)\}/, 'the stack\'s Discard asks its host');
  assert.doesNotMatch(stack, /for a few seconds/, 'no fixed words in the stack');
  for (const file of ['components/MomentBar.tsx', 'app/walk.tsx']) {
    const at = read(file).indexOf('<CaptureStack');
    assert.match(read(file).slice(at, at + 1200), /\n\s*discardStays\n/, `${file}: its pill stays, and its Discard says so`);
  }
});

// tend walk-screen audit 32 (the batch's review: auditor F6): a discard still running as its screen went leaked the memo's
// file: the leave found nothing set aside, then the queued discard set the memo aside with the screen gone, and nothing was
// left to let it go. A step taken once the screen has gone lets the memo go at once.
test('tend walk-screen audit 32: a memo set aside once its screen has gone is let go at once', () => {
  const a = { uri: 'blob:a' };
  const gone = setAside as unknown as (held: unknown, e: unknown, gone?: boolean) => { held: unknown; keep: unknown; letGo: unknown };
  assert.deepEqual(gone(null, { type: 'discard', memo: a }, true), { held: null, keep: null, letGo: a }, 'discarded with the screen gone: let go');
  assert.deepEqual(gone(null, { type: 'discard', memo: a }, false), { held: a, keep: null, letGo: null }, 'in front: set aside, as before');
  assert.equal(setAside.length, 2, 'still no clock: the screen\'s presence is the one more input');
  // tend walk-screen audit 32: the hook's one step passes it.
  const hook = read('lib/useCaptures.ts');
  assert.match(body(hook, 'const asideStep', 'const resetAudioMode'), /setAside\(setAsideRef\.current, e, !alive\.current\)/, 'the hook says whether its screen is still there');
});

// tend walk-screen audit 33 (the batch's review: auditor F7): the walk's discard pill offered Undo while Stop was under way;
// an Undo after Stop's `finishVoice` saved a memo Stop never placed. When Stop begins, the memo set aside is let go and its
// pill goes.
test('tend walk-screen audit 33: Stop lets the walk\'s set-aside memo go and hides its pill', () => {
  const walk = read('app/walk.tsx');
  assert.match(walk, /\{cap\.discarded && !stopping && /, 'no discard pill while stopping');
  const stop = body(walk, '  async function stop() {', 'const couldNotStop');
  assert.match(stop, /void cap\.closeDiscard\(\);/, 'Stop lets the memo set aside go as it begins');
  assert.ok(stop.indexOf('cap.closeDiscard()') > stop.indexOf('setStopping(true)'), 'once the stop is under way');
});
