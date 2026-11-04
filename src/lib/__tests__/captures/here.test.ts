import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHere } from '../../here/shell';
import type { Capture, LngLat, Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at } from '../foxPoint';

// "What happened here": the chronicle read by place (specs/test-gaps, TD3). `at(x, y)` is in units of 100 m.

const walk = (id: string, started_at: number, title: string | null = null): Walk => ({ id, started_at, ended_at: started_at + 3_600_000, title, epilogue: null, open: false, area: 'Fox Point', snapped_build: null });
const cap = (id: string, walk_id: string | null, t: number, where: LngLat | null): Capture => ({
  id, walk_id, t, kind: 'text', file_path: null, body: id, segment_id: null, lat: where ? where[1] : null, lon: where ? where[0] : null,
});

test('TD3 every capture within reach, across walks, oldest first, with its walk and how far in, paused time left out', async () => {
  const p = fakePorts();
  const t0 = Date.UTC(2026, 10, 3, 18, 0);
  await p.db.createWalk(walk('w1', t0, 'Evening loop'));
  await p.db.createWalk(walk('w2', t0 + 86_400_000));
  // Walk 1 paused for 10 min, 20 min in.
  await p.db.startPause('w1', t0 + 20 * 60_000);
  await p.db.endPause('w1', t0 + 30 * 60_000);
  await p.db.addCapture(cap('late', 'w1', t0 + 40 * 60_000, at(0.1, 0)));
  await p.db.addCapture(cap('first', 'w1', t0, at(0, 0.2)));
  await p.db.addCapture(cap('next-day', 'w2', t0 + 86_400_000 + 5 * 60_000, at(0, 0)));
  await p.db.addCapture(cap('far', 'w1', t0 + 5 * 60_000, at(3, 0)));
  // The open walk's capture, shown but not stored yet.
  const live = cap('live', 'w2', t0 + 86_400_000 + 9 * 60_000, at(0.2, 0));
  const r = await createHere(p).capturesHere(at(0, 0), [live]);
  assert.deepEqual(r.captures.map((c) => c.id), ['first', 'late', 'next-day', 'live'], 'oldest first, the far one left out, the live one in');
  assert.equal(r.context.get('first'), 'Evening loop · at the start');
  assert.equal(r.context.get('late'), 'Evening loop · 30 min in', '40 minutes after the start, less the 10 paused');
  assert.match(r.context.get('next-day') ?? '', / · 5 min in$/, 'an untitled walk gets its suggested title');
  assert.match(r.context.get('live') ?? '', / · 9 min in$/);
});

test('TD3 a moment outside any walk says so; one whose walk is gone is left out', async () => {
  const p = fakePorts();
  await p.db.addCapture(cap('moment', null, 1000, at(0, 0)));
  await p.db.addCapture(cap('orphan', 'gone', 2000, at(0, 0.1)));
  const r = await createHere(p).capturesHere(at(0, 0));
  assert.deepEqual(r.captures.map((c) => c.id), ['moment']);
  assert.equal(r.context.get('moment'), 'Not on a walk');
});
