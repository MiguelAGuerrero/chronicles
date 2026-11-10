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

test('HC9: with no walk open, the band keeps loose moments', async () => {
  const { captureTarget } = await import('../../captureBand');
  assert.deepEqual(captureTarget(null), { loose: true });
});

test('HC10: with a walk open, the band files into that walk', async () => {
  const { captureTarget } = await import('../../captureBand');
  assert.deepEqual(captureTarget({ id: 'w1' }), { walkId: 'w1' });
});

test('HC7: the band is three equal buttons inside the 640 column, at least a thumb tall', async () => {
  const { bandLayout } = await import('../../captureBand');
  const phone = bandLayout(390);
  assert.equal(phone.buttons.length, 3);
  assert.ok(phone.height >= 44);
  const w = phone.buttons[0].width;
  for (const b of phone.buttons) assert.equal(b.width, w);
  assert.ok(phone.buttons[2].left + w <= 390 - 16 + 0.5, 'the last button keeps the gutter');
  assert.equal(phone.buttons[0].left, 16);
  // A wide screen keeps the band inside the 640 column, centred.
  const wide = bandLayout(1200);
  assert.equal(wide.buttons[0].left, (1200 - 640) / 2 + 16);
  assert.ok(wide.buttons[2].left + wide.buttons[2].width <= (1200 + 640) / 2 - 16 + 0.5);
  // Every button is at least a thumb wide, even on a narrow phone.
  for (const b of bandLayout(320).buttons) assert.ok(b.width >= 44);
});

test('HC8: the band names its buttons for a screen reader, for the walk when one is open', async () => {
  const { bandLabels } = await import('../../captureBand');
  assert.deepEqual(bandLabels(false), {
    photo: 'Keep a moment: take a photo or video',
    voice: 'Keep a moment: record a voice memo',
    note: 'Keep a moment: write a note',
  });
  assert.deepEqual(bandLabels(true), {
    photo: 'Add to your walk: take a photo or video',
    voice: 'Add to your walk: record a voice memo',
    note: 'Add to your walk: write a note',
  });
});

test('HC15: the moment\'s toast says where it went, in words', async () => {
  const { momentToast } = await import('../../captureBand');
  assert.equal(momentToast('text', 'loose'), 'Note kept here');
  assert.equal(momentToast('photo', 'loose', 'unavailable'), 'Photo kept · No location');
  assert.equal(momentToast('voice', 'loose', 'denied'), 'Voice memo kept · No location (location is off)');
  assert.equal(momentToast('text', 'walk'), 'Note saved to your walk');
  assert.equal(momentToast('video', 'walk'), 'Video saved to your walk');
});

test('HC7: the recording bar shows no camera on Memories, where the band files into the walk (decision 0112)', async () => {
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

test('capture-from-chronicle audit 7: until the open walk is known, the band keeps nothing', async () => {
  const { captureTarget } = await import('../../captureBand');
  assert.deepEqual(captureTarget(null, false), { wait: true });
  assert.deepEqual(captureTarget(null, true), { loose: true });
  assert.deepEqual(captureTarget({ id: 'w1' }, true), { walkId: 'w1' });
});
