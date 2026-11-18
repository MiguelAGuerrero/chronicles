import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Faced, facedAll, facedAt, facedOf, isFacePiece, momentOf } from '../../moment';
import { createResurface } from '../../resurface/shell';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';

// Saving a note's words names its piece (note-types audit 1, 12, 13). Its moment's reactions are their own records
// (specs/reactions RX28): a note save writes none.

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

test('RX28: a note save writes its words and format only, never a reaction', async () => {
  const { p, r, c } = await seeded();
  await r.saveNote(c, 'second thought');
  const s = await stored(p);
  assert.equal(s.body, 'second thought');
  assert.equal(s.body_format, 'md');
  assert.deepEqual(await p.db.listReactions(), []);
});

test('note-types audit 1: a note saved in a stacked moment changes its own piece and never the moment\'s face on screen', async () => {
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
  await r.saveNote(facedAt(c, 'b'), 'second, edited');
  const [kept] = await p.db.getMomentsByIds(['m1']);
  assert.equal(kept.pieces.find((x) => x.id === 'b')!.body, 'second, edited', 'the note piece has its words');
  assert.equal(kept.pieces.find((x) => x.id === 'm1')!.body, null, 'the photo does not');
  const shown = r.store.get().moments.find((m) => m.id === 'm1')!.capture;
  assert.equal(shown.body, null, 'the face on screen takes none of the note\'s words');
  assert.equal(isFacePiece(facedAt(c, 'b')), false);
  assert.equal(isFacePiece(c), true);
});

test('note-types audit 12, 13: a note saved at a non-face piece reaches its copy in the row\'s pieces, so a reopened stack and a split read it', async () => {
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
  await r.saveNote(facedAt(c, 'b'), 'second, edited');
  const shown = r.store.get().moments.find((m) => m.id === 'm1')!.capture;
  assert.equal(facedAt(shown, 'b').body, 'second, edited', 'the stack reopened reads the new words');
  assert.equal(shown.pieces.find((x) => x.id === 'b')!.body, 'second, edited', 'the copy a split would take');
  assert.equal(shown.body, null, 'the face is still the photo, untouched');
  // A note that is its moment's face updates its own copy too.
  await p.db.addMoment(momentOf(note('n9')));
  await r.load();
  const n = r.store.get().moments.find((m) => m.id === 'n9')!.capture;
  await r.saveNote(n, 'solo, edited');
  assert.equal(r.store.get().moments.find((m) => m.id === 'n9')!.capture.pieces[0].body, 'solo, edited');
});
