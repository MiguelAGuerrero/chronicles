/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// The diff review of current-position (G17; decisions 0273, 0275): the auditor's, the ux-reviewer's and the steward's
// accepted findings, each a regression test before its fix, with the owner's answers of Nov 27 ("After 5 minutes", "No ✕ on
// that line", "Around <town>", "Quiet, old fix ages").
const SRC = join(__dirname, '..', '..', '..');
const mod = () => import('../../locate/front');
const FOX: LngLat = [-71.39, 41.82];
const NOW = 1_800_000_000_000;
const MIN = 60_000;
const here = (at: LngLat, t = NOW) => ({ state: 'here' as const, at, t });
const none = { state: 'none' as const, refused: false };

/** A browser whose location permission reads `state`, counting the watches the read starts. */
function fakeBrowser(state: 'granted' | 'prompt' | 'denied') {
  let watches = 0;
  const nav = {
    geolocation: {
      watchPosition: (ok: (p: unknown) => void) => {
        watches++;
        setTimeout(() => ok({ coords: { longitude: FOX[0], latitude: FOX[1], accuracy: 5 }, timestamp: Date.now() }), 5);
        return watches;
      },
      clearWatch: () => {},
    },
    permissions: { query: async () => ({ state, onchange: null }) },
  };
  const was = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
  return { watches: () => watches, restore: () => (was ? Object.defineProperty(globalThis, 'navigator', was) : undefined) };
}

test('current-position audit 1: a return read never asks for permission; undecided or blocked, it starts no watch', async () => {
  const { locateOnce } = await import('../../locate/index.web');
  for (const [state, reason] of [['prompt', 'unavailable'], ['denied', 'denied']] as const) {
    const b = fakeBrowser(state);
    try {
      const r = await locateOnce(1000, { fresh: true, ask: false });
      assert.deepEqual(r, { at: null, reason }, `${state}: answered without asking`);
      assert.equal(b.watches(), 0, `${state}: no watch, so no prompt`);
    } finally {
      b.restore();
    }
  }
  const g = fakeBrowser('granted');
  try {
    const r = await locateOnce(1000, { fresh: true, ask: false });
    assert.deepEqual(r.at, FOX, 'allowed: the fix is read');
    assert.equal(g.watches(), 1);
  } finally {
    g.restore();
  }
  // Undecided at a return is quiet (the owner's "Quiet, old fix ages"): the held fix stands in, muted, and nothing says location is off.
  const { exploreRead, exploreNotice } = await mod();
  const quiet = exploreRead(here(FOX, NOW - 2 * MIN), { at: null, reason: 'unavailable' }, { at: FOX, t: NOW - 2 * MIN }, NOW);
  assert.equal(quiet.pos.state, 'earlier');
  assert.notEqual(exploreNotice(quiet.pos, 'web').kind, 'off');
});

