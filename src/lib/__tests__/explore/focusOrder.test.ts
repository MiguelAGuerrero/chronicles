/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { returnTarget, trapStep } from '../../atlas/focusOrder';

// WCAG 2.2, 2.4.3 Focus Order; Material's dialogs: on close "focus returns to the interactive element that initiated the
// action" (docs/research/ui-references.md, X5), as react-native-web's Modal and the HTML dialog element do.
test('tend explore 27: a surface gives focus back to the first of its candidates still there, the opener before a fallback', () => {
  assert.equal(returnTarget('page', [true, true]), 0);
  assert.equal(returnTarget('page', [true]), 0);
  // The Walk to button the question replaced is gone: the one drawn in its place takes focus.
  assert.equal(returnTarget('page', [false, true]), 1);
  assert.equal(returnTarget('page', [false, false]), null);
  assert.equal(returnTarget('page', []), null);
});

// The HTML dialog element and the WAI-ARIA dialog pattern give focus back only when it was in the dialog that closed.
test('tend explore audit 37: nothing is given back when focus has moved elsewhere (another tile chosen as the card closed)', () => {
  assert.equal(returnTarget('elsewhere', [true, true]), null);
  assert.equal(returnTarget('elsewhere', [false, true]), null);
});

// WCAG 2.2, 2.4.3 Focus Order and 2.4.11 Focus Not Obscured: a full-screen surface keeps Tab inside it, as a modal dialog does.
test('tend explore 27: Tab and Shift+Tab wrap at either end of a trap, so focus never leaves it', () => {
  // Past the last stop, the first; before the first, the last.
  assert.equal(trapStep({ on: 3 }, 4, false), 0);
  assert.equal(trapStep({ on: 0 }, 4, true), 3);
  // On something inside that Tab does not stop at (the card's name, focused as it opens), with no stop beyond it.
  assert.equal(trapStep({ before: 0 }, 4, true), 3);
  assert.equal(trapStep({ before: 4 }, 4, false), 0);
  // Outside it (focus left behind under it): the first stop, or the last going back.
  assert.equal(trapStep('outside', 4, false), 0);
  assert.equal(trapStep('outside', 4, true), 3);
  // One stop holds focus; none leaves Tab to the browser.
  assert.equal(trapStep({ on: 0 }, 1, false), 0);
  assert.equal(trapStep({ on: 0 }, 1, true), 0);
  assert.equal(trapStep('outside', 0, false), null);
});

// WCAG 2.2, 2.1.1 Keyboard: between the ends the browser's own order holds, every stop it has (a <summary> too).
test('tend explore audit 38: between the two ends a trap leaves Tab to the browser', () => {
  assert.equal(trapStep({ on: 0 }, 4, false), null);
  assert.equal(trapStep({ on: 2 }, 4, true), null);
  assert.equal(trapStep({ before: 2 }, 4, false), null);
  assert.equal(trapStep({ before: 2 }, 4, true), null);
});

// WCAG 2.2, 2.4.3: after a click on text, the browser goes on from the click (its sequential focus navigation starting point).
test('tend explore audit 39: with focus on the page, Tab is the browser\'s; a stray outside is caught after it moves', () => {
  assert.equal(trapStep('page', 4, false), null);
  assert.equal(trapStep('page', 4, true), null);
});

// The WAI-ARIA dialog pattern and react-native-web's Modal trap only for the topmost dialog.
test('tend explore audit 36: a trap stands aside while focus is in a modal above it (the note page over the planner)', () => {
  assert.equal(trapStep('above', 4, false), null);
  assert.equal(trapStep('above', 4, true), null);
});
