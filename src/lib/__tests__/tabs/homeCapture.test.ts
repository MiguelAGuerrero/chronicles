/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exitPlan } from '../../readyNav';
import { TABS, tabFor } from '../../startPlan';

// Capture from Chronicle (specs/capture-from-chronicle, decision 0112): the app opens on Chronicle, and
// Memories keeps a moment in one tap. The screen's own checks are in the `capturehome` journey.

test('HC1: Chronicle is the root route, so the app opens there', () => {
  const ch = tabFor('chronicle');
  assert.equal(ch.route, 'index');
  assert.equal(ch.path, '/');
  assert.equal(tabFor('explore').path, '/explore');
  assert.equal(tabFor('explore').route, 'explore');
});

test('HC3: the tabs read Chronicle, Explore, Navigate', () => {
  assert.deepEqual(TABS.map((t) => t.label), ['Chronicle', 'Explore', 'Navigate']);
  assert.deepEqual(TABS.map((t) => t.id), ['chronicle', 'explore', 'navigate']);
});

test('HC4: the walk screen with nothing beneath it goes to Chronicle', () => {
  const plan = exitPlan(false);
  assert.equal(plan.kind, 'replace');
  assert.equal(plan.kind === 'replace' ? plan.to : null, tabFor('chronicle').path);
});

test('HC9: with no walk open, the open line keeps loose moments', async () => {
  const { captureTarget } = await import('../../journal/target');
  assert.deepEqual(captureTarget(null), { loose: true });
});

test('HC10: with a walk open, the open line files into that walk', async () => {
  const { captureTarget } = await import('../../journal/target');
  assert.deepEqual(captureTarget({ id: 'w1' }), { walkId: 'w1' });
});

test('HC15: the moment\'s toast says where it went, in words', async () => {
  const { momentToast } = await import('../../captureBand');
  // On Navigate's ready screen; on Memories the entry itself appears, with no toast (chronicle journal JN8).
  assert.equal(momentToast('text'), 'Note kept here');
  assert.equal(momentToast('photo', 'unavailable'), 'Photo kept · No location');
  assert.equal(momentToast('voice', 'denied'), 'Voice memo kept · No location (location is off)');
});

test('HC7: the recording bar shows no camera on Memories, where the open line files into the walk (decision 0112)', async () => {
  const { barCamera } = await import('../../captureBand');
  assert.equal(barCamera('/', 'memories'), false);
  assert.equal(barCamera('/', 'walks'), true);
  assert.equal(barCamera('/explore', 'memories'), true);
  assert.equal(barCamera('/day/2026-11-09', 'memories'), true);
});

// The audit (Nov 10): regression tests, each written to fail before its fix.

test('capture-from-chronicle audit 1: a walk that arrives after the walk screen mounted still says it is recording', async () => {
  const { arrivalNotice } = await import('../../readyNav');
  assert.equal(arrivalNotice({ started: '1' }), 'Walk started · recording');
  assert.equal(arrivalNotice({ warning: 'Background off', started: '1' }), 'Background off');
  assert.equal(arrivalNotice({}), null);
});

test('capture-from-chronicle audit 6: Stop can wait for a photo or video still being kept, from any capture path', async () => {
  const { createMemoGate } = await import('../../memoGate');
  const gate = createMemoGate();
  let done!: () => void;
  const keeping = new Promise<void>((r) => { done = r; });
  gate.keep(keeping);
  let settled = false;
  const waited = gate.kept().then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false, 'kept() waits while a capture is being kept');
  done();
  await waited;
  assert.equal(settled, true);
  // A keep that fails is waited for too, and never throws out of kept().
  gate.keep(Promise.reject(new Error('disk full')));
  await gate.kept();
});

test('capture-from-chronicle audit 7: until the open walk is known, the open line keeps nothing', async () => {
  const { captureTarget } = await import('../../journal/target');
  assert.deepEqual(captureTarget(null, false), { wait: true });
  assert.deepEqual(captureTarget(null, true), { loose: true });
  assert.deepEqual(captureTarget({ id: 'w1' }, true), { walkId: 'w1' });
});
