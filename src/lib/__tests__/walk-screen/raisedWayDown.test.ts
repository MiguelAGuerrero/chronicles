/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// T45, the owner's yes (Nov 19, "Done + map tap (Recommended)", decision 0233): pulled up, the ready bar's and the walk's
// settings covered the capture stack, and the only ways down were a drag, a tap on the numbers or the grip, Back or
// Escape. The raised panel has a labelled "Done" at the top right of its first row, and a tap on the map above it lowers
// it; both lower it as Escape does. Read from the source: no test here renders React Native.

const SRC = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

test('tend walk-screen T45: the raised panel has a labelled Done that lowers it as Escape does', () => {
  const bar = read('components/walk/ReadyBar.tsx');
  // Escape's own call: the handler lowers the bar through onUp(false).
  assert.match(bar, /e\.key === 'Escape' && onUpRef\.current\(false\)/, 'Escape lowers the bar through onUp(false)');
  const done = /<Pressable\s+testID=\{`\$\{id\}-done`\}([\s\S]*?)<\/Pressable>/.exec(bar);
  assert.ok(done, 'a Done button, `ready-done` or `walk-done`');
  const [whole, attrs] = done;
  assert.match(attrs, /accessibilityRole="button"/, 'a button to assistive tech');
  assert.match(attrs, /onPress=\{\(\) => props\.onUp\(false\)\}/, 'it lowers the bar as Escape does');
  assert.match(whole, />Done<\/Text>/, 'labelled in words, "Done"');
  // Inside the raised panel's scroll, where its first row is: drawn only while the settings are.
  const scroll = /<ScrollView[\s\S]*?<\/ScrollView>/.exec(bar)?.[0] ?? '';
  assert.ok(scroll.includes('-done`}'), 'Done sits in the raised panel, with the settings');
  // At the top right of the first row, a 44 pt target (ui-patterns).
  const style = /\n  done: \{([^}]*)\}/.exec(bar)?.[1] ?? '';
  assert.match(style, /position: 'absolute'/, 'placed over the first row');
  assert.match(style, /top: GRIP_UP/, 'level with the first row, below the grip');
  assert.match(style, /minHeight: 44/, 'a 44 pt target');
  assert.match(attrs, /right: at\.right/, 'at the right, on the captures\' column edge');
});

test('tend walk-screen T45: a tap on the ready map lowers the raised bar', () => {
  const ready = read('components/walk/useReady.tsx');
  const onPress = /\n    onPress: \(\) => \{([\s\S]*?)\n    \},/.exec(ready);
  assert.ok(onPress, 'the ready map\'s tap handler');
  assert.match(onPress[1], /layers\.closePanel\(\);/, 'it still closes the Layers panel (ML4)');
  assert.match(onPress[1], /if \(up\) setUp\(false\);/, 'raised, a tap on the map lowers the bar');
});

test('tend walk-screen T45: a tap on the walk\'s map lowers its raised settings, and does nothing else', () => {
  const walk = read('app/walk.tsx');
  const onPress = /onPress=\{\(at, radiusM\) => \{\n\s*layers\.closePanel\(\);([\s\S]*?)\n\s*\}\}\n\s*memories=/.exec(walk);
  assert.ok(onPress, 'the walk map\'s tap handler');
  const body = onPress[1];
  const lower = body.indexOf('if (options) {');
  assert.ok(lower >= 0, 'raised, a tap on the map lowers the settings');
  assert.match(body.slice(lower), /^if \(options\) \{\s*raiseOptions\(false\);\s*return;\s*\}/, 'as Escape does (raiseOptions(false)), and nothing else');
  assert.ok(lower < body.indexOf('if (isDrawing)'), 'before the tap is a point of a drawing, a route\'s pick or a card');
});

// Found building it: a name of its own beside the word would break WCAG 2.2, 2.5.3 Label in Name, and Done must say where
// it goes to a screen reader, as the summary's "Lower the walk settings" does.
test('tend walk-screen T45: Done is spoken by its word, with a hint saying it lowers the settings', () => {
  const bar = read('components/walk/ReadyBar.tsx');
  const attrs = /<Pressable\s+testID=\{`\$\{id\}-done`\}([\s\S]*?)>\s*<Text/.exec(bar)?.[1] ?? '';
  assert.doesNotMatch(attrs, /accessibilityLabel=/, 'its spoken name is the word it shows');
  assert.match(attrs, /accessibilityHint="Lowers the walk settings"/, 'a hint saying what it does');
});

