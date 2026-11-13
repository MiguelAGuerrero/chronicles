/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changed, openSession, step, TOOLS, type Session, type SessionEvent } from '../../editSession';
import { EDIT_OFFER_MS, offerEdit, offerLeft, offerLive } from '../../editOffer';
import { MAX_STROKES, serializeEdit, type MediaEdit, type Stroke } from '../../mediaEdit';

// Media editing (ME2, ME3, ME10, ME14, ME23), written from the criteria before the code.

const line = (x = 0.1): Stroke => ({ tool: 'pen', color: 'black', w: 0.01, pts: [x, 0.1, x + 0.2, 0.2] });
const run = (s: Session, ...events: SessionEvent[]) => {
  let state = s;
  let effect = null as ReturnType<typeof step>['effect'];
  for (const e of events) ({ state, effect } = step(state, e));
  return { state, effect };
};
const fresh = (o: { edit?: MediaEdit | null; caption?: string | null; caption_y?: number | null } = {}) =>
  openSession('photo', { edit: o.edit ?? null, caption: o.caption ?? null, caption_y: o.caption_y ?? null });

test('ME2: done with no change writes nothing', () => {
  const { effect } = run(fresh({ caption: 'Mural', caption_y: 0.4 }), { type: 'tool', tool: 'filter' }, { type: 'done' });
  assert.deepEqual(effect, { type: 'close' });
});

test('ME2: done saves every change at once', () => {
  const { effect } = run(
    fresh(),
    { type: 'rotate' },
    { type: 'filter', id: 'mono' },
    { type: 'stroke', stroke: line() },
    { type: 'caption', text: '  Mural  ', y: 0.3 },
    { type: 'done' },
  );
  assert.equal(effect?.type, 'save');
  if (effect?.type !== 'save') return;
  assert.equal(effect.saved.edit?.rotate, 90);
  assert.equal(effect.saved.edit?.filter, 'mono');
  assert.equal(effect.saved.edit?.strokes.length, 1);
  assert.equal(effect.saved.caption, 'Mural');
  assert.equal(effect.saved.caption_y, 0.3);
});

test('ME2: close with changes asks first; keep editing returns; discard closes', () => {
  const asked = run(fresh(), { type: 'filter', id: 'warm' }, { type: 'close' });
  assert.equal(asked.state.confirming, true);
  assert.equal(asked.effect, null);
  const kept = run(asked.state, { type: 'keepEditing' });
  assert.equal(kept.state.confirming, false);
  assert.equal(kept.state.edit.filter, 'warm');
  assert.deepEqual(run(asked.state, { type: 'discard' }).effect, { type: 'close' });
});

test('ME2: close with none closes at once', () => {
  const { state, effect } = run(fresh(), { type: 'filter', id: 'warm' }, { type: 'filter', id: 'original' }, { type: 'close' });
  assert.equal(state.confirming, false);
  assert.deepEqual(effect, { type: 'close' });
});

test('ME3: the editor opens on the current edits', () => {
  const edit: MediaEdit = { v: 1, rotate: 180, crop: null, filter: 'noir', strokes: [line()], trim: null };
  const s = fresh({ edit, caption: 'Hi', caption_y: 0.2 });
  assert.equal(s.edit.filter, 'noir');
  assert.equal(s.edit.strokes.length, 1);
  assert.equal(s.caption, 'Hi');
  assert.equal(changed(s), false);
});

test('ME3: revert clears every edit and the caption, saved on Done', () => {
  const edit: MediaEdit = { v: 1, rotate: 90, crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, filter: 'sepia', strokes: [line()], trim: null };
  const { state, effect } = run(fresh({ edit, caption: 'Hi', caption_y: 0.2 }), { type: 'revert' }, { type: 'done' });
  assert.equal(serializeEdit(state.edit), null);
  assert.deepEqual(effect, { type: 'save', saved: { edit: null, caption: null, caption_y: null } });
});

