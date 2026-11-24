/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { discardPillStacks } from '../../media/memoSave';

// tend tabs T61 (docs/STATUS.md, T61 [loop]): on the recording bar and the journal's band "Voice memo discarded" had Undo
// alone and went by itself after UNDO_MS, where Navigate's ready screen and the walk have Undo and Close and stay since
// `tend walk-screen T48` (the owner's "Undo + Close, stays", decision 0233; ui-patterns, "Undo stays until it is used or
// dismissed", decision 0113). The bar and the band take the same shape: Undo and a 44 pt Close, staying until Undo, Close,
// the next capture or the surface going, the narrow layout of tend walk-screen audit 28, and Discard's hint from
// `discardHint(true)` (audit 31). The sources are read: no test here renders React Native.

const SRC = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const BAR = 'components/RecordingBar.tsx';
const BAND = 'components/journal/OpenLine.tsx';
/** From `from` to the next `to` after it. */
const body = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  assert.ok(a >= 0, `has ${from}`);
  const b = src.indexOf(to, a + from.length);
  return src.slice(a, b < 0 ? undefined : b);
};
/** The `useCaptures(` call's arguments, to its closing `});` (tend tabs T61: an option's own body may end a line with `);`). */
const captures = (src: string) => body(src, 'useCaptures(', '});\n');
/** The discarded memo's pill, from its condition to the end of its block. */
const pill = (src: string, start: string) => {
  const a = src.indexOf(start);
  assert.ok(a >= 0, `has ${start}`);
  const end = /\n\s+\)\}/.exec(src.slice(a));
  return src.slice(a, end ? a + end.index : undefined);
};

test('tend tabs T61: the bar and the band ask for a discarded memo that stays', () => {
  assert.match(captures(read(BAR)), /discardStays: true/, 'the bar');
  assert.match(captures(read(BAND)), /discardStays: true/, 'the band');
});

test('tend tabs T61: the bar\'s and the band\'s discarded memo has Undo, then a 44 pt Close that says it stays discarded', () => {
  for (const [file, start, undo, close] of [
    [BAR, '{cap.discarded && ', 'testID="bar-voice-undo"', 'testID="bar-voice-close"'],
    [BAND, '{cap.discarded && ', 'testID="band-voice-undo-act"', 'testID="band-voice-close"'],
  ] as const) {
    const src = read(file);
    const p = pill(src, start);
    assert.match(p, /Voice (memo|note) discarded/, `${file}: the pill's words`);
    assert.ok(p.includes(undo), `${file}: Undo`);
    assert.match(p, /onPress=\{\(\) => (void )?cap\.undoDiscard\(\)\}/, `${file}: Undo keeps the memo`);
    const c = new RegExp(`<Pressable\\s+${close}([\\s\\S]*?)</Pressable>`).exec(p);
    assert.ok(c, `${file}: a Close in the pill`);
    assert.match(c[1], /accessibilityRole="button"/, `${file}: Close is a button`);
    assert.match(c[1], /accessibilityLabel=\{DISCARD_CLOSE_LABEL\}/, `${file}: Close says the memo stays discarded`);
    assert.match(c[1], /onPress=\{\(\) => (void )?cap\.closeDiscard\(\)\}/, `${file}: Close lets the memo go`);
    assert.match(c[1], /<Icon name="close"/, `${file}: the close glyph, as the walk's pill`);
    assert.ok(p.indexOf('undoDiscard') < p.indexOf('closeDiscard'), `${file}: Undo, then Close`);
    // 44 pt, with no hitSlop to lean on (react-native-web has none).
    const style = /style=\{styles\.(\w+)\}/.exec(c[1])?.[1];
    assert.ok(style, `${file}: Close's style`);
    assert.match(src, new RegExp(`\\n  ${style}: \\{[^}]*width: 44, height: 44`), `${file}: Close is 44 by 44`);
  }
});