// tend walk-screen audit 30 (the batch's review: auditor F4): on the walk, a tap on a moment's pin, a "?" place or a
// memory pin above the raised settings, or a long press on the map, opened a card over the still-raised panel; on the ready
// screen a pin tap with the bar up did nothing. Raised, each of them lowers the panel as the map's tap does, and nothing else.
test('tend walk-screen audit 30: raised, a pin, a place, a memory or a long press lowers the settings and opens nothing', () => {
  const walk = read('app/walk.tsx');
  assert.match(walk, /const lowerFirst = \(\) => \{\s*if \(!options\) return false;\s*raiseOptions\(false\);\s*return true;\s*\};/, 'one step: lowered, and nothing else');
  for (const [prop, rest] of [
    ['onPinPress', /\(cs: Faced\[\]\) => \{\s*if \(lowerFirst\(\)\) return;/],
    ['onMemoryPress', /\(group, at\) => \{\s*if \(lowerFirst\(\)\) return;/],
    ['onDiscoveryPress', /\(id\) => \{\s*if \(lowerFirst\(\)\) return;/],
    ['onLongPress', /\(at, radiusM\) => \{\s*if \(lowerFirst\(\)\) return;/],
  ] as const) {
    const at = walk.indexOf(`        ${prop}={`);
    assert.ok(at >= 0, `the walk map's ${prop}`);
    assert.match(walk.slice(at, at + 400), rest, `${prop} lowers the raised settings first`);
  }
  // tend walk-screen audit 30: the ready screen's pin and long press, as its map tap (T45).
  const ready = read('components/walk/useReady.tsx');
  assert.match(ready, /onPinPress: \(cs: Faced\[\]\) => \{\s*if \(up\) \{\s*setUp\(false\);\s*return;\s*\}/, 'the ready map: a pin tap lowers the raised bar');
  assert.match(ready, /onLongPress: \(p: LngLat\) => \{\s*if \(up\) \{\s*setUp\(false\);\s*return;\s*\}/, 'and a long press');
});

// tend walk-screen audit 35 (the batch's review: auditor F8, ux U5, U6): Done sat inside the settings' scroll, after their
// content: read last, scrolled away with the first row, 6 px below "This walk" on the walk, and web focus fell to the page
// once it lowered the panel. The first row (the screen's heading and Done) is pinned above the scroll, Done read right
// after the heading and centred with it, and Done sends focus to the numbers.
test('tend walk-screen audit 35: the raised panel\'s heading and Done are one row pinned above the scroll', () => {
  const bar = read('components/walk/ReadyBar.tsx');
  const head = bar.indexOf('testID={`${id}-head`}');
  assert.ok(head >= 0, 'a first row of its own');
  assert.ok(head < bar.indexOf('<ScrollView'), 'above the settings\' scroll, so it never scrolls away');
  const row = bar.slice(head, bar.indexOf('<ScrollView'));
  assert.ok(row.indexOf('{props.heading}') >= 0 && row.indexOf('{props.heading}') < row.indexOf('-done`}'), 'the heading, then Done: read in that order');
  const style = /\n  done: \{([^}]*)\}/.exec(bar)?.[1] ?? '';
  assert.doesNotMatch(style, /position: 'absolute'/, 'in the row\'s flow, centred with the heading');
  assert.match(bar, /onPress=\{\(\) => \{\s*props\.onUp\(false\);\s*focusOn\(summaryRef\);\s*\}\}/, 'Done lowers it and sends focus to the numbers');
  assert.match(read('components/walk/useReady.tsx'), /heading=\{<StartSettingsTitle \/>\}/, 'the ready screen\'s heading, "Walk settings"');
  assert.match(read('app/walk.tsx'), /heading=\{<Text style=\{styles\.spotTitle\} accessibilityRole="header">This walk<\/Text>\}/, 'the walk\'s, "This walk"');
});
