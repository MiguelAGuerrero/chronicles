/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createResurface } from '../../resurface/shell';
import type { Capture, StreetSegment, Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at, NOW } from './fixtures';

// The audit of memories-context (Nov 5): one regression test per accepted finding, "memories-context audit N".
type Any = any;

const MIN = 60_000;
const START = at(2026, 10, 20) - 5 * 3600_000;
const walk: Walk = { id: 'w1', started_at: START, ended_at: START + 3600_000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
const seg = (id: string, name: string | null, lon: number, lat: number): StreetSegment => ({ id, name, kind_detail: 'residential', length_m: 100, geometry: [[[lon - 0.001, lat], [lon + 0.001, lat]]], build: 'b' });
const cap = (id: string, minutesIn: number, o: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w1', t: START + minutesIn * MIN, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body: `harbor ${id}`, segment_id: 's1', ...o,
});
async function seeded(extra: Capture[] = []) {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  await p.db.putSegments([seg('s1', 'Hope Street', -71.4, 41.8)]);
  for (const c of [cap('m1', 5), cap('m2', 12), cap('m3', 40), ...extra]) await p.db.addCapture(c);
  const r = createResurface(p) as Any;
  await r.load();
  return { p, r };
}
const ctx = (r: Any, id: string) => r.store.get().context?.[id];
const gate = () => {
  let open!: () => void;
  const wait = new Promise<void>((res) => { open = res; });
  return { wait, open };
};

test('memories-context audit 1: a getPauses that fails once is asked again on the next contextFor', async () => {
  const { p, r } = await seeded();
  p.db.failNext('getPauses');
  await r.contextFor(['m1']);
  assert.equal(ctx(r, 'm1').state, 'failed');
  await r.contextFor(['m1']);
  assert.equal(ctx(r, 'm1').state, 'done', 'the rejected pause read was not kept for the whole open');
});

test('memories-context audit 2: a refresh clears failed reads and counts a version, so a mounted card asks again', async () => {
  const { p, r } = await seeded();
  p.db.failNext('getSegmentsIn');
  await r.contextFor(['m1']);
  assert.equal(ctx(r, 'm1').state, 'failed');
  const before = r.store.get().version;
  await r.refresh();
  assert.equal(ctx(r, 'm1'), undefined, 'the failed entry is dropped');
  assert.equal(r.store.get().version, before + 1);
  await r.contextFor(['m1']);
  assert.equal(ctx(r, 'm1').state, 'done');
});

test('memories-context audit 4: a street 39 m east of a fix at 60 degrees north is found', async () => {
  const p = fakePorts({ now: NOW });
  const lat = 60;
  const dLon = 39 / (111_320 * Math.cos((lat * Math.PI) / 180));
  await p.db.createWalk(walk);
  await p.db.putSegments([{ id: 'ns', name: 'Nordic Street', kind_detail: 'residential', length_m: 200, geometry: [[[-71.4 + dLon, lat - 0.001], [-71.4 + dLon, lat + 0.001]]], build: 'b' }]);
  await p.db.addCapture(cap('n1', 5, { lat, lon: -71.4, segment_id: null }));
  const r = createResurface(p) as Any;
  await r.load();
  await r.contextFor(['n1']);
  assert.match(ctx(r, 'n1').line, /Nordic Street/);
});

test('memories-context audit 5: Forget can be undone, lists and renames both', async () => {
  const { r } = await seeded();
  await r.hide('m1');
  await r.rename('harbor', 'The harbor');
  const forgot = await r.forget();
  assert.deepEqual([r.store.get().prefs.hidden, r.store.get().prefs.renames], [[], {}]);
  await r.undo(forgot);
  assert.deepEqual(r.store.get().prefs.hidden, ['m1']);
  assert.equal(r.store.get().prefs.renames.harbor, 'The harbor');
});

