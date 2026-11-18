/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LINE_PLACEHOLDER } from '../../journal/lines';

// The journal's toolbar where the field sits in the bar (a thread, a lens): the hint "What’s on your mind?" holds one
// line beside the camera and the mic at 320 px (ui-patterns, "Nothing wraps on a 320 px phone"; WCAG 2.2, 1.4.4). The
// field is the typed words' too, and a placeholder alone cannot be styled apart on the web, so the field in the bar is
// written at the web's 16 px input minimum (ui-patterns, "Inputs are 16 px or more on the web"), in the same serif.
// The view imports React Native, so it is read as text; the journal journey measures it at 320 and 390 px.

const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'journal', 'OpenLine.tsx'), 'utf8');
const style = (name: string) => new RegExp(`\\n  ${name}:\\s*\\{[^}]*\\}`).exec(src)?.[0] ?? '';

test('tend chronicle 14: in a thread or a lens the toolbar\'s field is 16 px, in the typed words\' own serif, so its hint holds one line at 320 px', () => {
  assert.equal(LINE_PLACEHOLDER, 'What’s on your mind?', 'the hint\'s words are the owner\'s (decision 0171)');
  const input = /<TextInput\b[^>]*testID="line-input"[\s\S]*?\/>/.exec(src)?.[0] ?? '';
  assert.match(input, /placeholder=\{LINE_PLACEHOLDER\}/, 'the field carries the hint');
  const used = /style=\{\[styles\.field, (inBar && styles\.(\w+)), /.exec(input);
  assert.ok(used, `the field takes a style of its own in the bar: ${/style=\{[^\n]*/.exec(input)?.[0]}`);
  const bar = style(used[2]);
  assert.match(bar, /fontSize: 16\b/, `the field in the bar is 16 px: ${bar}`);
  assert.doesNotMatch(bar, /fontFamily/, `the typed words and the hint keep one font: ${bar}`);
  assert.match(style('field'), /fontFamily: OWNER_FONT, fontSize: 19\b/, 'on the page the line keeps its 19 px serif');
  // 16 px alone is not room enough for a phone's serif (Georgia's metrics, about 156 px; Android's Noto Serif, about
  // 168 px, where 155 px was left): the field's inset and Done's padding are given back in the bar, Done keeping 44 pt.
  assert.doesNotMatch(style('fieldInBar'), /padding/, `the field in the bar starts at the bar's edge: ${style('fieldInBar')}`);
  assert.match(style('doneInBar'), /paddingHorizontal: 0\b/, style('doneInBar'));
  assert.match(style('done'), /minWidth: 44\b/, 'Done keeps its 44 pt target');
  assert.equal((src.match(/\[styles\.done, inBar && styles\.doneInBar\]/g) ?? []).length, 2, 'Done and its kept room are the same width in the bar');
});