test('current-position audit 2: with no position, Walk there asks and never saves a destination', async () => {
  const { exploreYou } = await mod();
  const { walkToChoice } = await import('../../startPlan');
  const listed: LngLat = [-71.5, 41.8];
  assert.equal(exploreYou(none, listed), null, 'no position: the point Explore lists from is not you');
  assert.equal(exploreYou({ state: 'none', refused: true }, listed), null);
  assert.deepEqual(exploreYou(here(FOX), FOX), FOX);
  // The tile's choice from no position asks (the card opens with its question); it is never `later` or `far`.
  assert.equal(walkToChoice(null, null, NOW), 'ask');
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  assert.ok(!/walkToChoice\(you \?/.test(src), 'every Walk there and Walk to measures from `exploreYou`, never the listing point');
  assert.ok(!/walkable: !!you &&/.test(src), 'storefront and complex rows say walkable only from a position');
});

test('current-position audit 3: refused, a look says no distance from you', async () => {
  const { lookYou } = await mod();
  assert.equal(lookYou(none), null);
  assert.equal(lookYou({ state: 'none', refused: true }), null);
  assert.deepEqual(lookYou(here(FOX)), FOX);
  assert.deepEqual(lookYou({ state: 'earlier', at: FOX, t: NOW - 20 * MIN, agoMs: 20 * MIN }), FOX);
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  assert.ok(!src.includes('youFresh(getLastFix()'), 'a look and a search take Explore\'s own position, never the fix the app holds');
});

test('current-position audit 4: at a front with no fresh read, a fix twenty minutes old stands in and never says "You\'re here"', async () => {
  const { exploreFront, exploreSeen, exploreNotice, HERE_FOR_MS } = await mod();
  assert.equal(HERE_FOR_MS, 5 * MIN, 'the owner\'s "After 5 minutes"');
  const read = here(FOX, NOW);
  assert.equal(exploreFront(read, NOW + 4 * MIN), read);
  const old = exploreFront(read, NOW + 20 * MIN);
  assert.deepEqual(exploreSeen(old), { dot: 'muted', here: false, distances: true });
  assert.deepEqual(exploreNotice(old, 'web'), { kind: 'earlier', message: 'From where you were twenty minutes ago.' });
  assert.deepEqual(exploreNotice(exploreFront(read, NOW + 5 * MIN + 1000), 'web'), { kind: 'earlier', message: 'From where you were five minutes ago.' });
  assert.equal(exploreFront(read, NOW + 31 * MIN).state, 'none');
  // Applied at each front before the read, and on focus at once: the view calls it there.
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  assert.ok(/const front = \(\) => \{\n\s+const aged = exploreFront\(posRef\.current, Date\.now\(\)\);/.test(src), 'the front ages the fix before it reads');
});

test('current-position audit 5: the stand-in\'s line has no ✕ and leaves on its own', async () => {
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  const banner = src.match(/earlierLine \? \(\n\s+<Banner[^>]*>/)?.[0] ?? '';
  assert.ok(banner && !banner.includes('onDismiss'), `no ✕ on the stand-in's line (${banner})`);
});

test('current-position audit 6: the stand-in line is announced once, not each minute', async () => {
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  const banner = src.match(/earlierLine \? \(\n\s+<Banner[^>]*>/)?.[0] ?? '';
  assert.ok(/live=\{false\}/.test(banner), `the counting words are out of the banner's live region (${banner})`);
  const ui = readFileSync(join(SRC, 'components', 'ui.tsx'), 'utf8');
  assert.ok(/live\?: boolean/.test(ui), 'the Banner can stand outside a live region');
});

test('current-position audit 7: with no position, the title and the row say "Around <town>", never near or around you', async () => {
  const { exploreNamed } = await mod();
  const { lookWords, lookRowLabel } = await import('../../atlas/freeLook');
  const named = exploreNamed(none, 'Cranston');
  assert.deepEqual(named, { name: 'Cranston', region: '' });
  assert.equal(lookWords(named ?? undefined).title, 'Around Cranston');
  assert.equal(lookRowLabel(true, named ?? undefined), 'Towns around Cranston');
  assert.equal(exploreNamed(here(FOX), 'Cranston'), null, 'with a position: "Near you"');
  assert.equal(exploreNamed(none, null), null, 'nothing listed: "Near you" and the empty card');
});

test('current-position audit 11: Navigate\'s focus read accepts a 15 s cached fix; its return read does not', async () => {
  const { readyRead } = await mod();
  assert.deepEqual(readyRead('focus'), { fresh: false, ask: true }, 'the focus read as before (NV17)');
  assert.deepEqual(readyRead('return'), { fresh: true, ask: false }, 'the return: fresh, and never a prompt');
});

test('current-position audit 12: Explore\'s own front asks once per launch; the tick never reads; the dot and the launch flag', async () => {
  const { frontAsk, exploreDot } = await mod();
  const { createLaunchFix, createLaunchFlag } = await import('../../lastFix');
  const launch = createLaunchFix();
  const asks = [frontAsk('prompt', launch), frontAsk('prompt', launch), frontAsk('unknown', launch)];
  assert.deepEqual(asks, [true, false, false], 'one ask a launch');
  assert.equal(frontAsk('granted', createLaunchFix()), false, 'allowed: a read that asks nothing');
  assert.equal(frontAsk('denied', createLaunchFix()), false, 'blocked: never asks');
  assert.deepEqual(exploreDot(here(FOX)), FOX);
  assert.deepEqual(exploreDot({ state: 'earlier', at: FOX, t: NOW, agoMs: 0 }), FOX);
  assert.equal(exploreDot(none), null);
  const flag = createLaunchFlag();
  assert.equal(flag.get(), false);
  flag.set();
  assert.equal(flag.get(), true, 'dismissed until the next launch');
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  const tick = src.match(/setInterval\(([^\n]*), POSITION_AGE_TICK_MS\)/)?.[1] ?? '';
  assert.equal(tick, '() => setPos((p) => exploreFront(p, Date.now()))', `the age tick only ages (${tick})`);
  assert.ok(src.includes('const ask = frontAsk(permissionNow.current?.state ?? null, launchFix);'), 'the view asks through frontAsk');
});

test('current-position audit 13: the stand-in\'s line never takes the place of "Looking around…" and its Cancel', async () => {
  const src = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  const looking = src.indexOf(') : looking ? (');
  const line = src.indexOf(') : earlierLine ? (');
  assert.ok(looking > 0 && line > looking, `the overlay's order: a look in progress, then the stand-in's line (${looking}, ${line})`);
});
