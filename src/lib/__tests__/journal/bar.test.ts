/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as core from '../../journal/bar';
import type { Where } from '../../journal/bar';

const bar = async () => core;

const REST: Where = { inBar: false, opened: true, rowInView: true, typing: false, failed: false };

test('JN35: at rest with the row in view the controls are in the row, and no bar is drawn', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt(REST), 'line');
});

test('JN35: before the sheet has opened (loading, or a read that failed) the bar holds the camera and the mic', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, opened: false }), 'foot');
});

test('JN35: every input has one answer: the bar or the row, never both, never neither', async () => {
  const { controlsAt } = await bar();
  const flags = ['inBar', 'opened', 'rowInView', 'typing', 'failed'] as const;
  for (let m = 0; m < 1 << flags.length; m++) {
    const w = Object.fromEntries(flags.map((f, i) => [f, !!(m & (1 << i))])) as unknown as Where;
    assert.ok(['foot', 'line'].includes(controlsAt(w)), JSON.stringify(w));
  }
});

test('JN36: while the field has the keyboard the controls are in the bar on it', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, typing: true }), 'foot');
});

test('JN37: pulled back so the row is out of view, the bar holds them', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, rowInView: false }), 'foot');
});

test('JN38: a voice note begun from the row, with the keyboard down, stays in the row', async () => {
  const { controlsAt } = await bar();
  // A recording is not an input: where it shows follows where the controls are.
  assert.equal(controlsAt(REST), 'line');
});

test('JN38: a voice note begun in the keyboard bar stays in the bar when the keyboard goes, so Stop does not move', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, recordingIn: 'foot' }), 'foot');
  // Begun in the row: the row, until the keyboard comes up or the row leaves view.
  assert.equal(controlsAt({ ...REST, recordingIn: 'line' }), 'line');
  assert.equal(controlsAt({ ...REST, recordingIn: 'line', typing: true }), 'foot');
  assert.equal(controlsAt({ ...REST, recordingIn: 'line', rowInView: false }), 'foot');
});

test('JN39: a failed save puts "Not kept yet" and Retry in the bar', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, failed: true }), 'foot');
});

test('JN40: where no page is shown (a thread, the threads, Hidden) the controls are in the bar', async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, inBar: true }), 'foot');
});
