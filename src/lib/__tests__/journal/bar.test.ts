/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// The module is reached by name: this file runs before it exists (test first).
type At = 'bar' | 'row';
type Where = { inBar: boolean; opened: boolean; rowInView: boolean; typing: boolean; failed: boolean };
const bar = () => import('../../journal/bar' as string) as Promise<{ controlsAt: (w: Where) => At }>;

const REST: Where = { inBar: false, opened: true, rowInView: true, typing: false, failed: false };

test('JN35: at rest with the row in view the controls are in the row, and no bar is drawn', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt(REST), 'row');
});

test('JN35: before the sheet has opened (loading, or a read that failed) the bar holds the camera and the mic', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, opened: false }), 'bar');
});

test('JN35: every input has one answer: the bar or the row, never both, never neither', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  const flags = ['inBar', 'opened', 'rowInView', 'typing', 'failed'] as const;
  for (let m = 0; m < 1 << flags.length; m++) {
    const w = Object.fromEntries(flags.map((f, i) => [f, !!(m & (1 << i))])) as Where;
    assert.ok(['bar', 'row'].includes(controlsAt(w)), JSON.stringify(w));
  }
});

test('JN36: while the field has the keyboard the controls are in the bar on it', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, typing: true }), 'bar');
});

test('JN37: pulled back so the row is out of view, the bar holds them', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, rowInView: false }), 'bar');
});

test('JN38: a voice note begun from the row, with the keyboard down, stays in the row', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  // A recording is not an input: where it shows follows where the controls are.
  assert.equal(controlsAt(REST), 'row');
});

test('JN39: a failed save puts "Not kept yet" and Retry in the bar', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, failed: true }), 'bar');
});

test('JN40: where no page is shown (a thread, the threads, Hidden) the controls are in the bar', { todo: 'test first' }, async () => {
  const { controlsAt } = await bar();
  assert.equal(controlsAt({ ...REST, inBar: true }), 'bar');
});
