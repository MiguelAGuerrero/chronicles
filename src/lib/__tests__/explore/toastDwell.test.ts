/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { MOTION } from '../../motionTokens';

// tend explore 12 (decision 0172, O7): Explore's toast ("Zoom in to look closer") waited a literal 3000 ms. A dwell is a
// timing, so it is a named token beside MOTION.tip; nothing visible changes.
// tend explore audit 14 (auditor 6): named for every toast, the token said the walk screen's 1.5 s toast was wrong; it is
// Explore's own, `MOTION.exploreToast`, and the walk screen's dwells (O23) keep theirs for the walk screen's run.

const tokens = MOTION as Record<string, unknown>;

test('tend explore 12, tend explore audit 14: Explore\'s toast dwell is its own motion token, 3 s as before; no token claims every toast', () => {
  assert.equal(tokens.exploreToast, 3000);
  assert.equal(tokens.toast, undefined);
});

test('tend explore 12, tend explore audit 14: Explore clears its toast after MOTION.exploreToast, never a hard-coded duration', () => {
  const src = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  const timer = /setTimeout\(\(\) => setToast\(null\), ([^)]+)\)/.exec(src);
  assert.ok(timer, 'the toast is cleared by a timer');
  assert.equal(timer[1].trim(), 'MOTION.exploreToast');
});
