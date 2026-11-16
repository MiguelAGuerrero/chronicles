/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';

// Storefronts (specs/storefronts, SF1-SF18), written from the spec before the code: the modules are reached by name, so this file runs before they exist.
const types = () => import('../../storefronts/types' as string) as Promise<{ isDrawn: (t: string) => boolean; DRAWN_TYPES: readonly string[]; typeWords: (t: string) => string; NEAR_ZOOM: number; WALK_NEAR_M: number }>;

const LISTED = ['antiques', 'second_hand', 'charity', 'gift', 'florist', 'boutique', 'jewelry', 'toys', 'outdoor', 'photo', 'stationery', 'clothes', 'bag', 'books', 'music', 'musical_instrument'];

test('SF9: the drawn list is exactly the listed shop values, and a test pins it', async () => {
  const { DRAWN_TYPES, isDrawn } = await types();
  assert.deepEqual([...DRAWN_TYPES].sort(), [...LISTED].sort());
  for (const t of LISTED) assert.equal(isDrawn(t), true, t);
});

test('SF9: any other value never draws: errand shops, mall and department_store, an invented one, a prototype key', async () => {
  const { isDrawn } = await types();
  for (const t of ['supermarket', 'convenience', 'hairdresser', 'car_repair', 'mall', 'department_store', 'vintage_robots', '', 'constructor', '__proto__']) assert.equal(isDrawn(t), false, t);
});

test('SF9: presence calls every drawn type a boutique, so the layer never draws what presence leaves out', async () => {
  const { DRAWN_TYPES } = await types();
  const { classesOfOsm } = await import('../../presence/presence');
  const subs = new Map<string, string>([['clothes', 'clothing_store'], ['bag', 'clothing_store'], ['books', 'library'], ['music', 'music'], ['musical_instrument', 'music']]);
  for (const t of DRAWN_TYPES) {
    const [cls, sub] = subs.has(t) ? [subs.get(t)!, t] : ['shop', t];
    assert.ok(classesOfOsm(cls, sub).includes('boutique'), `${t} is a boutique in presence`);
  }
});

test('SF9: no copy calls a drawn type worth going to or another an errand', async () => {
  const { DRAWN_TYPES, typeWords } = await types();
  for (const t of DRAWN_TYPES) assert.ok(!/worth|best|errand|places? to go|must/i.test(typeWords(t)), `${t}: ${typeWords(t)}`);
});

test('SF10: below the near zoom nothing is drawn, and the walk maps draw within 800 m of you', async () => {
  const { NEAR_ZOOM, WALK_NEAR_M } = await types();
  assert.equal(NEAR_ZOOM, 14);
  assert.equal(WALK_NEAR_M, 800);
});
