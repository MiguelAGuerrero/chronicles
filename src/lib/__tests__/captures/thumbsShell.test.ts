import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createThumbs } from '../../thumbs/shell';
import type { Moment } from '../../types';
import { fakePorts } from '../fakes';

// Video thumbnails (specs/video-thumbnails): the shared thumbs shell over fakePorts().

const video = (id: string, o: Partial<Moment['pieces'][number]> = {}): Moment => ({
  id, walk_id: null, t: 1, lat: null, lon: null, segment_id: null,
  pieces: [{ id, moment_id: id, t: 1, kind: 'video', file_path: `${id}.mp4`, body: '4000', ...o }],
});

test("VT2: an older video's copy is made once, read fresh first", async () => {
  const p = fakePorts();
  let made = 0;
  const t = createThumbs(p, { makeThumb: async (c) => (made++, `${c.piece_id}.thumb.jpg`), remove: async () => {} });
  await p.db.addMoment(video('old'));
  await p.db.addMoment(video('done', { thumb_path: 'done.thumb.jpg' }));
  await Promise.all([t.ask('old', 'old'), t.ask('old', 'old'), t.ask('done', 'done')]);
  assert.equal(made, 1, 'once, and never for a video that has its still');
  assert.deepEqual(t.store.get().made, { old: { ref: 'old.thumb.jpg', replaced: null }, done: { ref: 'done.thumb.jpg', replaced: null } }, 'a card shows it at once, and one stored since its row was read');
  assert.equal((await p.db.getMomentsByIds(['old']))[0].pieces[0].thumb_path, 'old.thumb.jpg', 'stored on the piece');
  await t.ask('old', 'old');
  assert.equal(made, 1, 'never made again');
});

test('VT2: a still that cannot be made now is asked again next time', async () => {
  const p = fakePorts();
  let tries = 0;
  const t = createThumbs(p, { makeThumb: async () => (++tries === 1 ? null : 'v.thumb.jpg'), remove: async () => {} });
  await p.db.addMoment(video('v'));
  await t.ask('v', 'v');
  assert.equal(t.store.get().made.v, undefined);
  await t.ask('v', 'v');
  assert.equal(t.store.get().made.v?.ref, 'v.thumb.jpg');
});

test('VT9: copies are made one at a time', async () => {
  const p = fakePorts();
  let running = 0;
  let most = 0;
  const t = createThumbs(p, {
    makeThumb: async (c) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return `${c.piece_id}.thumb.jpg`;
    },
    remove: async () => {},
  });
  for (const id of ['a', 'b', 'c']) await p.db.addMoment(video(id));
  await Promise.all(['a', 'b', 'c'].map((id) => t.ask(id, id)));
  assert.equal(most, 1);
  assert.equal(Object.keys(t.store.get().made).length, 3);
});

const removed = () => {
  const gone: string[] = [];
  return { gone, remove: async (refs: string[]) => void gone.push(...refs) };
};

test('video-thumbnails audit 2: a still made from a stale row stands down when the piece changed meanwhile', async () => {
  const p = fakePorts();
  let release!: () => void;
  const r = removed();
  const t = createThumbs(p, { makeThumb: (c) => new Promise((ok) => (release = () => ok(`${c.piece_id}.thumb.jpg`))), remove: r.remove });
  await p.db.addMoment(video('v'));
  const asking = t.ask('v', 'v');
  await new Promise((ok) => setTimeout(ok, 5));
  // An edit's still lands while the first still is being made.
  await p.db.updatePiece('v', { thumb_path: 'v.thumb.edited.jpg', edit: { v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: { start_ms: 1000, end_ms: 3000 } } });
  release();
  await asking;
  assert.equal((await p.db.getMomentsByIds(['v']))[0].pieces[0].thumb_path, 'v.thumb.edited.jpg', "the edit's still stays");
  assert.equal(t.store.get().made.v, undefined, 'nothing remembered over it');
  assert.deepEqual(r.gone, ['v.thumb.jpg'], 'the stale still made meanwhile is removed');
});