test('ME10: undo and redo step through lines drawn and erased', () => {
  let { state } = run(fresh(), { type: 'stroke', stroke: line(0.1) }, { type: 'stroke', stroke: line(0.5) });
  assert.equal(state.edit.strokes.length, 2);
  ({ state } = run(state, { type: 'erase', indexes: [0] }));
  assert.deepEqual(state.edit.strokes.map((s) => s.pts[0]), [0.5]);
  ({ state } = run(state, { type: 'undo' }));
  assert.equal(state.edit.strokes.length, 2);
  ({ state } = run(state, { type: 'undo' }));
  assert.equal(state.edit.strokes.length, 1);
  ({ state } = run(state, { type: 'redo' }));
  assert.equal(state.edit.strokes.length, 2);
  // A new line clears what could be redone.
  ({ state } = run(state, { type: 'undo' }, { type: 'stroke', stroke: line(0.7) }, { type: 'redo' }));
  assert.deepEqual(state.edit.strokes.map((s) => s.pts[0]), [0.1, 0.7]);
  // Nothing to undo is nothing.
  const none = run(fresh(), { type: 'undo' });
  assert.equal(none.state.edit.strokes.length, 0);
});

test('ME10: the eraser removes a whole line it touches, and erasing nothing changes nothing', () => {
  const { state } = run(fresh(), { type: 'stroke', stroke: line() }, { type: 'erase', indexes: [] });
  assert.equal(state.edit.strokes.length, 1);
  assert.equal(state.past.length, 1, 'an empty erase is not a step');
});

test('ME10: Black pen first; tapping the selected pen again opens its thicknesses', () => {
  let { state } = run(fresh());
  assert.equal(state.pen.tool, 'pen');
  assert.equal(state.pen.color, 'black');
  assert.equal(state.pen.sizesOpen, false);
  ({ state } = run(state, { type: 'penTool', tool: 'pen' }));
  assert.equal(state.pen.sizesOpen, true);
  ({ state } = run(state, { type: 'penSize', size: 2 }));
  assert.equal(state.pen.size.pen, 2);
  assert.equal(state.pen.sizesOpen, false);
  ({ state } = run(state, { type: 'penTool', tool: 'marker' }));
  assert.equal(state.pen.tool, 'marker');
  assert.equal(state.pen.sizesOpen, false);
  assert.equal(state.pen.size.marker, 1, 'each tool keeps its own thickness');
});

test('ME11: no more than 50 lines; Draw says so', () => {
  let { state } = run(fresh());
  for (let i = 0; i < MAX_STROKES + 3; i++) ({ state } = run(state, { type: 'stroke', stroke: line() }));
  assert.equal(state.edit.strokes.length, MAX_STROKES);
  assert.equal(state.full, true);
  ({ state } = run(state, { type: 'undo' }));
  assert.equal(state.full, false);
});

test('ME14: a trim of the whole clip is none; a trim is kept inside the clip', () => {
  const v = openSession('video', { edit: null, caption: null, caption_y: null });
  let { state } = run(v, { type: 'trim', start: 0, end: 8000, duration: 8000 });
  assert.equal(state.edit.trim, null);
  ({ state } = run(state, { type: 'trim', start: 7600, end: 7800, duration: 8000 }));
  assert.deepEqual(state.edit.trim, { start_ms: 7000, end_ms: 8000 });
});

test('ME6: a whole-picture crop is none; rotating keeps the crop and frees the aspect', () => {
  let { state } = run(fresh(), { type: 'crop', crop: { x: 0, y: 0, w: 1, h: 1 } });
  assert.equal(state.edit.crop, null);
  ({ state } = run(state, { type: 'aspect', aspect: 'square', W: 400, H: 300 }));
  assert.ok(state.edit.crop);
  assert.equal(state.aspect, 'square');
  const crop = state.edit.crop;
  ({ state } = run(state, { type: 'rotate' }));
  assert.deepEqual(state.edit.crop, crop);
  assert.equal(state.aspect, 'free');
});

