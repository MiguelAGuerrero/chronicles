import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Faced, facedAll, facedAt, facedOf, isFacePiece, momentOf } from '../../moment';
import { createReady } from '../../ready/shell';
import { createResurface } from '../../resurface/shell';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';

// Saving a note with its type (specs/note-types, NY7, NY8, NY15): text and type go together, as one write.

const walk: Walk = { id: 'w1', started_at: 1_000_000, ended_at: 2_000_000, title: null, epilogue: null, open: false, area: null, snapped_build: null };
const note = (id: string, extra: Partial<Faced> = {}): Faced => facedOf({ id, walk_id: 'w1', t: 1_500_000, lat: null, lon: null, kind: 'text', file_path: null, body: 'first', segment_id: null, ...extra });

async function seeded(extra: Partial<Faced> = {}) {
  const p = fakePorts({ now: 3_000_000 });
  await p.db.createWalk(walk);
  await p.db.addMoment(momentOf(note('n1', extra)));
  const r = createResurface(p);
  await r.load();
  return { p, r, c: r.store.get().moments.find((m) => m.id === 'n1')!.capture };
}
const stored = async (p: Awaited<ReturnType<typeof seeded>>['p']) => (await p.db.getMomentsByIds(['n1']).then(facedAll))[0];

test('NY7: saving an edited note stores its text and its type together, and shows both at once', async () => {
  const { p, r, c } = await seeded();
  await r.saveNote(c, 'second thought', 'idea');
  const s = await stored(p);
  assert.equal(s.body, 'second thought');
  assert.equal(s.note_type, 'idea');
  assert.equal(r.store.get().moments.find((m) => m.id === 'n1')!.capture.note_type, 'idea');
});

test('NY7: a failed save leaves the text and the type as they were', async () => {
  const { p, r, c } = await seeded({ note_type: 'question' });
  p.db.failNext('updatePiece');
  await assert.rejects(r.saveNote(c, 'lost', 'sad'));
  const s = await stored(p);
  assert.equal(s.body, 'first');
  assert.equal(s.note_type, 'question');
});

test('NY8: saving with the type left alone keeps it, and "No type" (null) clears it', async () => {
  const { p, r, c } = await seeded({ note_type: 'like' });
  await r.saveNote(c, 'edited words');
  assert.equal((await stored(p)).note_type, 'like');
  await r.saveNote(c, 'edited again', null);
  assert.equal((await stored(p)).note_type ?? null, null);
});

test('NY7: the ready screen\'s note save writes the type with the text', async () => {
  const p = fakePorts({ now: 3_000_000 });
  await p.db.createWalk(walk);
  await p.db.addMoment(momentOf(note('n1')));
  await createReady(p).saveNote('n1', 'new', 'emphasis');
  const s = (await p.db.getMomentsByIds(['n1']).then(facedAll))[0];
  assert.equal(s.body, 'new');
  assert.equal(s.note_type, 'emphasis');
});

test('note-types audit 1: a note typed in a stacked moment changes its own piece and never the moment\'s face on screen', async () => {
  const p = fakePorts({ now: 3_000_000 });
  await p.db.createWalk(walk);
  await p.db.addMoment({
    id: 'm1', walk_id: 'w1', t: 1_500_000, lat: null, lon: null, segment_id: null,
    pieces: [
      { id: 'm1', moment_id: 'm1', t: 1_500_000, kind: 'photo', file_path: 'walks/w1/m1.jpg', body: null },
      { id: 'b', moment_id: 'm1', t: 1_500_100, kind: 'text', file_path: null, body: 'second' },
    ],
  });
  const r = createResurface(p);
  await r.load();
  const c = r.store.get().moments.find((m) => m.id === 'm1')!.capture;
  assert.equal(c.kind, 'photo', 'the face is the photo');
  await r.saveNote(facedAt(c, 'b'), 'second, edited', 'idea');
  const [stored] = await p.db.getMomentsByIds(['m1']);
  assert.equal(stored.pieces.find((x) => x.id === 'b')!.note_type, 'idea', 'the note piece is typed');
  assert.equal(stored.pieces.find((x) => x.id === 'm1')!.note_type ?? null, null, 'the photo is not');
  const shown = r.store.get().moments.find((m) => m.id === 'm1')!.capture;
  assert.equal(shown.note_type ?? null, null, 'the face on screen takes no type');
  assert.equal(shown.body, null, 'nor the note\'s words');
  assert.equal(isFacePiece(facedAt(c, 'b')), false);
  assert.equal(isFacePiece(c), true);
});
