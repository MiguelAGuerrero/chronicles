/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Moment stacks, MS6 (decision 0106): the Add to this moment pill's restraint, read from its source: a timing from
// motionTokens (through LiftIn), no hard-coded duration, no haptic or sound of its own, no accent colour, no count.
const FILE = join(__dirname, '../../../components/walk/AddToMomentPill.tsx');

test('MS6: the pill enters by LiftIn\'s motionTokens timing, with no haptic, sound, accent colour or number of its own', () => {
  assert.ok(existsSync(FILE), 'components/walk/AddToMomentPill.tsx');
  // The code alone: its comments may say what it never does.
  const src = readFileSync(FILE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(src, /\bLiftIn\b/);
  assert.doesNotMatch(src, /duration\s*:\s*\d|withTiming|setTimeout\([^)]*\d{3}/, 'no duration of its own');
  assert.doesNotMatch(src, /feedback\(|Haptics|Audio|playSound/, 'no haptic or sound beyond the capture\'s');
  assert.doesNotMatch(src, /theme\.accent|accent\b/, 'never the accent colour');
  assert.doesNotMatch(src, /pieces\.length|\.length\s*\}/, 'its words never carry the moment\'s size');
});
