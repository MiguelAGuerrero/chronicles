/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyboardInset } from '../../threads/keyboardInset';

// An iPhone-sized page: 844 px of layout viewport.
const L = 844;

test('fix note-keyboard-zoom 1: unzoomed, the keyboard is what the visual viewport leaves at the layout viewport\'s foot, as before', () => {
  // fix respond-bottom audit 3's reading, unchanged: innerHeight - visual height - its offset.
  assert.equal(keyboardInset({ innerHeight: L, layoutHeight: L, vvHeight: L - 300, vvOffsetTop: 0, scale: 1 }), 300);
  assert.equal(keyboardInset({ innerHeight: L, layoutHeight: L, vvHeight: L - 300, vvOffsetTop: 40, scale: 1 }), 260);
  assert.equal(keyboardInset({ innerHeight: L, layoutHeight: L, vvHeight: L, vvOffsetTop: 0, scale: 1 }), 0);
});

test('fix note-keyboard-zoom 2: pinch-zoomed with the keyboard up, the note rises to the bottom of what is on screen', () => {
  // iOS Safari reports innerHeight as the visual viewport under a pinch, so the old reading was 0 and the field sat
  // under the keyboard. At 2x with a 300 px keyboard, the zoomed view is (844 - 300) / 2 CSS px tall; panned 100 px
  // down the page, what is on screen ends at 100 + 272, so the note's foot goes there: 844 - 372 = 472 px up.
  const vvHeight = (L - 300) / 2;
  assert.equal(keyboardInset({ innerHeight: vvHeight, layoutHeight: L, vvHeight, vvOffsetTop: 100, scale: 2 }), 472);
  // Panned to the page's foot, the page's foot is on screen above the keyboard: nothing to rise by.
  assert.equal(keyboardInset({ innerHeight: vvHeight, layoutHeight: L, vvHeight, vvOffsetTop: L - vvHeight, scale: 2 }), 0);
});

test('fix note-keyboard-zoom 3: pinch-zoomed with no keyboard, the page below the zoomed view is not a keyboard', () => {
  // Measured against the layout viewport alone, a 2x zoom panned to the top would read 422 px of "keyboard".
  assert.equal(keyboardInset({ innerHeight: L / 2, layoutHeight: L, vvHeight: L / 2, vvOffsetTop: 0, scale: 2 }), 0);
  // Safari's toolbars moving (under 150 px of screen) are not a keyboard either.
  assert.equal(keyboardInset({ innerHeight: 380, layoutHeight: L, vvHeight: 380, vvOffsetTop: 0, scale: 2 }), 0);
});
