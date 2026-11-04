import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapTopInset } from '../../mapTopInset';

// fix title-chip-corner: Safari reports a status-bar inset although the page starts below its toolbar,
// so the Explore title chip sat a whole inset down from the map's corner instead of in it.
test('title-chip-corner: on web the map has no top inset, so the title chip sits in the corner', () => {
  assert.equal(mapTopInset(54, true), 0);
});

test('title-chip-corner: native keeps the safe-area inset, the map runs under the status bar', () => {
  assert.equal(mapTopInset(54, false), 54);
});
