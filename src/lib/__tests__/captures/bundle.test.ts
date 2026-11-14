import { type Faced, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { bundleName, createBundleWriter, extensionOf, type BundleIO } from '../../export/bundle/shell';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at } from '../foxPoint';

// A walk's backup, as a zip (specs/test-gaps, TD5).

const walk: Walk = { id: 'w1', started_at: Date.UTC(2026, 9, 30, 15), ended_at: Date.UTC(2026, 9, 30, 16), title: 'Café Paseo', epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
const cap = (id: string, file_path: string | null, extra: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w1', t: walk.started_at + 1000, kind: file_path ? 'photo' : 'text', file_path, body: file_path ? null : 'a note', segment_id: null, lat: at(0, 0)[1], lon: at(0, 0)[0], ...extra,
});

function memoryIO(files: Record<string, Uint8Array>): BundleIO & { bytes(): Uint8Array } {
  const chunks: Uint8Array[] = [];
  return {
    async readMedia(ref) {
      const f = files[ref];
      if (!f) return null;
      return (async function* () { yield f.subarray(0, 2); yield f.subarray(2); })();
    },
    write: (c) => { chunks.push(c); },
    bytes: () => {
      const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0;
      for (const c of chunks) { out.set(c, o); o += c.length; }
      return out;
    },
  };
}

test('TD5 a walk exports as walk.json and each capture\'s media; a missing file is counted and marked', async () => {
  const p = fakePorts({ now: Date.UTC(2026, 10, 4, 12) });
  await p.db.createWalk(walk);
  await p.db.appendPoints([{ walk_id: 'w1', t: walk.started_at + 500, lon: at(0, 0)[0], lat: at(0, 0)[1], accuracy_m: 6, speed: null, course: null }]);
  await p.db.addMoment(momentOf(cap('photo', 'walks/w1/photo.JPG', { thumb_path: 'walks/w1/photo.thumb.jpg' })));
  await p.db.addMoment(momentOf(cap('gone', 'walks/w1/gone.m4a', { kind: 'voice' })));
  await p.db.addMoment(momentOf(cap('note', null)));
  const io = memoryIO({ 'walks/w1/photo.JPG': new Uint8Array([1, 2, 3, 4, 5]) });
  const r = await createBundleWriter(p).writeWalkBundle('w1', io);
  assert.equal(r.missing, 1);
  assert.equal(r.walk.id, 'w1');
  const zip = unzipSync(io.bytes());
  assert.deepEqual(Object.keys(zip).sort(), ['media/photo.jpg', 'walk.json']);
  assert.deepEqual([...zip['media/photo.jpg']], [1, 2, 3, 4, 5], 'the media, chunks joined in order');
  const json = JSON.parse(strFromU8(zip['walk.json']));
  assert.equal(json.format, 'chronicles-walk');
  assert.equal(json.exported_at, '2026-11-04T12:00:00.000Z', 'from the clock it was given');
  assert.equal(json.trace.length, 1);
  const byId = Object.fromEntries(json.moments.flatMap((m: { pieces: { id: string }[] }) => m.pieces).map((c: { id: string }) => [c.id, c]));
  assert.equal(byId.photo.media, 'media/photo.jpg');
  assert.equal(byId.photo.thumb_path, undefined, 'a photo\'s small copy is never named');
  assert.equal(byId.gone.media_missing, true);
  assert.equal(byId.note.media_missing, false);
});

test('TD5 a walk that isn\'t kept fails with a message; names and extensions', async () => {
  await assert.rejects(createBundleWriter(fakePorts()).writeWalkBundle('nope', memoryIO({})), /could not be found/);
  assert.equal(extensionOf('walks/w1/a.HEIC?x=1'), 'heic');
  assert.equal(extensionOf('walks/w1/noext'), 'bin');
  assert.match(bundleName(walk), /^chronicle-2026-10-30-cafe-paseo\.zip$/);
});

test('MT8: the bundle lists moments with their pieces, each piece\'s media named by its own id', async () => {
  type Piece = { id: string; moment_id: string; t: number; kind: string; file_path: string | null; body: string | null };
  type Planned = { addMoment(m: { id: string; walk_id: string; t: number; lat: number; lon: number; segment_id: null; pieces: Piece[] }): Promise<void> };
  const p = fakePorts({ now: Date.UTC(2026, 10, 4, 12) });
  await p.db.createWalk(walk);
  const t = walk.started_at + 1000;
  await (p.db as unknown as Planned).addMoment({
    id: 'm1', walk_id: 'w1', t, lat: at(0, 0)[1], lon: at(0, 0)[0], segment_id: null,
    pieces: [{ id: 'm1', moment_id: 'm1', t, kind: 'photo', file_path: 'walks/w1/m1.jpg', body: null }],
  });
  const io = memoryIO({ 'walks/w1/m1.jpg': new Uint8Array([7]) });
  await createBundleWriter(p).writeWalkBundle('w1', io);
  const json = JSON.parse(strFromU8(unzipSync(io.bytes())['walk.json']));
  assert.equal(json.version, 2);
  assert.deepEqual(json.moments.map((m: { id: string; pieces: { id: string; moment_id: string; media: string }[] }) => [m.id, m.pieces.map((x) => [x.id, x.moment_id, x.media])]), [['m1', [['m1', 'm1', 'media/m1.jpg']]]]);
});

test('RX32: the bundle keeps a moment\'s reactions with it, and none for a moment with none', async () => {
  const p = fakePorts({ now: Date.UTC(2026, 10, 4, 12) });
  const db = p.db as unknown as { setReaction: (r: unknown) => Promise<void> };
  await p.db.createWalk(walk);
  await p.db.addMoment(momentOf(cap('felt', 'a.jpg')));
  await p.db.addMoment(momentOf(cap('plain', null)));
  await db.setReaction({ moment_id: 'felt', family: 'feeling', reaction: 'happy', set_at: 1 });
  await db.setReaction({ moment_id: 'felt', family: 'thought', reaction: 'idea', set_at: 2 });
  const io = memoryIO({ 'a.jpg': new Uint8Array([1, 2, 3]) });
  await createBundleWriter(p).writeWalkBundle('w1', io);
  const json = JSON.parse(strFromU8(unzipSync(io.bytes())['walk.json']));
  const byId = Object.fromEntries(json.moments.map((m: { id: string }) => [m.id, m]));
  assert.deepEqual(byId.felt.reactions, { feeling: 'happy', thought: 'idea' });
  assert.equal(byId.plain.reactions ?? null, null);
});

test('reactions audit 13: the bundle carries no note_type: the reactions of a moment are its set alone', { todo: 'test first' }, async () => {
  const p = fakePorts({ now: Date.UTC(2026, 10, 4, 12) });
  await p.db.createWalk(walk);
  const m = momentOf(cap('old', null));
  (m.pieces[0] as unknown as Record<string, unknown>).note_type = 'idea';
  await p.db.addMoment(m);
  const io = memoryIO({});
  await createBundleWriter(p).writeWalkBundle('w1', io);
  const json = JSON.parse(strFromU8(unzipSync(io.bytes())['walk.json']));
  assert.equal('note_type' in json.moments[0].pieces[0], false);
});
