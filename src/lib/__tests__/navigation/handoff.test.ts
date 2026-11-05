/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapsTarget, mapsUrls } from '../../nav/handoff';
import type { LngLat } from '../../types';

// Bridges and Open in Maps (the concept doc's tab, NH1-NH2), written before the code.

const DEST: LngLat = [-75.3784566, 40.6195123];
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

test('handoff: the system’s maps app for each platform (NH2)', () => {
  assert.equal(mapsTarget({ os: 'ios' }), 'apple');
  assert.equal(mapsTarget({ os: 'android' }), 'geo');
  assert.equal(mapsTarget({ os: 'web', ua: IPHONE, touchPoints: 5 }), 'apple', 'an iPhone browser or Home Screen app');
  assert.equal(mapsTarget({ os: 'web', ua: IPAD_AS_MAC, touchPoints: 5 }), 'apple', 'an iPad asking for the desktop site');
  assert.equal(mapsTarget({ os: 'web', ua: IPAD_AS_MAC, touchPoints: 0 }), 'google', 'a Mac');
  assert.equal(mapsTarget({ os: 'web', ua: ANDROID_CHROME, touchPoints: 5 }), 'google', 'Android hands Google’s link to its app');
  assert.equal(mapsTarget({ os: 'web', ua: DESKTOP, touchPoints: 0 }), 'google');
  assert.equal(mapsTarget({ os: 'web' }), 'google', 'nothing known');
});

test('handoff: walking directions to the destination, six decimals, nothing else (NH1)', () => {
  assert.deepEqual(mapsUrls(DEST, 'Your spot', 'apple'), ['https://maps.apple.com/?daddr=40.619512,-75.378457&dirflg=w']);
  assert.deepEqual(mapsUrls(DEST, 'Your spot', 'google'), ['https://www.google.com/maps/dir/?api=1&destination=40.619512,-75.378457&travelmode=walking']);
  // Android's chooser first, Google's link when no app takes it.
  assert.deepEqual(mapsUrls(DEST, 'Hessian Memorial (1)', 'geo'), [
    'geo:40.619512,-75.378457?q=40.619512,-75.378457(Hessian%20Memorial%20%5B1%5D)',
    'https://www.google.com/maps/dir/?api=1&destination=40.619512,-75.378457&travelmode=walking',
  ]);
});

test('handoff: an iPhone Home Screen app opens the maps: scheme, not a window (fix pwa-maps)', () => {
  assert.equal(mapsTarget({ os: 'web', ua: IPHONE, touchPoints: 5, standalone: true }), 'appleApp');
  assert.equal(mapsTarget({ os: 'web', ua: IPAD_AS_MAC, touchPoints: 5, standalone: true }), 'appleApp');
  assert.equal(mapsTarget({ os: 'web', ua: IPHONE, touchPoints: 5, standalone: false }), 'apple', 'a Safari tab');
  assert.equal(mapsTarget({ os: 'web', ua: DESKTOP, touchPoints: 0, standalone: true }), 'google');
  assert.deepEqual(mapsUrls(DEST, 'Your spot', 'appleApp'), ['maps://?daddr=40.619512,-75.378457&dirflg=w']);
});
