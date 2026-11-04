/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IOS_NO_ZOOM_FONT, typingFontSize } from '../captionInput';

// fix editor-zoom: iOS Safari zooms the page when a field under 16 px takes focus.
test('fix editor-zoom: typing never uses a font under the iOS zoom threshold', () => {
  assert.equal(IOS_NO_ZOOM_FONT, 16);
  assert.equal(typingFontSize(12, true), 16);
  assert.equal(typingFontSize(15.9, true), 16);
});

test('fix editor-zoom: a caption already 16 px or larger types at its own size', () => {
  assert.equal(typingFontSize(16, true), 16);
  assert.equal(typingFontSize(22, true), 22);
});

test('fix editor-zoom audit 2: native keeps the fractional caption size while typing', () => {
  assert.equal(typingFontSize(9, false), 9);
  assert.equal(typingFontSize(22, false), 22);
});
