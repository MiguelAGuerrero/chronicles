/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { coverViewport, insetsFromPaddings, sameInsets } from '../../safeInsets';

test('fix memories-weird-state 1: the web insets are read from the env() paddings alone', () => {
  // The rule takes no viewport: on iOS Safari, window.innerWidth/innerHeight are the visual viewport, halved under
  // a 2x pinch, and the library's clamp read that as insets of half the screen (Memories, Nov 11). That the app
  // reads these insets, and not the library's, only the tabs journey's "fix memories-weird-state" step can show.
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

test('fix memories-weird-state audit 3: a change to lib/safeInsets names the tabs journey, which replays the pinch', () => {
  const ROOT = join(__dirname, '..', '..', '..', '..');
  const { e2eFor } = createRequire(__filename)(join(ROOT, 'scripts', 'affected.js')) as { e2eFor(changed: string[]): { scenarios: { name: string }[] } };
  for (const file of ['src/lib/safeInsets.ts', 'src/components/SafeInsets.web.tsx']) {
    assert.ok(e2eFor([file]).scenarios.some((s) => s.name === 'tabs'), `${file} names the tabs journey`);
  }
});

test('fix home-indicator 1: the viewport covers the whole screen, so iOS reports the home-indicator inset', () => {
  // Without viewport-fit=cover, env(safe-area-inset-bottom) is 0 and every bottom bar sat in the home-indicator strip
  // of the owner's Home Screen app (Nov 12). The fit is added to what the page has, never replacing its width or scale.
  assert.equal(coverViewport('width=device-width, initial-scale=1, shrink-to-fit=no'), 'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover');
  assert.equal(coverViewport(null), 'width=device-width, initial-scale=1, viewport-fit=cover');
  assert.equal(coverViewport('width=device-width, viewport-fit=auto'), 'width=device-width, viewport-fit=cover');
  assert.equal(coverViewport('width=device-width,viewport-fit=cover'), 'width=device-width, viewport-fit=cover');
});
