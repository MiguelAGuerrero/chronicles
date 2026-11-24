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
