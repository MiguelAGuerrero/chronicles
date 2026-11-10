/// <reference types="node" />
import { type Faced, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { createResurface } from '../../resurface/shell';
import type { StreetSegment, Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at, NOW } from './fixtures';

// Memories in context (MC6, MC8, MC17, MC9-MC12), over fakePorts(). Written before the code: a todo calls what
// does not exist yet through an untyped handle, so typecheck and the other tests stay green.
type Any = any;

const START = at(2026, 10, 20) - 5 * 3600_000; // 07:00 local that day
const MIN = 60_000;
const walk: Walk = { id: 'w1', started_at: START, ended_at: START + 3600_000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
const seg = (id: string, name: string | null, lon: number, lat: number): StreetSegment => ({ id, name, kind_detail: 'residential', length_m: 100, geometry: [[[lon - 0.001, lat], [lon + 0.001, lat]]], build: 'b' });
const cap = (id: string, minutesIn: number, o: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w1', t: START + minutesIn * MIN, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: `harbor ${id}`, segment_id: 's1', ...o,
});

async function seeded() {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  await p.db.putSegments([seg('s1', 'Hope Street', -71.4, 41.8)]);
  // a pause of 10 minutes between minute 20 and 30
  await p.db.startPause('w1', START + 20 * MIN);
  await p.db.endPause('w1', START + 30 * MIN);
  for (const c of [cap('m1', 5), cap('m2', 12, { kind: 'photo', file_path: 'f', body: null, caption: 'x' }), cap('m3', 40), cap('m4', 45, { segment_id: null, lat: 41.9, lon: -71.5 })]) await p.db.addMoment(momentOf(c));
  const r = createResurface(p) as Any;
  await r.load();
  return { p, r };
}
const ctxOf = (r: Any, id: string) => r.store.get().context?.[id];

test('MC6: context is read for the moments asked about, once per open, and not again on a repeat', async () => {
  const { p, r } = await seeded();
  p.log.clear();
  await r.contextFor(['m1']);
  assert.equal(p.log.argsOf('db.getSegmentsIn').length, 1, 'one read for one moment');
  await r.contextFor(['m1']);
  await r.contextFor(['m1']);
  assert.equal(p.log.argsOf('db.getSegmentsIn').length, 1, 'a repeat reads nothing');
  await r.contextFor(['m1', 'm2']);
  assert.equal(p.log.argsOf('db.getSegmentsIn').length, 2, 'only the new moment is read');
  assert.equal(ctxOf(r, 'm3'), undefined, 'a moment not asked about is not read');
});

test('MC1, MC2, MC3: the context line has the street, the town, and the walked minutes (pauses excluded)', async () => {
  const { r } = await seeded();
  await r.contextFor(['m1', 'm3']);
  assert.equal(ctxOf(r, 'm1').state, 'done');
  assert.match(ctxOf(r, 'm1').line, /^Hope Street, Fox Point · .+ · Five minutes in$/);
  assert.match(ctxOf(r, 'm3').line, /Thirty minutes in$/, 'minute 40 less the ten paused is thirty walked');
});

test('MC5: a moment made soon after the capture before it says so by its kind', async () => {
  const { r } = await seeded();
  await r.contextFor(['m2', 'm3']);
  assert.match(ctxOf(r, 'm2').line, /Twelve minutes in, after a note$/, 'm1 is the capture just before m2, seven walked minutes earlier');
  assert.doesNotMatch(ctxOf(r, 'm3').line, /just after/, 'm2 was twenty-eight walked minutes before');
});

test('MC2: a moment far from any cached street shows the town alone', async () => {
  const { r } = await seeded();
  await r.contextFor(['m4']);
  assert.match(ctxOf(r, 'm4').line, /^Fox Point · /);
});

test('MC17: while the read is unfinished there is no place claim, and a failed read is not "no street"', async () => {
  const { p, r } = await seeded();
  let release!: () => void;
  const gate = new Promise<void>((res) => { release = res; });
  const real = p.db.getSegmentsIn.bind(p.db);
  p.db.getSegmentsIn = async (b: [number, number, number, number]) => { await gate; return real(b); };
  const reading = r.contextFor(['m1']);
  assert.equal(ctxOf(r, 'm1')?.state, 'pending');
  assert.equal(ctxOf(r, 'm1')?.line, undefined);
  release();
  await reading;
  assert.equal(ctxOf(r, 'm1').state, 'done');
  p.db.getSegmentsIn = real;
  p.db.failNext('getSegmentsIn');
  await r.contextFor(['m3']);
  assert.equal(ctxOf(r, 'm3').state, 'failed');
  assert.equal(ctxOf(r, 'm3').line, undefined, 'no "No place kept" for a failed read');
  await r.contextFor(['m3']);
  assert.equal(ctxOf(r, 'm3').state, 'done', 'the next ask reads again');
});

test('MC8: Hidden lists hidden moments, fewer-like-this moments, removed threads and softened words, each restorable', async () => {
  const { r } = await seeded();
  await r.hide('m1');
  await r.less('m2'); // a photo caption "x": no words
  await r.less('m3'); // "harbor m3": the word harbor
  await r.removeThread('harbor');
  const { hiddenItems } = (await import(`../../resurface/${'hidden'}`)) as Any;
  const items = hiddenItems(r.store.get().prefs, r.store.get().moments);
  assert.deepEqual(items.moments.map((m: Any) => [m.id, m.mode]).sort(), [['m1', 'hidden'], ['m2', 'fewer'], ['m3', 'fewer']]);
  assert.deepEqual(items.threads, ['harbor']);
  assert.deepEqual(items.words.map((w: Any) => w.term), ['harbor']);
  await r.restoreMoment('m1');
  await r.restoreMoment('m2');
  await r.restoreThread('harbor');
  await r.restoreWord('harbor');
  const p = r.store.get().prefs;
  assert.deepEqual([p.hidden, p.dim, p.removed, p.less], [[], ['m3'], [], []], 'what was restored is gone; m3 stays fewer-like-this until restored');
  await r.restoreMoment('m3');
  assert.deepEqual(r.store.get().prefs.dim, []);
});

test('MC9, MC12: the switch is kept, empties the top card, and an old or damaged value reads as on', async () => {
  const { p, r } = await seeded();
  const { compose } = (await import(`../../resurface/${'feed'}`)) as Any;
  const state = () => r.store.get();
  assert.ok(compose(state().moments, state().prefs, new Set(), NOW, 's').order.length > 0, 'on by default');
  const change = await r.setOff(true);
  assert.equal(change.saved, true);
  assert.deepEqual(compose(state().moments, state().prefs, new Set(), NOW, 's').order, [], 'off: no top card');
  assert.equal(compose(state().moments, state().prefs, new Set(), NOW, 's').moments.length, 4, 'Lately keeps every moment');
  const again = createResurface(p) as Any;
  await again.load();
  assert.equal(again.store.get().prefs.off, true, 'survives a reload');
  for (const stored of [{ hidden: ['x'] }, { off: 'yes' }, { off: 1 }, { off: null }]) {
    await p.db.setMeta('resurface_prefs', JSON.stringify({ ...EMPTY_PREFS, ...stored }));
    const q = createResurface(p) as Any;
    await q.load();
    assert.equal(q.store.get().prefs.off, false, JSON.stringify(stored));
  }
});

test('MC10: Forget my choices clears the lists and renames, keeps the switch, and touches no moment', async () => {
  const { r } = await seeded();
  await r.hide('m1');
  await r.less('m3');
  await r.removeThread('harbor');
  await r.rename('stay', 'Kept name');
  await r.setOff(true);
  const count = r.store.get().moments.length;
  await r.forget();
  const p = r.store.get().prefs;
  assert.deepEqual([p.hidden, p.dim, p.less, p.removed, p.renames], [[], [], [], [], {}]);
  assert.equal(p.off, true, 'the switch keeps its state');
  assert.equal(r.store.get().moments.length, count);
});

test('MC11: Show less like this names at most one word, and every word it set is in Hidden', async () => {
  const { r } = await seeded();
  const change = await r.less('m3');
  assert.deepEqual(change.after.less, ['harbor', 'm3'].filter((t) => change.after.less.includes(t)));
  const { fewerWord } = (await import(`../../resurface/${'copy'}`)) as Any;
  assert.equal(fewerWord(change.after.less.filter((t: string) => !change.before.less.includes(t))), 'harbor', 'the first word the owner wrote');
  assert.equal(fewerWord([]), null);
});

test('MC5: after a delete, a neighbour is read again, so a deleted capture is never "just before"', async () => {
  const { p, r } = await seeded();
  await r.contextFor(['m2']);
  assert.match(ctxOf(r, 'm2').line, /after a note$/);
  await p.db.deleteMoments(['m1']);
  await r.refresh();
  assert.equal(ctxOf(r, 'm2'), undefined, 'its cached line named the capture that is gone');
  await r.contextFor(['m2']);
  assert.doesNotMatch(ctxOf(r, 'm2').line, /after a/);
  assert.equal(ctxOf(r, 'm4'), undefined, 'a walk-mate not asked about stays unread');
});
