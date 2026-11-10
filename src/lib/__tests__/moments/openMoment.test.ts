/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Moment stacks, round 1 (MS4, MS5, MS12; decision 0106): the Add to this moment pill's life, as a reducer.
// Test first: the module is reached by name, so this file runs before it exists.

type State = unknown;
type Event =
  | { k: 'kept'; id: string; t: number; walking: boolean }
  | { k: 'piece'; id: string; t: number }
  | { k: 'walked'; m: number }
  | { k: 'dismiss' } | { k: 'leave' } | { k: 'walk' } | { k: 'opened'; id: string };
type Mod = {
  OPEN_MS: number;
  WALK_ON_M: number;
  initial: State;
  step(s: State, e: Event): State;
  openId(s: State, now: number): string | null;
  /** The moment a capture begun now joins: the open one, or null for a new moment. */
  target(s: State, now: number): string | null;
};
const mod = () => import('../../openMoment' + '') as Promise<Mod>;
const run = (m: Mod, events: Event[]) => events.reduce((s, e) => m.step(s, e), m.initial);

test('MS4: the pill closes two minutes after the last capture, on a walk or off one', async () => {
  const m = await mod();
  assert.equal(m.OPEN_MS, 120_000);
  for (const walking of [false, true]) {
    const s = run(m, [{ k: 'kept', id: 'a', t: 0, walking }]);
    assert.equal(m.openId(s, 119_999), 'a');
    assert.equal(m.openId(s, 120_000), null);
  }
});

test('MS4: on a walk it closes 100 m of walked trace from the moment\'s first capture, so pieces 60 m apart never chain', async () => {
  const m = await mod();
  assert.equal(m.WALK_ON_M, 100);
  let s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: true }, { k: 'walked', m: 60 }]);
  assert.equal(m.openId(s, 1000), 'a');
  s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: true }, { k: 'walked', m: 60 }, { k: 'piece', id: 'a', t: 1000 }, { k: 'walked', m: 60 }]);
  assert.equal(m.openId(s, 2000), null, '120 m from the first capture: closed, though only 60 m from the last');
  // Off a walk, nothing is walked: no location is read (0036).
  s = run(m, [{ k: 'kept', id: 'b', t: 0, walking: false }, { k: 'walked', m: 500 }]);
  assert.equal(m.openId(s, 1000), 'b');
});

test('MS4: dismissing, leaving, starting or stopping a walk, or opening another moment close it; a dismissed moment never reopens', async () => {
  const m = await mod();
  const kept: Event = { k: 'kept', id: 'a', t: 0, walking: false };
  for (const e of [{ k: 'dismiss' }, { k: 'leave' }, { k: 'walk' }, { k: 'opened', id: 'other' }] as Event[]) {
    assert.equal(m.openId(run(m, [kept, e]), 10), null, e.k);
  }
  assert.equal(m.openId(run(m, [kept, { k: 'opened', id: 'a' }]), 10), 'a', 'opening the same moment keeps it');
  assert.equal(m.openId(run(m, [kept, { k: 'dismiss' }, { k: 'piece', id: 'a', t: 5 }]), 10), null, 'dismissed stays dismissed');
});

test('MS4: a capture begun while the pill is open joins the moment even if the pill closes before it is kept', async () => {
  const m = await mod();
  const s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: false }]);
  assert.equal(m.target(s, 100_000), 'a', 'begun inside the two minutes');
  assert.equal(m.target(s, 130_000), null, 'begun after: a new moment');
});

test('MS5: a piece keeps the pill and restarts its two minutes; an edge capture moves the pill to the new moment', async () => {
  const m = await mod();
  let s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: false }, { k: 'piece', id: 'a', t: 100_000 }]);
  assert.equal(m.openId(s, 200_000), 'a');
  s = m.step(s, { k: 'kept', id: 'b', t: 150_000, walking: false });
  assert.equal(m.openId(s, 160_000), 'b');
});

test('MS12: the viewer may add only to the moment that is open', async () => {
  const m = await mod();
  const s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: false }]);
  assert.equal(m.openId(s, 10) === 'a', true);
  assert.equal(m.openId(s, 10) === 'z', false);
  assert.equal(m.openId(m.initial, 10), null);
});

test('MS20: off a walk, a moment closes by time, a tap or leaving; walking is never read', async () => {
  const m = await mod();
  const s = run(m, [{ k: 'kept', id: 'a', t: 0, walking: false }, { k: 'walked', m: 10_000 }]);
  assert.equal(m.openId(s, 60_000), 'a', 'no distance closes it off a walk');
  assert.equal(m.openId(s, m.OPEN_MS), null, 'time does');
  assert.equal(m.openId(m.step(s, { k: 'dismiss' }), 1), null, 'a tap does');
  assert.equal(m.openId(m.step(s, { k: 'leave' }), 1), null, 'leaving does');
  // The module reads no location: it imports nothing that could.
  const src = (await import('node:fs')).readFileSync(require.resolve('../../openMoment'), 'utf8');
  assert.doesNotMatch(src, /locate|geolocation|expo-location|recorder/);
});
