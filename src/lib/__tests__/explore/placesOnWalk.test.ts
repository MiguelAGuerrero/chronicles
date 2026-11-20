/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Modes to layers MD3-MD8, MD11, MD17-MD19, written before the code. "Exploring" is gone: what it gated now reads Places.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

test('MD7: the pocket alert and its nudge need Places on, the setting on, and no ride or preview', async () => {
  const { pocketAlert } = await import('../../explore/explore');
  const base = { places: true, haptic: true, riding: false, previewing: false, nearKeys: ['a'], alerted: new Set<string>() } as never;
  assert.equal((pocketAlert(base) as { nudge: boolean }).nudge, true);
  for (const o of [{ places: false }, { haptic: false }, { riding: true }, { previewing: true }]) {
    assert.deepEqual(pocketAlert({ ...(base as object), ...o } as never), { mark: [], nudge: false }, JSON.stringify(o));
  }
});

test('MD8: capturing for a place needs Places on: with it off there is no place card', () => {
  // Since capture-at-a-place the card itself carries the capture row; it shows only with Places on.
  assert.match(src('src/app/walk.tsx'), /\{openMark && !spot && placesOn && \(/);
});

test('MD17: storefront streets are remembered while Places or Storefronts is on, never otherwise', async () => {
  const m = (await import('../../explore/explore')) as unknown as { rememberStorefronts?: (o: { places: boolean; storefronts: boolean }) => boolean };
  assert.ok(m.rememberStorefronts, 'rememberStorefronts exists');
  assert.equal(m.rememberStorefronts({ places: true, storefronts: false }), true);
  assert.equal(m.rememberStorefronts({ places: false, storefronts: true }), true);
  assert.equal(m.rememberStorefronts({ places: false, storefronts: false }), false);
});

test('MD18: "What I\'m into" shows while Places or Sights is on', async () => {
  const m = (await import('../../explore/explore')) as unknown as { intoRowShown?: (o: { places: boolean; sights: boolean }) => boolean };
  assert.ok(m.intoRowShown, 'intoRowShown exists');
  assert.equal(m.intoRowShown({ places: true, sights: false }), true);
  assert.equal(m.intoRowShown({ places: false, sights: true }), true);
  assert.equal(m.intoRowShown({ places: false, sights: false }), false);
});

test('MD3, MD4, MD5, MD6: the walk reads its own layers, not a mode; the range and passing rows are not behind one', () => {
  const w = src('src/app/walk.tsx');
  assert.ok(/useWalkLayers\(/.test(w), 'the walk screen reads the walk\'s layers');
  assert.ok(!/const \[exploring, setExploring\]/.test(w), 'no exploring state');
  assert.ok(/layers\.on\.storefronts/.test(w) && /hotStrips/.test(w), 'the strip chip follows Storefronts');
  const s = src('src/components/StartSettings.tsx');
  assert.ok(!/mode === 'explore'/.test(s), 'the settings rows are not behind a mode');
});

test('MD11: the ready map draws the ring while Places is on', () => {
  const r = src('src/components/walk/useReady.tsx');
  assert.ok(/layers\.on\.places/.test(r) && !/mode === 'explore'/.test(r));
});

test('MD19: (also MD15) no copy on the walk or the ready map says what is left, how many or "nearby to find"', () => {
  const copy = ['src/app/walk.tsx', 'src/components/walk/useReady.tsx', 'src/components/StartSettings.tsx'].map(src).join('\n');
  assert.ok(!/left to find|still to find|nearby to find|remaining/i.test(copy.replace(/\/\/.*$/gm, '')), 'no left-to-find copy');
});
