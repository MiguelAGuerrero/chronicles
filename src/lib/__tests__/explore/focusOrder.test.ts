/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { returnTarget, trapStep } from '../../atlas/focusOrder';

// WCAG 2.2, 2.4.3 Focus Order; Material's dialogs: on close "focus returns to the interactive element that initiated the
// action" (docs/research/ui-references.md, X5), as react-native-web's Modal and the HTML dialog element do.
test('tend explore 27: a surface gives focus back to what opened it while that is still there, else to its fallback, else nowhere', () => {
  assert.equal(returnTarget('there', true), 'opener');
  assert.equal(returnTarget('there', false), 'opener');
  // The Walk to button the question replaced is gone: the one drawn in its place takes focus.
  assert.equal(returnTarget('gone', true), 'fallback');
  // Nothing had focus (the page itself) as it opened.
  assert.equal(returnTarget('none', true), 'fallback');
  assert.equal(returnTarget('gone', false), null);
  assert.equal(returnTarget('none', false), null);
});

// WCAG 2.2, 2.4.3 Focus Order and 2.4.11 Focus Not Obscured: a full-screen surface keeps Tab inside it, as a modal dialog does.
test('tend explore 27: Tab and Shift+Tab step through a trap and wrap at either end, so focus never leaves it', () => {
  // On a stop: the next, or the previous; past the last, the first; before the first, the last.
  assert.equal(trapStep({ on: 0 }, 4, false), 1);
  assert.equal(trapStep({ on: 2 }, 4, true), 1);
  assert.equal(trapStep({ on: 3 }, 4, false), 0);
  assert.equal(trapStep({ on: 0 }, 4, true), 3);
  // On something inside that Tab does not stop at (the card's name, focused as it opens): the stops either side of it.
  assert.equal(trapStep({ before: 2 }, 4, false), 2);
  assert.equal(trapStep({ before: 2 }, 4, true), 1);
  assert.equal(trapStep({ before: 0 }, 4, true), 3);
  assert.equal(trapStep({ before: 4 }, 4, false), 0);
  // Outside it (focus left behind on the page): the first stop, or the last going back.
  assert.equal(trapStep('outside', 4, false), 0);
  assert.equal(trapStep('outside', 4, true), 3);
  // One stop holds focus; none leaves Tab to the browser.
  assert.equal(trapStep({ on: 0 }, 1, false), 0);
  assert.equal(trapStep({ on: 0 }, 1, true), 0);
  assert.equal(trapStep('outside', 0, false), null);
});
