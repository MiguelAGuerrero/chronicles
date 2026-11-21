/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// The audit of ready-map-places (Nov 21, the spec's "Audit"): each accepted finding's regression test, written before its fix.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

type Core = {
  afterRead?: (o: { fix: LngLat; here: LngLat | null }) => { loadAt: LngLat; again: boolean };
  nextReadState?: (prev: 'reading' | 'failed' | null, event: 'start' | 'ok' | 'failed' | 'stopped' | 'known' | 'gone') => 'reading' | 'failed' | null;
  foundSaid?: (o: { placesOn: boolean; key: string; only: string | null }) => boolean;
  readyCardMaps?: (o: { named: boolean; found: boolean }) => boolean;
};
const core = async () => (await import('../../explore/explore')) as unknown as Core;

const O: LngLat = [-77.4336, 37.5387];
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];

test('ready-map-places audit 1: a read finishing at an old fix loads the items at the current one, and checks again there', { todo: 'test first' }, async () => {
  const m = await core();
  assert.ok(m.afterRead, 'afterRead exists');
  // A read begun at a stale fix 3 km off ends after the real fix came: the items are loaded where you are, and the place
  // you are is checked again (its own check was skipped while the read ran).
  assert.deepEqual(m.afterRead({ fix: east(3000), here: O }), { loadAt: O, again: true });
  // Where you are is where it read: nothing more.
  assert.deepEqual(m.afterRead({ fix: O, here: east(10) }), { loadAt: east(10), again: false });
  assert.deepEqual(m.afterRead({ fix: O, here: null }), { loadAt: O, again: false });
});

test('ready-map-places audit 2: the read state is cleared when the read is cut off, and when places are there with no read needed', { todo: 'test first' }, async () => {
  const m = await core();
  assert.ok(m.nextReadState, 'nextReadState exists');
  assert.equal(m.nextReadState(null, 'start'), 'reading');
  assert.equal(m.nextReadState('reading', 'ok'), null);
  assert.equal(m.nextReadState('reading', 'failed'), 'failed');
  // A read stopped by its caller, or the hook gone mid-read, leaves no "Reading…".
  assert.equal(m.nextReadState('reading', 'stopped'), null);
  assert.equal(m.nextReadState('reading', 'gone'), null);
  // An area already read for this build: nothing is reading and nothing failed here.
  assert.equal(m.nextReadState('failed', 'known'), null);
  // The hook clears it on unmount, and says "known" when a check needs no read.
  const hook = src('src/lib/explore/useExplore.ts');
  assert.match(hook, /nextReadState\([^)]*'gone'\)/, 'the hook says gone as it unmounts');
  assert.match(hook, /nextReadState\([^)]*'known'\)/, 'the hook says known when no read is needed');
});

test('ready-map-places audit 3: a find of the walked-to place with Places off is said', { todo: 'test first' }, async () => {
  const m = await core();
  assert.ok(m.foundSaid, 'foundSaid exists');
  assert.equal(m.foundSaid({ placesOn: false, key: 'mansion', only: 'mansion' }), true);
  assert.equal(m.foundSaid({ placesOn: true, key: 'statue', only: null }), true);
  assert.equal(m.foundSaid({ placesOn: false, key: 'statue', only: 'mansion' }), false);
  assert.match(src('src/app/walk.tsx'), /if \(!foundSaid\(\{ placesOn, key: item\.key, only: surface\.only \}\)\) return;/);
});

test('ready-map-places audit 7: the walk\'s Places row says reading or not available, as the ready one does', { todo: 'test first' }, () => {
  const w = src('src/app/walk.tsx');
  const call = w.slice(w.indexOf('<LayersControl'), w.indexOf('<LayersControl') + 600);
  assert.match(call, /placesRead: placesOn \? placesRead : null/);
});

test('ready-map-places audit 10: the ready bar reads "To a place to find", the label kept as it is elsewhere', { todo: 'test first' }, async () => {
  const m = (await import('../../startPlan')) as unknown as { toDestLine?: (d: { at: LngLat; label: string; kind: string }, from: LngLat | null) => string };
  assert.ok(m.toDestLine, 'toDestLine exists');
  assert.equal(m.toDestLine({ at: O, label: 'A place to find', kind: 'find' }, null), 'To a place to find');
  assert.match(m.toDestLine({ at: east(110), label: 'A place to find', kind: 'find' }, O), /^To a place to find · 110[  ]m away$/);
  // A named place, or a spot of your own, keeps its words.
  assert.equal(m.toDestLine({ at: O, label: 'Old City Hall', kind: 'find' }, null), 'To Old City Hall');
  assert.equal(m.toDestLine({ at: O, label: 'Your spot', kind: 'point' }, null), 'To Your spot');
  assert.match(src('src/components/walk/useReady.tsx'), /toDestLine\(dest, fix, units\)/);
});

test('ready-map-places audit 11: Open in Maps waits until the place is named or found', { todo: 'test first' }, async () => {
  const m = await core();
  assert.ok(m.readyCardMaps, 'readyCardMaps exists');
  assert.equal(m.readyCardMaps({ named: false, found: false }), false);
  assert.equal(m.readyCardMaps({ named: true, found: false }), true);
  assert.equal(m.readyCardMaps({ named: false, found: true }), true);
});
