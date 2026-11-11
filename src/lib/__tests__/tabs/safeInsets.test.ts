/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { insetsFromPaddings, sameInsets } from '../../safeInsets';

test('fix memories-weird-state 1: the web insets are the env() paddings alone, never clamped to the visual viewport', () => {
  // On iOS Safari, window.innerWidth/innerHeight are the visual viewport: a pinch to 2x halves them, and the
  // library's clamp read that as bottom and right insets of half the screen, ballooning the tab bar and
  // squeezing its three tabs into one point until a reload (Memories, Nov 11). The rule takes no viewport.
  assert.equal(insetsFromPaddings.length, 1);
  assert.deepEqual(
    insetsFromPaddings({ paddingTop: '47px', paddingRight: '0px', paddingBottom: '34px', paddingLeft: '0px' }),
    { top: 47, right: 0, bottom: 34, left: 0 },
  );
});

test('fix memories-weird-state 2: a padding the browser leaves empty or unparsed is no inset', () => {
  // A browser without env() leaves the padding empty; a negative or junk value is never an inset.
  assert.deepEqual(
    insetsFromPaddings({ paddingTop: '', paddingRight: 'auto', paddingBottom: '-4px', paddingLeft: '12.5px' }),
    { top: 0, right: 0, bottom: 0, left: 12.5 },
  );
});

test('fix memories-weird-state 3: the same insets are not a change, so a resize with nothing new re-renders nothing', () => {
  const a = { top: 47, right: 0, bottom: 34, left: 0 };
  assert.equal(sameInsets(a, { ...a }), true);
  assert.equal(sameInsets(a, { ...a, bottom: 0 }), false);
});
