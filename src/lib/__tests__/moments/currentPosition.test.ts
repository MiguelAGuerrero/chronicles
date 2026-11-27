/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// Where you are, now (specs/current-position, G17; decisions 0273, 0275): Explore reads one fresh fix each time it comes to
// the front (its tab's focus, the app's return), by itself only while location is allowed; it says location off quietly,
// draws no dot and says no walk time without a fix, ages the fix it holds, and reframes only when your town changed.
// Navigate's ready map reads on the app's return too. The decisions are core (`locate/front.ts`), built on the outing
// pages' `pagePosition`.
const mod = () => import('../../locate/front');
const FOX: LngLat = [-71.39, 41.82];
const CRANSTON: LngLat = [-71.44, 41.78];
// About 30 m and 300 m east of Fox Point.
const FOX_30M: LngLat = [-71.38964, 41.82];
const FOX_300M: LngLat = [-71.3864, 41.82];
const NOW = 1_800_000_000_000;
const MIN = 60_000;
const here = (at: LngLat, t = NOW - MIN) => ({ state: 'here' as const, at, t });
const none = { state: 'none' as const, refused: false };

test('YH1: a fresh fix 4 km on is where Explore lists from, a first fix after none frames, one within 100 m keeps the point', async () => {
  const { exploreRead } = await mod();
  const moved = exploreRead(here(FOX), { at: CRANSTON }, null, NOW);
  assert.deepEqual(moved.pos, { state: 'here', at: CRANSTON, t: NOW });
  assert.equal(moved.moved, true);
  assert.equal(moved.first, false);
  // No position before (a reload, a refusal, or a fix aged out): the first fix frames, as the launch's read did.
  const first = exploreRead(none, { at: FOX }, null, NOW);
  assert.equal(first.first, true);
  assert.deepEqual(first.pos, { state: 'here', at: FOX, t: NOW });
  // Within PAGE_MOVE_M the page keeps its point: nothing re-lists or moves.
  const still = exploreRead(here(FOX), { at: FOX_30M }, null, NOW);
  assert.equal(still.moved, false);
  assert.equal(still.pos.state === 'here' && still.pos.at, FOX);
});

test('YH1: a read 300 m on within the same town keeps the pick and the frame', async () => {
  const { exploreRead, reframes } = await mod();
  const r = exploreRead(here(FOX), { at: FOX_300M }, null, NOW);
  assert.equal(r.moved, true, 'the dot moves');
  assert.equal(reframes({ first: r.first, before: 'town:providence', after: 'town:providence' }), false, 'the same town: the pick and the frame stay');
  assert.equal(reframes({ first: false, before: 'town:providence', after: 'town:cranston' }), true, 'another town: framed, your own town selected');
  assert.equal(reframes({ first: false, before: 'town:providence', after: null }), false, 'the town you stand in not listed yet: nothing yet');
  assert.equal(reframes({ first: true, before: 'town:providence', after: 'town:providence' }), true, 'a first fix frames, as the launch did');
});

test('YH1: permission "prompt", three fronts raise one request', async () => {
  const { frontRead } = await mod();
  const { createLaunchFix } = await import('../../lastFix');
  const launch = createLaunchFix();
  let requests = 0;
  for (let front = 0; front < 3; front++) if (frontRead('prompt') === 'ask' && launch.take(false)) requests++;
  assert.equal(requests, 1, 'one ask per launch; Find me and Locate ask after');
  assert.equal(frontRead('unknown'), 'ask');
  assert.equal(frontRead(null), 'ask', 'the permission not read yet: the launch\'s one ask');
  assert.equal(frontRead('granted'), 'read', 'allowed: a read at every front, which raises no prompt');
  assert.equal(frontRead('denied'), 'off', 'blocked: no read, the notice');
});

test('YH2: the app is back at the front only after it was in the back, never after a passing inactive', async () => {
  const { appReturn } = await mod();
  const run = (states: string[]) => {
    let away = false;
    let backs = 0;
    for (const s of states) {
      const r = appReturn(away, s);
      away = r.away;
      if (r.back) backs++;
    }
    return backs;
  };
  assert.equal(run(['inactive', 'background', 'active']), 1, 'home and back (iOS goes through inactive)');
  assert.equal(run(['background', 'active']), 1, 'the web: hidden, then visible');
  assert.equal(run(['inactive', 'active']), 0, 'a permission alert or Control Center: no read');
  assert.equal(run(['active', 'active']), 0, 'no change: no read');
  assert.equal(run(['background', 'active', 'active']), 1, 'once per return');
  assert.equal(run(['background', 'active', 'background', 'active']), 2);
});

