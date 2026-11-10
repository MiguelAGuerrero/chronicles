/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMomentPill } from '../../momentPill/shell';
import { fakePorts } from '../fakes';

// Moment stacks MS4, MS12 (decision 0123): the pill's store on a hand-driven clock and timer.
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

// ---- Moment stacks round 2 (MS18-MS21). Test first: grouping is reached through a cast.
type Grouping = { loadGrouping(): Promise<boolean>; setGrouping(on: boolean): Promise<void>; edgeTarget(): string | null; newMoment(): void; store: { get(): { grouping?: boolean } } };

test('MS18: Group captures is off by default, saved on the device and read back', async () => {
  const p = fakePorts({ now: 0 });
  const pill = createMomentPill(p, timers()) as unknown as Grouping;
  assert.equal(await pill.loadGrouping(), false);
  await pill.setGrouping(true);
  const again = createMomentPill(p, timers()) as unknown as Grouping;
  assert.equal(await again.loadGrouping(), true);
});

test('MS19, MS21: with grouping on, an edge capture joins the open moment until New moment; with it off, the edge always starts a new one', async () => {
  const p = fakePorts({ now: 0 });
  now.t = 0;
  p.clock.now = () => now.t;
  const pill = createMomentPill(p, timers());
  const g = pill as unknown as Grouping;
  pill.kept('m', false);
  assert.equal(g.edgeTarget(), null, 'grouping off: the edge makes a new moment');
  await g.setGrouping(true);
  assert.equal(g.edgeTarget(), 'm');
  g.newMoment();
  assert.equal(g.edgeTarget(), null, 'New moment: the next capture is a new moment');
});
