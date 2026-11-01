/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { durationFor, MOTION, PRESS_SCALE } from '../motionTokens';

test('motion M1: one set of timings', () => {
  assert.equal(MOTION.fast, 120);
  assert.equal(MOTION.base, 220);
  assert.equal(MOTION.camera, 600);
  assert.equal(MOTION.lift, 180);
  assert.ok(MOTION.spring.damping > 0 && MOTION.spring.stiffness > 0);
  assert.equal(PRESS_SCALE, 0.97);
});

test('motion M2: reduce motion makes every effect instant', () => {
  for (const k of ['fast', 'base', 'camera', 'lift'] as const) {
    assert.equal(durationFor(k, true), 0);
    assert.equal(durationFor(k, false), MOTION[k]);
  }
});
