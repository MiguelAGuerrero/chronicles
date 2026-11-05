import assert from 'node:assert/strict';
import test from 'node:test';
import { createWalkGate } from '../../walkGate';
import { exitPlan, screenState, startNotice } from '../../readyNav';

test('NR1: with no walk open the walk screen is ready; until the read settles it waits', () => {
  assert.equal(screenState({ known: false, walkId: null }), 'loading');
  assert.equal(screenState({ known: true, walkId: null }), 'ready');
  assert.equal(screenState({ known: true, walkId: 'w1' }), 'walking');
});

test('NR4: the chevron and Back return to the tab beneath, Explore when there is none', () => {
  // A tab beneath: back to it (the tab you came from).
  assert.deepEqual(exitPlan(true), { kind: 'back' });
  // Nothing beneath (a reload of /walk on a bare stack): Explore, at `/`.
  assert.deepEqual(exitPlan(false), { kind: 'replace', to: '/' });
});

test('navigate-ready audit 9: an in-place start says it is recording; the web page note is said once on first launch, not per walk', () => {
  assert.equal(startNotice({ started: '1' }), 'Walk started · recording');
  assert.equal(startNotice({}), 'Walk started · recording');
  // A recorder warning still wins (NV25).
  assert.equal(startNotice({ warning: 'Location is approximate.' }), 'Location is approximate.');
});

test('navigate-ready cold open: a launch’s own ask goes ahead past an earlier one still pending, never past a walk screen up', () => {
  const gate = createWalkGate(2000);
  // A tapped notification asked before the router was ready: its push was lost, but it counts as on its way.
  assert.equal(gate.ask(0), true);
  assert.equal(gate.ask(10), false);
  // The launch (the entry route, the root layout) still opens the walk screen.
  assert.equal(gate.ask(20, { launch: true }), true);
  // The launch asks once: the entry route and the root layout never push two.
  assert.equal(gate.ask(25, { launch: true }), false);
  // Once it is up, nothing pushes a second one.
  const gone = gate.shown();
  assert.equal(gate.ask(30, { launch: true }), false);
  gone();
});
