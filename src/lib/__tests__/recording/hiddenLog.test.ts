/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HiddenLog } from '../../hiddenLog';

// The "Tracing paused while this page was hidden" notice is raised only for a gap the page
// really spent out of front (the owner's call, Nov 3, after it showed with the page on screen).

test('hiddenLog: a gap with the page on screen the whole time was not hidden', () => {
  const log = new HiddenLog(0);
  assert.equal(log.hiddenDuring(60_000, 140_000), false);
});

test('hiddenLog: a gap the page spent hidden was hidden', () => {
  const log = new HiddenLog(0);
  log.hide(70_000);
  log.show(130_000);
  assert.equal(log.hiddenDuring(65_000, 135_000), true);
});

test('hiddenLog: a hidden spell before or after the gap does not count', () => {
  const log = new HiddenLog(0);
  log.hide(10_000);
  log.show(20_000);
  log.hide(200_000);
  log.show(210_000);
  assert.equal(log.hiddenDuring(60_000, 140_000), false);
});

test('hiddenLog: a gap that began before this page loaded was hidden (closed or reloaded)', () => {
  const log = new HiddenLog(100_000);
  assert.equal(log.hiddenDuring(60_000, 140_000), true);
  assert.equal(log.hiddenDuring(120_000, 200_000), false);
});

test('hiddenLog: a spell still open counts from when it began', () => {
  const log = new HiddenLog(0);
  log.hide(100_000);
  assert.equal(log.hiddenDuring(60_000, 140_000), true);
  assert.equal(log.hiddenDuring(20_000, 90_000), false);
});

test('hiddenLog: repeated hides or shows keep the first', () => {
  const log = new HiddenLog(0);
  log.hide(70_000);
  log.hide(90_000);
  log.show(100_000);
  log.show(500_000);
  assert.equal(log.hiddenDuring(65_000, 80_000), true);
  assert.equal(log.hiddenDuring(150_000, 400_000), false);
});

test('hiddenLog: keeps only recent spells', () => {
  const log = new HiddenLog(0);
  for (let i = 0; i < 100; i++) {
    log.hide(i * 1000);
    log.show(i * 1000 + 500);
  }
  assert.ok(log.spellCount() <= 20);
  assert.equal(log.hiddenDuring(99_000, 99_800), true);
});