test('ME23: the offer lasts 6 s and a new capture replaces it', () => {
  assert.equal(EDIT_OFFER_MS, 6000);
  const a = offerEdit({ id: 'a', kind: 'photo' }, 1000);
  assert.ok(offerLive(a, 6999));
  assert.ok(!offerLive(a, 7000));
  assert.equal(offerLeft(a, 4000), 3000);
  const b = offerEdit({ id: 'b', kind: 'video' }, 3000);
  assert.equal(b.id, 'b');
  assert.equal(b.kind, 'video');
  assert.ok(offerLive(b, 8999));
  assert.ok(!offerLive(null, 0));
});

// Voice trim (VT2, VT4, VT5, VT9), written from the criteria before the code.
const memo = (edit: MediaEdit | null = null) => openSession('voice', { edit, caption: null, caption_y: null });
const MEMO_MS = 58_000;
const trimTo = (start: number, end: number, duration = MEMO_MS): SessionEvent => ({ type: 'trim', start, end, duration });

test('VT2: a voice memo\u2019s editor opens on Trim with the whole memo kept', () => {
  const s = memo();
  assert.equal(s.tool, 'trim');
  assert.equal(s.edit.trim, null);
  assert.deepEqual(TOOLS.voice, ['trim']);
});

test('VT2: the trim keeps at least a second, and a memo under a second keeps all of it', () => {
  assert.deepEqual(run(memo(), trimTo(2000, 41_000)).state.edit.trim, { start_ms: 2000, end_ms: 41_000 });
  assert.deepEqual(run(memo(), trimTo(2000, 2300)).state.edit.trim, { start_ms: 2000, end_ms: 3000 });
  assert.equal(run(memo(), trimTo(100, 700, 800)).state.edit.trim, null);
});

test('VT4: done saves the trim; close with a change asks; close or done with none writes nothing; revert clears it', () => {
  const done = run(memo(), trimTo(2000, 41_000), { type: 'done' }).effect;
  assert.equal(done?.type, 'save');
  if (done?.type === 'save') assert.deepEqual(done.saved.edit?.trim, { start_ms: 2000, end_ms: 41_000 });
  assert.equal(run(memo(), trimTo(2000, 41_000), { type: 'close' }).state.confirming, true);
  assert.deepEqual(run(memo(), { type: 'close' }).effect, { type: 'close' });
  assert.deepEqual(run(memo(), { type: 'done' }).effect, { type: 'close' });
  const reverted = run(memo(), trimTo(2000, 41_000), { type: 'revert' });
  assert.equal(reverted.state.edit.trim, null);
  assert.equal(changed(reverted.state), false);
});

test('VT5: a trim keeping the whole memo is stored as none, and a saved trim opens again as it was', () => {
  assert.equal(run(memo(), trimTo(0, MEMO_MS)).state.edit.trim, null);
  const saved = run(memo(), trimTo(2000, 41_000), { type: 'done' }).effect;
  assert.equal(saved?.type, 'save');
  if (saved?.type !== 'save') return;
  const again = memo(JSON.parse(serializeEdit(saved.saved.edit) ?? 'null'));
  assert.deepEqual(again.edit.trim, { start_ms: 2000, end_ms: 41_000 });
  // Reverting a stored trim and pressing Done leaves nothing stored: the whole memo is back.
  const cleared = run(again, { type: 'revert' }, { type: 'done' }).effect;
  assert.equal(cleared?.type, 'save');
  if (cleared?.type === 'save') assert.equal(cleared.saved.edit, null);
});

test('VT9: a photo\u2019s and a video\u2019s tools and trim rules are as before', () => {
  assert.deepEqual(TOOLS.photo, ['crop', 'filter', 'draw', 'text']);
  assert.deepEqual(TOOLS.video, ['crop', 'draw', 'text', 'trim']);
  assert.equal(run(fresh(), trimTo(2000, 41_000)).state.edit.trim, null, 'a photo has no trim');
  assert.equal(openSession('photo', { edit: null, caption: null, caption_y: null }, 'trim').tool, 'crop');
  assert.deepEqual(run(openSession('video', { edit: null, caption: null, caption_y: null }), trimTo(2000, 41_000)).state.edit.trim, { start_ms: 2000, end_ms: 41_000 });
});
