import assert from 'node:assert/strict';
import test from 'node:test';
import { BENEATH_TAB, entryPlan, exitPlan, navigatePress, screenState } from '../readyNav';

test('NR1: with no walk open the walk screen is ready; until the read settles it waits', () => {
  assert.equal(screenState({ known: false, walkId: null }), 'loading');
  assert.equal(screenState({ known: true, walkId: null }), 'ready');
  assert.equal(screenState({ known: true, walkId: 'w1' }), 'walking');
});

test('NR2: a Navigate press opens the walk screen, ready or with the walk open, never a tab of its own', () => {
  assert.deepEqual(navigatePress(), { preventTab: true, showWalk: true });
});

test('NR3: launch with no open walk opens the ready screen over Explore', () => {
  // `/` (the Navigate route) moves the tabs beneath to Explore, then opens the walk screen over them.
  assert.equal(BENEATH_TAB, '/explore');
  assert.deepEqual(entryPlan(), { tabs: '/explore', thenShowWalk: true });
});

test('NR4: the chevron and Back return to the last tab, Explore after a launch', () => {
  // A tab beneath: back to it (the tab you came from).
  assert.deepEqual(exitPlan(true), { kind: 'back' });
  // Nothing beneath (a reload of /walk on a bare stack): Explore.
  assert.deepEqual(exitPlan(false), { kind: 'replace', to: '/explore' });
});