test('YH4: refused, Explore says LOCATION_OFF quietly, Open Settings on a phone; a timeout says nothing; a fix clears it', async () => {
  const { exploreRead, exploreNotice } = await mod();
  const { LOCATION_OFF } = await import('../../locate/notice');
  const refused = exploreRead(here(FOX), { at: null, reason: 'denied' }, { at: FOX, t: NOW - MIN }, NOW);
  assert.deepEqual(refused.pos, { state: 'none', refused: true }, 'refused: no held fix stands in');
  assert.deepEqual(exploreNotice(refused.pos, 'web'), { kind: 'off', error: { message: LOCATION_OFF.web, tone: 'info', refused: true } });
  assert.deepEqual(exploreNotice(refused.pos, 'native'), { kind: 'off', error: { message: LOCATION_OFF.native, openSettings: true, tone: 'info', refused: true } });
  const timedOut = exploreRead(here(FOX, NOW - 40 * MIN), { at: null, reason: 'timeout' }, null, NOW);
  assert.deepEqual(exploreNotice(timedOut.pos, 'web'), { kind: 'clear' }, 'O21: a timeout is quiet');
  assert.deepEqual(exploreNotice(exploreRead(none, { at: FOX }, null, NOW).pos, 'web'), { kind: 'clear' });
});

test('YH5: refused, no area says a walk time or distance', async () => {
  const { exploreRead, exploreSeen } = await mod();
  const refused = exploreRead(here(FOX), { at: null, reason: 'denied' }, null, NOW);
  assert.deepEqual(exploreSeen(refused.pos), { dot: null, here: false, distances: false });
  assert.equal(refused.moved, false, 'the areas stay where they were listed (AT1)');
  const nothing = exploreRead(none, { at: null, reason: 'timeout' }, null, NOW);
  assert.deepEqual(exploreSeen(nothing.pos), { dot: null, here: false, distances: false }, 'no fix and none held: no position');
  assert.deepEqual(exploreSeen(here(FOX)), { dot: 'full', here: true, distances: true });
});

test('YH6: no fresh fix in time, one twenty minutes old stands in, muted and said; thirty-one minutes is no position', async () => {
  const { exploreRead, exploreNotice, exploreSeen } = await mod();
  const r = exploreRead(here(FOX, NOW - 20 * MIN), { at: null, reason: 'timeout' }, { at: FOX, t: NOW - 20 * MIN }, NOW);
  assert.equal(r.pos.state, 'earlier');
  assert.deepEqual(exploreSeen(r.pos), { dot: 'muted', here: false, distances: true });
  assert.deepEqual(exploreNotice(r.pos, 'web'), { kind: 'earlier', message: 'From where you were twenty minutes ago.' });
  const old = exploreRead(here(FOX, NOW - 31 * MIN), { at: null, reason: 'timeout' }, { at: FOX, t: NOW - 31 * MIN }, NOW);
  assert.deepEqual(exploreSeen(old.pos), { dot: null, here: false, distances: false });
});

test('YH6: Explore in front 31 minutes after its read: no "You\'re here", no full dot, no read', async () => {
  const { exploreAged, exploreSeen, exploreNotice, POSITION_AGE_TICK_MS } = await mod();
  const read = here(FOX, NOW);
  assert.equal(exploreAged(read, NOW + 10 * MIN), read, 'within thirty minutes nothing changes, nothing re-renders');
  const gone = exploreAged(read, NOW + 31 * MIN);
  assert.deepEqual(exploreSeen(gone), { dot: null, here: false, distances: false });
  assert.deepEqual(exploreNotice(gone, 'web'), { kind: 'clear' }, 'no new words, and nothing about location being off');
  // A stand-in's line counts on as it ages.
  const earlier = { state: 'earlier' as const, at: FOX, t: NOW - 20 * MIN, agoMs: 20 * MIN };
  const later = exploreAged(earlier, NOW + 5 * MIN);
  assert.deepEqual(exploreNotice(later, 'web'), { kind: 'earlier', message: 'From where you were twenty-five minutes ago.' });
  // The timer ages; it never reads (the tick is a constant of the locate core, not a hard-coded duration).
  assert.equal(typeof POSITION_AGE_TICK_MS, 'number');
  assert.ok(POSITION_AGE_TICK_MS > 0 && POSITION_AGE_TICK_MS <= MIN);
});
