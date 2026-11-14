/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { aheadStep, KEEP_MS, LEAD_M, warningLine, type AheadState, type Stretch } from '../../walk/ahead';

// After dark (DK10, DK13), written from specs/after-dark/spec.md before the code.

interface DarkWay { id: string; lit: string; name?: string; line: LngLat[] }
interface Api {
  unlitStretches(path: readonly LngLat[], ways: readonly DarkWay[]): Stretch[];
  headsUp(o: { walkOn: boolean; darkOn: boolean; dark: boolean }): { readWalk: boolean; readDark: boolean };
  withUnlit(walk: readonly Stretch[], unlit: readonly Stretch[]): Stretch[];
}
const api = async () => (await import('../../dark/ahead' as string)) as Api;

const O: LngLat = [-75.49, 40.6];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
const path = [at(0), at(1500)];
const unlit = 'unlit' as unknown as Stretch['kind'];
const w = (id: string, lit: string, from: number, to: number, name?: string): DarkWay => ({ id, lit, name, line: [at(from), at(to)] });

test('DK10: an unlit stretch of 100 m or more is said 200 m ahead, once, kept 15 s; near ones are one; walkability\'s line wins; the words', { todo: 'test first' }, async () => {
  const { unlitStretches, withUnlit } = await api();
  // Lit 0-300, unlit 300-500 on Elm Street, lit 500-600, unlit 600-700 (100 m from the first: one stretch), lit after.
  const ways = [w('a', 'yes', 0, 300), w('b', 'no', 300, 500, 'Elm Street'), w('c', 'yes', 500, 600), w('d', 'no', 600, 700, 'Elm Street'), w('e', 'yes', 700, 1500)];
  const got = unlitStretches(path, ways);
  assert.equal(got.length, 1, JSON.stringify(got));
  assert.equal(got[0].kind, 'unlit');
  assert.equal(got[0].street, 'Elm Street');
  assert.ok(Math.abs(got[0].fromM - 300) < 25 && Math.abs(got[0].toM - 700) < 25, JSON.stringify(got[0]));
  // Short, untagged and lit ways say nothing.
  assert.deepEqual(unlitStretches([at(0), at(80)], [w('x', 'no', 0, 80)]), [], 'under 100 m');
  assert.deepEqual(unlitStretches(path, [w('y', 'maybe', 0, 1500), w('z', 'yes', 0, 1500)]), [], 'unknown and lit');
  // Said 200 m ahead, once, and kept 15 s.
  let s: AheadState = { said: [], shown: null };
  let r = aheadStep(s, got, 300 - LEAD_M - 10, 0);
  assert.equal(r.show, null);
  r = aheadStep(r.state, got, 300 - LEAD_M + 10, 1000);
  assert.equal(r.show?.key, got[0].key);
  s = r.state;
  r = aheadStep(s, got, 800, 1000 + KEEP_MS + 1);
  assert.equal(r.show, null);
  assert.equal(aheadStep(r.state, got, 300 - LEAD_M + 10, 1000 + KEEP_MS + 2).show, null, 'once per stretch');
  // Walkability's line wins where both are due; elsewhere both stay.
  const car: Stretch = { key: 'car', kind: 'road', street: 'Route 22', fromM: 350, toM: 450 };
  assert.deepEqual(withUnlit([car], got), [car]);
  const later: Stretch = { key: 'far', kind: 'road', street: 'Route 22', fromM: 1000, toM: 1200 };
  assert.deepEqual(withUnlit([later], got).map((x) => x.key), [got[0].key, 'far']);
  // The words, and no glyph is chosen here: the line's icon is the view's (the moon, never a car).
  assert.equal(warningLine({ kind: unlit, street: 'Elm Street' }), 'Next: Elm Street is mapped as unlit');
  assert.equal(warningLine({ kind: unlit, street: null }), 'Next: a stretch mapped as unlit');
});

test('DK13: the heads-up reads walkability only while it is on, after-dark tiles only while After dark is on and it is dark', { todo: 'test first' }, async () => {
  const { headsUp } = await api();
  assert.deepEqual(headsUp({ walkOn: false, darkOn: false, dark: true }), { readWalk: false, readDark: false });
  assert.deepEqual(headsUp({ walkOn: true, darkOn: false, dark: true }), { readWalk: true, readDark: false });
  assert.deepEqual(headsUp({ walkOn: false, darkOn: true, dark: true }), { readWalk: false, readDark: true });
  assert.deepEqual(headsUp({ walkOn: false, darkOn: true, dark: false }), { readWalk: false, readDark: false }, 'in daylight the unlit line waits');
  assert.deepEqual(headsUp({ walkOn: true, darkOn: true, dark: false }), { readWalk: true, readDark: false });
});