test('video-thumbnails audit 3, 9: an edit replaces the still read fresh, and with no new still drops the old', async () => {
  const p = fakePorts();
  const r = removed();
  let next: string | null = 'v.thumb.trim.jpg';
  const t = createThumbs(p, { makeThumb: async () => next, remove: r.remove });
  await p.db.addMoment(video('v', { thumb_path: 'v.thumb.jpg' }));
  const trim = { v: 1 as const, rotate: 0 as const, crop: null, filter: 'original' as const, strokes: [], trim: { start_ms: 1000, end_ms: 3000 } };
  await t.remake('v', 'v', trim);
  assert.equal((await p.db.getMomentsByIds(['v']))[0].pieces[0].thumb_path, 'v.thumb.trim.jpg');
  assert.deepEqual(t.store.get().made.v, { ref: 'v.thumb.trim.jpg', replaced: 'v.thumb.jpg' });
  assert.deepEqual(r.gone, ['v.thumb.jpg'], 'the old still read fresh goes, even when the screen never knew it (audit 3)');
  // No new still now (a timeout): the old one, from the part cut away, is dropped, never shown (audit 9).
  next = null;
  await t.remake('v', 'v', { ...trim, trim: { start_ms: 2000, end_ms: 3000 } });
  assert.equal((await p.db.getMomentsByIds(['v']))[0].pieces[0].thumb_path ?? null, null);
  assert.deepEqual(t.store.get().made.v, { ref: null, replaced: 'v.thumb.trim.jpg' });
  assert.deepEqual(r.gone, ['v.thumb.jpg', 'v.thumb.trim.jpg']);
});

test('video-thumbnails audit 4: the gallery and Memories make stills on one queue', async () => {
  const { createGallery } = await import('../../gallery/shell');
  assert.equal('thumbFor' in createGallery(fakePorts()), false, 'the gallery makes none of its own');
  const p = fakePorts();
  let running = 0;
  let most = 0;
  const t = createThumbs(p, {
    makeThumb: async (c) => { running++; most = Math.max(most, running); await new Promise((ok) => setTimeout(ok, 5)); running--; return `${c.piece_id}.thumb.x.jpg`; },
    remove: async () => {},
  });
  await p.db.addMoment(video('a'));
  await p.db.addMoment(video('b', { thumb_path: 'b.thumb.jpg' }));
  const trim = { v: 1 as const, rotate: 0 as const, crop: null, filter: 'original' as const, strokes: [], trim: { start_ms: 1000, end_ms: 3000 } };
  await Promise.all([t.ask('a', 'a'), t.remake('b', 'b', trim)]);
  assert.equal(most, 1, 'a first still and an edit\'s still never at once');
});

test('MG11: a photo with no small copy gets one made once, kept, and shown', async () => {
  const p = fakePorts();
  let made = 0;
  const t = createThumbs(p, { makeThumb: async (c) => (made++, `${c.piece_id}.thumb.jpg`), remove: async () => {} });
  const photo = (id: string, thumb_path: string | null = null): Moment => ({ id, walk_id: null, t: 1, lat: null, lon: null, segment_id: null, pieces: [{ id, moment_id: id, t: 1, kind: 'photo', file_path: `${id}.jpg`, body: null, thumb_path }] });
  await p.db.addMoment(photo('a'));
  await p.db.addMoment(photo('b', 'b.thumb.jpg'));
  await Promise.all([t.ask('a', 'a'), t.ask('a', 'a'), t.ask('b', 'b')]);
  assert.equal(made, 1, 'once, and never for a photo that has its copy');
  assert.equal(t.store.get().made.a?.ref, 'a.thumb.jpg');
  assert.equal((await p.db.getMomentsByIds(['a']))[0].pieces[0].thumb_path, 'a.thumb.jpg');
});
