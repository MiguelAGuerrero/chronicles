/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMomentPill } from '../../momentPill/shell';
import { fakePorts } from '../fakes';

// Moment stacks MS4, MS12 (decision 0106): the pill's store on a hand-driven clock and timer.
function timers() {
  const due = new Map<number, { at: number; fn: () => void }>();
  let seq = 0;
  return {
    setTimer: (fn: () => void, ms: number) => { const id = ++seq; due.set(id, { at: now.t + ms, fn }); return id; },
    clearTimer: (id: unknown) => { due.delete(id as number); },
    run() { for (const [id, j] of [...due]) if (j.at <= now.t) { due.delete(id); j.fn(); } },
  };
}
const now = { t: 1_000 };

test('MS4: the pill goes by itself when its two minutes are up, and a piece starts them again', () => {
  const p = fakePorts({ now: 0 });
  p.clock.now = () => now.t;
  const t = timers();
  const pill = createMomentPill(p, t);
  now.t = 1_000;
  pill.kept('m', false);
  assert.equal(pill.store.get().id, 'm');
  now.t = 100_000;
  pill.piece('m');
  now.t = 125_000;
  t.run();
  assert.equal(pill.store.get().id, 'm', 'the piece restarted its two minutes');
  now.t = 220_001;
  t.run();
  assert.equal(pill.store.get().id, null);
});

test('MS12: the viewer reads which moment is open: only that one may be added to', () => {
  const p = fakePorts({ now: 0 });
  now.t = 0;
  p.clock.now = () => now.t;
  const pill = createMomentPill(p, timers());
  pill.kept('m', true);
  assert.equal(pill.store.get().id, 'm');
  pill.walked(60);
  assert.equal(pill.target(), 'm');
  pill.walked(50);
  assert.equal(pill.store.get().id, null, '110 m from the first capture');
  assert.equal(pill.target(), null);
});
