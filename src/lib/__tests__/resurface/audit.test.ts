/// <reference types="node" />
import { type Faced, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compose, lately } from '../../resurface/feed';
import { labelFor, whenLine } from '../../resurface/lines';
import { resurfaceOrder } from '../../resurface/pick';
import { DEFAULT_EXTRACTORS } from '../../resurface/extractors';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { createResurface } from '../../resurface/shell';
import { sectionOnRoute } from '../../resurface/section';
import { termsOf } from '../../resurface/terms';
import { deriveThreads } from '../../resurface/threads';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at, DAY, moment, NOW } from './fixtures';

const walk: Walk = { id: 'w1', started_at: at(2026, 3, 1), ended_at: at(2026, 3, 1) + 3600_000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
const note = (id: string, t: number, body: string): Faced => facedOf({ id, walk_id: 'w1', t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
async function seeded() {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  for (const [i, w] of ['harbor', 'harbor', 'harbor', 'orchard'].entries()) await p.db.addMoment(momentOf(note(`n${i}`, at(2026, 3, 1 + i), w)));
  const r = createResurface(p);
  await r.load();
  return { p, r };
}
const gate = () => {
  let open!: () => void;
  const wait = new Promise<void>((res) => { open = res; });
  return { wait, open };
};

test('resurfaced-moments audit 1: contractions yield no fragment terms; a possessive keeps its word', () => {
  const terms = (s: string) => termsOf(s).map((t) => t.term);
  assert.deepEqual(terms("I don't know, didn't see it, couldn't stay. It's Don’t"), ['know', 'stay']);
  assert.deepEqual(terms("John's bench and the 'orchard'"), ['john', 'bench', 'orchard']);
});

test('resurfaced-moments audit 1: three notes of contractions make no thread', () => {
  const ms = [at(2026, 9, 1), at(2026, 9, 5), at(2026, 9, 9)].map((t) => moment(t, "I don't know why, didn't see, couldn't stay"));
  const names = deriveThreads(ms, DEFAULT_EXTRACTORS, EMPTY_PREFS, NOW).map((t) => t.term);
  assert.deepEqual(names.filter((n) => ['don', 'didn', 'couldn', 'doesn', 'isn'].includes(n)), []);
  assert.deepEqual(names.sort(), ['know', 'stay']);
});

test('resurfaced-moments audit 2: Undo reverses only its own choice', async () => {
  const { r } = await seeded();
  const hide = await r.hide('n3');
  await r.rename('harbor', 'The harbor');
  await r.less('n0');
  await r.undo(hide);
  const p = r.store.get().prefs;
  assert.deepEqual(p.hidden, [], 'the hide is undone');
  assert.equal(p.renames.harbor, 'The harbor', 'the later rename stays');
  assert.deepEqual(p.dim, ['n0'], 'the later Show less stays');
});

test('resurfaced-moments audit 2: Undo of a rename puts back the name it replaced', async () => {
  const { r } = await seeded();
  await r.rename('harbor', 'First');
  const second = await r.rename('harbor', 'Second');
  await r.undo(second);
  assert.equal(r.store.get().prefs.renames.harbor, 'First');
});

test('resurfaced-moments audit 3: a load waits for a choice still being written, so it is not lost', async () => {
  const { p, r } = await seeded();
  const g = gate();
  const real = p.db.setMeta.bind(p.db);
  p.db.setMeta = async (k: string, v: string) => { await g.wait; return real(k, v); };
  const hiding = r.hide('n3');
  const loading = r.load();
  g.open();
  await Promise.all([hiding, loading]);
  assert.deepEqual(r.store.get().prefs.hidden, ['n3']);
});

test('resurfaced-moments audit 3: of two overlapping loads, the one asked last wins', async () => {
  const { p, r } = await seeded();
  const g = gate();
  const real = p.db.momentsBetween.bind(p.db);
  let calls = 0;
  p.db.momentsBetween = async (a: number, b: number) => {
    const first = ++calls === 1;
    const rows = await real(a, b);
    if (first) await g.wait;
    return rows;
  };
  const slow = r.load();
  await p.db.deleteMoments(['n3']);
  const fast = r.load();
  await fast;
  g.open();
  await slow;
  assert.deepEqual(r.store.get().moments.map((m) => m.id), ['n0', 'n1', 'n2'], 'the stale read did not bring n3 back');
});

test('resurfaced-moments audit 4: a refresh keeps the seed, the top card and Another\'s place; a load starts a new open', async () => {
  const { p, r } = await seeded();
  await r.shown('n2');
  r.another();
  r.another();
  const before = r.store.get();
  await p.db.deleteMoments(['n3']);
  await r.refresh();
  const after = r.store.get();
  assert.deepEqual([after.seed, after.index, after.lastShownAtOpen], [before.seed, before.index, before.lastShownAtOpen]);
  assert.deepEqual(after.moments.map((m) => m.id), ['n0', 'n1', 'n2']);
  await r.load();
  assert.equal(r.store.get().index, 0);
});

test('resurfaced-moments audit 5: a moment 300-364 days old says "<Month> last year", not "In <Month>"', () => {
  assert.equal(whenLine(at(2025, 11, 20), NOW), 'November last year');
  assert.equal(whenLine(at(2025, 12, 28), NOW), 'December last year');
  assert.equal(whenLine(at(2026, 1, 9), NOW), 'In January');
  assert.equal(labelFor({ kind: 'month' }, at(2025, 11, 20), NOW), 'Last November');
});

test('resurfaced-moments audit 6: a word and its plural are one term, for -ie and -y words alike', () => {
  const one = (a: string, b: string) => assert.equal(new Set(termsOf(`${a} ${b}`).map((t) => t.term)).size, 1, `${a} / ${b}`);
  one('cookie', 'cookies');
  one('movie', 'movies');
  one('bakery', 'bakeries');
  one('statue', 'statues');
});

test('resurfaced-moments audit 7: what was kept in the last day heads Lately (now by plain time: MC13)', () => {
  const thr = [at(2026, 9, 1), at(2026, 9, 8), at(2026, 10, 30)].map((t) => moment(t, 'harbor', { id: `h${t}` }));
  const justNow = moment(NOW - 20 * 60_000, 'bench', { id: 'now' });
  const c = compose([...thr, justNow], EMPTY_PREFS, new Set(), NOW, 's');
  assert.equal(lately(c.moments, NOW, 20).items[0].id, 'now');
});

test('resurfaced-moments audit 10: a choice says whether it was kept', async () => {
  const { p, r } = await seeded();
  assert.equal((await r.hide('n3')).saved, true);
  p.db.failNext('setMeta');
  assert.equal((await r.hide('n2')).saved, false, 'a failed write is reported (labelled so: only the fake can fail it)');
});

test('resurfaced-moments audit 11: a 29 Feb moment resurfaces on 28 Feb of a common year; a recent "older" moment is said by its day', () => {
  const feb28 = new Date(2027, 1, 28, 12).getTime();
  const leap = moment(new Date(2024, 1, 29, 12).getTime(), 'leap day');
  const order = resurfaceOrder([leap], { now: feb28, seed: 's', prefs: EMPTY_PREFS, threads: [], extractors: DEFAULT_EXTRACTORS });
  assert.deepEqual(order[0].reason, { kind: 'anniversary', years: 3 });
  assert.equal(labelFor({ kind: 'older' }, NOW - 25 * DAY, NOW), 'Three weeks ago');
  assert.equal(labelFor({ kind: 'older' }, NOW - 90 * DAY, NOW), 'A while ago');
});

test('resurfaced-moments audit 9: only the tabs and the walk reset the section (a replay, a day and Chronicle keep it)', () => {
  for (const keep of ['/replay/w1', '/day/2026-11-04', '/chronicle']) assert.equal(sectionOnRoute('map', keep), 'map', keep);
  for (const reset of ['/', '/navigate', '/explore', '/walk']) assert.equal(sectionOnRoute('map', reset), 'memories', reset);
});
