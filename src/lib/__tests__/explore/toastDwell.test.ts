/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { MOTION } from '../../motionTokens';

// tend explore 12 (decision 0172, O7): Explore's toast ("Zoom in to look closer") waited a literal 3000 ms. A dwell is a
// timing, so it is a named token beside MOTION.tip; nothing visible changes.

test('tend explore 12: a toast\'s dwell is a motion token, 3 s as before', () => {
  assert.equal((MOTION as Record<string, unknown>).toast, 3000);
});

test('tend explore 12: Explore clears its toast after MOTION.toast, never a hard-coded duration', () => {
  const src = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  const timer = /setTimeout\(\(\) => setToast\(null\), ([^)]+)\)/.exec(src);
  assert.ok(timer, 'the toast is cleared by a timer');
  assert.equal(timer[1].trim(), 'MOTION.toast');
});