test('memories-context audit 6: a choice made while a refresh is reading is not overwritten', async () => {
  const { p, r } = await seeded();
  const g = gate();
  const real = p.db.capturesBetween.bind(p.db);
  p.db.capturesBetween = async (a: number, b: number) => { const rows = await real(a, b); await g.wait; return rows; };
  const refreshing = r.refresh();
  await new Promise((res) => setTimeout(res, 0));
  await r.setOff(true);
  g.open();
  await refreshing;
  assert.equal(r.store.get().prefs.off, true, 'the switch the owner flipped stays');
});

test('memories-context audit 7: Show less like this keeps the word as the owner wrote it', async () => {
  const p = fakePorts({ now: NOW });
  await p.db.createWalk(walk);
  await p.db.addCapture(cap('c1', 5, { body: 'Cookies and bakeries on the corner' }));
  const r = createResurface(p) as Any;
  await r.load();
  const change = await r.less('c1');
  assert.equal(change.after.shown.cooky, 'cookies');
  assert.equal(change.after.shown.bakery, 'bakeries');
  const { hiddenItems } = (await import(`../../resurface/${'hidden'}`)) as Any;
  const words = hiddenItems(r.store.get().prefs, r.store.get().moments).words.map((w: Any) => w.shown);
  assert.deepEqual(words.sort(), ['bakeries', 'corner', 'cookies'].filter((w) => words.includes(w)).sort());
  assert.ok(words.includes('cookies') && !words.includes('cooky'));
  const { fewerWord } = (await import(`../../resurface/${'copy'}`)) as Any;
  assert.equal(fewerWord(['cooky'], { cooky: 'cookies' }), 'cookies');
  await r.restoreWord('cooky');
  assert.equal(r.store.get().prefs.shown.cooky, undefined, 'restoring a word forgets how it was written');
});

test('memories-context audit 8: reads for many mounting cards run one at a time', async () => {
  const { p, r } = await seeded();
  let live = 0;
  let max = 0;
  const g = gate();
  const real = p.db.getSegmentsIn.bind(p.db);
  p.db.getSegmentsIn = async (b: [number, number, number, number]) => { live++; max = Math.max(max, live); await g.wait; live--; return real(b); };
  const reading = r.contextFor(['m1', 'm2', 'm3']);
  assert.equal(ctx(r, 'm3').state, 'pending', 'all three are pending at once');
  g.open();
  await reading;
  assert.equal(max, 1, 'never two reads overlapping');
  assert.deepEqual(['m1', 'm2', 'm3'].map((id) => ctx(r, id).state), ['done', 'done', 'done']);
});

test('memories-context audit 9: a delete in flight never lets a neighbour name the capture that is gone', async () => {
  const { p, r } = await seeded();
  await r.contextFor(['m3'], new Set(['m2']));
  assert.doesNotMatch(ctx(r, 'm3').line, /just after|after a/, 'm2 is being deleted: it is not "just before"');
  const g = gate();
  const real = p.db.getSegmentsIn.bind(p.db);
  p.db.getSegmentsIn = async (b: [number, number, number, number]) => { await g.wait; return real(b); };
  const reading = r.contextFor(['m2']);
  await p.db.deleteCaptures(['m1']);
  await r.refresh();
  g.open();
  await reading;
  const line = ctx(r, 'm2')?.line;
  assert.ok(line === undefined || !/after a note/.test(line), 'a read that began before the delete did not write m1 back in');
});

test('memories-context audit 14: a refresh drops the lines of a walk whose area changed', async () => {
  const { p, r } = await seeded();
  await r.contextFor(['m1']);
  assert.match(ctx(r, 'm1').line, /Fox Point/);
  await p.db.updateWalk('w1', { area: 'College Hill' });
  await r.refresh();
  assert.equal(ctx(r, 'm1'), undefined);
  await r.contextFor(['m1']);
  assert.match(ctx(r, 'm1').line, /College Hill/);
});