test('tend tabs T61: Discard on the bar and the band says the Undo stays', () => {
  const bar = read(BAR);
  assert.match(body(bar, 'id="bar-voice-discard"', '/>'), /hint=\{discardHint\(true\)\}/, 'the bar\'s Discard');
  const band = read(BAND);
  assert.match(body(band, 'testID="band-voice-discard"', '>'), /accessibilityHint=\{discardHint\(true\)\}/, 'the band\'s Discard');
  for (const [file, src] of [[BAR, bar], [BAND, band]]) assert.doesNotMatch(src, /for a few seconds/, `${file}: no fixed words`);
});

test('tend tabs T61: the pill\'s words take a line of their own when its row cannot hold them, as on the walk', () => {
  // The bar's pill row is the screen less its 10 px a side: 370 px at 390 holds the row, 300 at 320 does not.
  assert.equal(discardPillStacks(390 - 20), false);
  assert.equal(discardPillStacks(320 - 20), true);
  // The band's column is the screen less its 16 px a side, 480 at most: 358 at 390, 288 at 320.
  assert.equal(discardPillStacks(Math.min(390 - 32, 480)), false);
  assert.equal(discardPillStacks(Math.min(320 - 32, 480)), true);
  for (const [file, room] of [[BAR, 'width - 20, fontScale'], [BAND, 'Math.min(width - 32, 480), fontScale']] as const) {
    const src = read(file);
    assert.ok(src.includes(`discardPillStacks(${room})`), `${file}: the room its pill has, by the shared rule`);
    const p = pill(src, '{cap.discarded && ');
    assert.match(p, /stacked && styles\.discardStacked/, `${file}: the stacked layout when it must`);
    assert.match(p, /stacked && styles\.discardTextStacked/, `${file}: the words a line of their own`);
    assert.match(src, /\n  discardStacked: \{[^}]*flexWrap: 'wrap'/, `${file}: Undo and Close under the words`);
    assert.match(src, /\n  discardTextStacked: \{[^}]*flexBasis: '100%'/, `${file}: the words a full line`);
  }
});

test('tend tabs T61: the bar\'s Stop lets its set-aside memo go as it begins, and its pill goes', () => {
  const bar = read(BAR);
  assert.match(pill(bar, '{cap.discarded && '), /^\{cap\.discarded && !memoOn && !stopping && /, 'no pill while stopping');
  const stop = body(bar, '  const stop = async () => {', '\n  };');
  assert.match(stop, /void cap\.closeDiscard\(\);/, 'Stop lets the memo go');
  assert.ok(stop.indexOf('cap.closeDiscard()') > stop.indexOf('barStop.set(mine)'), 'once the stop is under way');
});

test('tend tabs T61: the band lets its set-aside memo go when the walk it files into ends', () => {
  const band = read(BAND);
  const effect = body(band, 'const filedInto = useRef(', '}, [walkId]);');
  assert.match(effect, /if \(was != null && was !== walkId\) void capRef\.current\.closeDiscard\(\);/, 'the walk it files into ended');
});

// tend tabs audit 70 (the review's F4, the orchestrator's ruling R10): the band let its set-aside memo go only once the
// walk it files into had ended, after the bar's `stopEnd`; an Undo tapped between the Stop's `memoGate.stopUnder` and
// that end saved a memo the Stop never placed (walk-screen audit 33's concern). The band reads the bar's Stop: while
// that Stop is under way for its walk, its pill hides and its memo is let go.
test('tend tabs audit 70: the band hides its discarded memo\'s pill and lets the memo go while the bar\'s Stop is under way', () => {
  const band = read(BAND);
  assert.match(band, /const barStopFor = useStore\(barStop, \(s\) => \(walkId != null && s\?\.walkId === walkId \? s\.since : null\)\);/);
  assert.match(body(band, 'useEffect(() => {\n    if (barStopFor != null)', '}, [barStopFor]);'), /if \(barStopFor != null\) void capRef\.current\.closeDiscard\(\);/);
  assert.match(pill(band, '{cap.discarded && '), /^\{cap\.discarded && !recording && barStopFor == null && /, 'no pill while the bar stops its walk');
  // (tend tabs audit 70: read as the walk the band files into, set as Stop begins and cleared by that same stop.)
  assert.ok(band.indexOf('const barStopFor') > band.indexOf('const walkId = walk?.id ?? null;'));
});
