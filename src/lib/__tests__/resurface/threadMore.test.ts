/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// A found thread's head (RM16, OT19): "Keep as my thread" is the screen's one button, and its rare actions, Rename and
// Not a thread, are in a More beside the "Thread" label (ui-patterns: "Nothing wraps on a 320 px phone", "never as loose
// buttons on content" T7, "Rare actions on an item go in More" matrix 3; decision 0172: a card's single primary action
// may keep the accent). The view imports React Native, so it is read as text; the e2e (resurface, threads) pictures it.

const read = () => readFileSync(join(__dirname, '..', '..', '..', 'components', 'chronicle', 'ThreadScreen.tsx'), 'utf8');
const tag = (src: string, id: string) => new RegExp(`<(\\w+)\\b[^>]*testID="${id}"[^>]*>`).exec(src);

test('tend chronicle 13: a found thread has one button, Keep as my thread, and its Rename and Not a thread in a More beside the Thread label', () => {
  const src = read();
  const keep = tag(src, 'thread-keep');
  assert.ok(keep, 'Keep as my thread is on the screen');
  assert.equal(keep[1], 'Button', `Keep as my thread is a button: ${keep[0]}`);
  assert.doesNotMatch(keep[0], /variant=/, `Keep as my thread is the primary button: ${keep[0]}`);
  // Outside the rename's own Save and Cancel, it is the only button.
  const head = src.replace(/\{renaming \? \([\s\S]*?\) : \(/, '');
  assert.deepEqual([...head.matchAll(/<Button\b[^>]*testID="([\w-]+)"/g)].map((m) => m[1]), ['thread-keep'], 'the head holds one button');

  // The More: in the top row, after the "Thread" label, an ink ellipsis named by the thread, as a walk's is.
  const top = /<View style=\{styles\.top\}>([\s\S]*?)\n {6}<\/View>/.exec(src)?.[1] ?? '';
  assert.match(top, /<Text style=\{styles\.eyebrow\}>Thread<\/Text>[\s\S]*testID="thread-more"/, 'the More follows the Thread label in its row');
  const more = /<Pressable\b[^>]*testID="thread-more"[\s\S]*?<\/Pressable>/.exec(top)?.[0] ?? '';
  assert.match(more, /accessibilityLabel=\{moreFor\(props\.thread\.name\)\}/, `the More is named by the thread: ${more}`);
  assert.match(more, /<Icon name="ellipsis-horizontal"[^>]*color=\{theme\.ink\}/, `the More is an ink ellipsis: ${more}`);
  assert.match(src, /more: \{[^}]*width: 44, height: 44/, 'the More is a 44 pt target');

  // The menu: the app's sheet, Rename and Not a thread with their words, then a muted Cancel.
  const sheet = /testID="thread-menu"[\s\S]*?<\/Modal>/.exec(src)?.[0].replace(/^testID="thread-menu"/, '') ?? '';
  assert.match(src, /import \{ Modal \} from '\.\.\/Modal';/, 'the sheet is the app\'s Modal');
  const items = [...sheet.matchAll(/testID="([\w-]+)"[\s\S]*?<Text style=\{[^>]*\}>([^<]+)<\/Text>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(items, [['thread-rename', 'Rename'], ['thread-remove', 'Not a thread'], ['thread-menu-cancel', 'Cancel']], JSON.stringify(items));
  assert.doesNotMatch(src, /<Button\b[^>]*testID="thread-(rename|remove)"/, 'Rename and Not a thread are no longer loose buttons');
});