test('memories-context audit 10: the night hours belong to the evening before; ten days ago names the weekday', async () => {
  const { dayPartLine } = (await import(`../../resurface/${'context'}`)) as Any;
  assert.equal(dayPartLine(new Date(2026, 10, 5, 2).getTime(), NOW), 'Late last night', '2 am this morning is not "Tonight"');
  assert.equal(dayPartLine(new Date(2026, 10, 4, 1, 30).getTime(), NOW), 'Late Tuesday night', '1:30 Wednesday is Tuesday night to the walker');
  assert.equal(dayPartLine(new Date(2026, 10, 5, 22).getTime(), NOW), 'Tonight');
  assert.equal(dayPartLine(new Date(2026, 9, 25, 9).getTime(), NOW), 'Last Sunday morning', 'ten days ago names its weekday');
});

test('memories-context audit 17: a street reached only by nearness reads "Near", a snapped one bare', async () => {
  const c = (await import(`../../resurface/${'context'}`)) as Any;
  const hope = seg('s1', 'Hope Street', -71.4, 41.8);
  const fix: [number, number] = [-71.4, 41.8 + 20 / 111_320];
  assert.deepEqual(c.streetAt(fix, [hope], 's1'), { name: 'Hope Street', near: false });
  assert.deepEqual(c.streetAt(fix, [hope], null), { name: 'Hope Street', near: true });
  assert.equal(c.streetAt([-71.4, 41.9], [hope], 's1'), null);
  assert.equal(c.placeLine({ street: 'Hope Street', near: true, town: 'Fox Point' }), 'Near Hope Street, Fox Point');
  assert.equal(c.placeLine({ street: 'Hope Street', near: false, town: 'Fox Point' }), 'Hope Street, Fox Point');
  const t = new Date(2026, 10, 3, 19).getTime();
  const base = { street: 'Hope Street', town: 'Fox Point', t, now: NOW, walkedMs: null, prev: null };
  assert.match(c.arrivalLine({ ...base, streetNear: true }), /^Near Hope Street, Fox Point · /, 'the whole line says Near too');
  assert.match(c.arrivalLine({ ...base, streetNear: false }), /^Hope Street, Fox Point · /);
});

test('memories-context audit 20: "just after" only within two walked minutes, "after" within ten', async () => {
  const { justAfter } = (await import(`../../resurface/${'context'}`)) as Any;
  assert.equal(justAfter({ kind: 'photo', walkedGapMs: 2 * MIN }), 'just after a photo');
  assert.equal(justAfter({ kind: 'photo', walkedGapMs: 2 * MIN + 1000 }), 'after a photo');
  assert.equal(justAfter({ kind: 'text', walkedGapMs: 10 * MIN }), 'after a note');
  assert.equal(justAfter({ kind: 'text', walkedGapMs: 10 * MIN + 1000 }), null);
});

test('memories-context audit 5, 13, 24: the Forget text names thread names, hints state facts, the sub-line names what Lately holds', async () => {
  const c = (await import(`../../resurface/${'copy'}`)) as Any;
  assert.match(c.FORGET_CONFIRM, /thread names/);
  assert.equal(c.FORGOT_TOAST, 'Choices forgotten.');
  assert.equal(c.NEWEST_FIRST, 'Moments you kept, newest first');
  assert.deepEqual([c.HINT_HIDDEN, c.HINT_ON, c.HINT_OFF, c.HINT_FORGET, c.NOTHING_HIDDEN], ['What you set aside', 'On', 'Off', 'Clears Hidden and thread names', 'Nothing is hidden.']);
  for (const s of [c.HINT_HIDDEN, c.HINT_ON, c.HINT_OFF, c.HINT_FORGET, c.NOTHING_HIDDEN]) assert.ok(!/\d|please|try/i.test(s), s);
});

test('memories-context audit 3: the foot line names the walk without its town', async () => {
  const { fromLine } = (await import(`../../resurface/${'views'}`)) as Any;
  const w = { ...walk, started_at: new Date(2026, 9, 20, 19).getTime() };
  assert.equal(fromLine(w), 'From Tuesday evening walk', 'no town: the arrival line carries it');
  assert.equal(fromLine({ ...w, title: 'Sunday by the river' }), 'From Sunday by the river');
});
