/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { holdModal, modalsUp } from '../../tabsHidden';

// Every Modal up holds the count (components/Modal), so the recording bar's reminder waits beneath it (tend explore 22).
// Nothing ran the count before (the review's F3): it must count each Modal once, in any order, and come back to zero,
// or a reminder would wait for ever.
test('tend explore audit 25: modalsUp counts each Modal once, in any order, and never stays above zero', () => {
  assert.equal(modalsUp.get(), 0);
  const viewer = holdModal();
  const menu = holdModal();
  const editor = holdModal();
  assert.equal(modalsUp.get(), 3, 'nested Modals each count');
  menu();
  assert.equal(modalsUp.get(), 2);
  menu();
  assert.equal(modalsUp.get(), 2, 'a release called twice counts once');
  viewer();
  assert.equal(modalsUp.get(), 1, 'released out of the order they opened');
  editor();
  assert.equal(modalsUp.get(), 0);
  editor();
  viewer();
  assert.equal(modalsUp.get(), 0, 'never below zero');
  // StrictMode's mount, unmount and mount again nets one.
  const first = holdModal();
  first();
  const again = holdModal();
  assert.equal(modalsUp.get(), 1);
  again();
  assert.equal(modalsUp.get(), 0);
  // The wiring: every Modal holds the count while it shows, and lets it go as it hides or unmounts.
  const modal = readFileSync(join(__dirname, '..', '..', '..', 'components', 'Modal.tsx'), 'utf8');
  assert.match(modal, /useEffect\(\(\) => \(up \? holdModal\(\) : undefined\), \[up\]\);/);
});
