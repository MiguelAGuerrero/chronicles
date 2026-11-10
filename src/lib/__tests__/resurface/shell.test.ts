/// <reference types="node" />
import { type Faced, facedAll, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compose } from '../../resurface/feed';
import { createResurface } from '../../resurface/shell';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at, NOW } from './fixtures';

const walk: Walk = { id: 'w1', started_at: at(2026, 3, 1), ended_at: at(2026, 3, 1) + 3600_000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
const note = (id: string, t: number, body: string, walk_id: string | null = 'w1'): Faced => facedOf({ id, walk_id, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });

async function seeded() {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  for (const [i, w] of ['harbor', 'harbor', 'harbor', 'orchard'].entries()) await p.db.addMoment(momentOf(note(`n${i}`, at(2026, 3, 1 + i), w)));
  const r = createResurface(p);
  await r.load();
  return { p, r };
}
const view = (r: Awaited<ReturnType<typeof seeded>>['r']) => {
  const s = r.store.get();
  return compose(s.moments, s.prefs, new Set(), NOW, s.seed);
};

test('RM17: load reads every moment of the stopped walks, and the memories are ready', async () => {
  const { r } = await seeded();
  const s = r.store.get();
  assert.equal(s.status, 'ready');
  assert.deepEqual(s.moments.map((m) => m.id), ['n0', 'n1', 'n2', 'n3']);
  assert.equal(s.walks.w1.area, 'Fox Point');
});

test('RM21: the choices are read before the first moment is picked', async () => {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  for (const [i, w] of ['harbor', 'orchard'].entries()) await p.db.addMoment(momentOf(note(`n${i}`, at(2026, 3, 1 + i), w)));
  await p.db.setMeta('resurface_prefs', JSON.stringify({ hidden: ['n0'], dim: [], less: [], renames: {}, removed: [], lastShown: null }));
  const r = createResurface(p);
  await r.load();
  assert.deepEqual(compose(r.store.get().moments, r.store.get().prefs, new Set(), NOW, 's').order.map((x) => x.moment.id), ['n1']);
});

test('RM20, RM21: Not this one and Show less like this are kept in one meta key, and survive a reload', async () => {
  const { p, r } = await seeded();
  p.log.clear();
  await r.hide('n3');
  await r.less('n0');
  assert.deepEqual(p.log.effects('db.'), ['db.setMeta', 'db.setMeta']);
  assert.deepEqual(new Set(p.log.argsOf('db.setMeta').map((a) => a[0])), new Set(['resurface_prefs']));
  const again = createResurface(p);
  await again.load();
  const prefs = again.store.get().prefs;
  assert.deepEqual(prefs.hidden, ['n3']);
  assert.deepEqual(prefs.dim, ['n0']);
  assert.deepEqual(prefs.less, ['harbor']);
});

test('RM20: Undo puts the choices back, in the store and in meta', async () => {
  const { p, r } = await seeded();
  const change = await r.hide('n3');
  assert.deepEqual(r.store.get().prefs.hidden, ['n3']);
  await r.undo(change);
  assert.deepEqual(r.store.get().prefs.hidden, []);
  const again = createResurface(p);
  await again.load();
  assert.deepEqual(again.store.get().prefs.hidden, []);
});

test('RM16: Rename and Not a thread are kept, and touch no moment', async () => {
  const { p, r } = await seeded();
  const count = r.store.get().moments.length;
  await r.rename('harbor', 'The harbor');
  assert.equal(view(r).threads[0].name, 'The harbor');
  await r.removeThread('harbor');
  assert.deepEqual(view(r).threads, []);
  assert.equal(r.store.get().moments.length, count);
  assert.deepEqual(p.log.effects('db.').filter((c) => c !== 'db.setMeta'), ['db.createWalk', 'db.addMoment', 'db.addMoment', 'db.addMoment', 'db.addMoment']);
});

test('RM8, RM21: the moment shown last is kept, so the next open starts elsewhere', async () => {
  const { p, r } = await seeded();
  await r.shown('n2');
  assert.equal(r.store.get().prefs.lastShown, 'n2');
  assert.equal(r.store.get().lastShownAtOpen, null, 'but this open\'s order does not move');
  const again = createResurface(p);
  await again.load();
  assert.equal(again.store.get().lastShownAtOpen, 'n2', 'the next open starts elsewhere');
});

test('RM8: showing the same moment twice writes once', async () => {
  const { p, r } = await seeded();
  await r.shown('n2');
  p.log.clear();
  await r.shown('n2');
  assert.deepEqual(p.log.effects(), []);
});

test('RM18: a note edited in the viewer shows at once, in the store and in the db', async () => {
  const { p, r } = await seeded();
  const c = r.store.get().moments.find((m) => m.id === 'n3')!.capture;
  await r.saveNote(c, 'a quiet orchard in spring');
  assert.equal(r.store.get().moments.find((m) => m.id === 'n3')!.words, 'a quiet orchard in spring');
  assert.equal((await p.db.getMomentsByIds(['n3']).then(facedAll))[0].body, 'a quiet orchard in spring');
});

test('RM8: Another steps on, and each open gets its own seed', async () => {
  const { r } = await seeded();
  const first = r.store.get().seed;
  r.another();
  r.another();
  assert.equal(r.store.get().index, 2);
  await r.load();
  assert.equal(r.store.get().index, 0, 'a new open starts at the top card');
  assert.equal(typeof first, 'string');
});

test('RM23: reading writes nothing; the only write is the meta key', async () => {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  await p.db.addMoment(momentOf(note('n0', at(2026, 3, 1), 'harbor')));
  p.log.clear();
  const r = createResurface(p);
  await r.load();
  assert.deepEqual(p.log.effects(), []);
  await r.hide('n0');
  assert.deepEqual(p.log.effects(), ['db.setMeta']);
});

test('RM4: a failed read says so, and the next load recovers', async () => {
  const p = fakePorts({ now: NOW });
  p.db.failNext('momentsBetween');
  const r = createResurface(p);
  await r.load();
  assert.equal(r.store.get().status, 'failed');
  await r.load();
  assert.equal(r.store.get().status, 'ready');
});

test('RM20: a choice that cannot be kept still shows now (the write failed; labelled so: only the fake can fail it)', async () => {
  const { p, r } = await seeded();
  p.db.failNext('setMeta');
  await r.hide('n3');
  assert.deepEqual(r.store.get().prefs.hidden, ['n3']);
});

test('NV13: the shell says whether a walk is open, so a reminder waiting from a cold start opens on the walk or on Memories', async () => {
  const { p, r } = await seeded();
  assert.equal(await r.openWalk(), false);
  await p.db.createWalk({ ...walk, id: 'w2', ended_at: null, open: true });
  assert.equal(await r.openWalk(), true);
});
