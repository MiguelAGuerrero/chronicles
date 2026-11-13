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
  const t = createThumbs(p, { makeThumb: async (c) => (made++, `${c.piece_id}.thumb.jpg`) });
  await p.db.addMoment(video('old'));
  await p.db.addMoment(video('done', { thumb_path: 'done.thumb.jpg' }));
  await Promise.all([t.ask('old', 'old'), t.ask('old', 'old'), t.ask('done', 'done')]);
  assert.equal(made, 1, 'once, and never for a video that has its still');
  assert.deepEqual(t.store.get().made, { old: 'old.thumb.jpg', done: 'done.thumb.jpg' }, 'a card shows it at once');
  assert.equal((await p.db.getMomentsByIds(['old']))[0].pieces[0].thumb_path, 'old.thumb.jpg', 'stored on the piece');
  await t.ask('old', 'old');
  assert.equal(made, 1, 'never made again');
});

test('VT2: a still that cannot be made now is asked again next time', async () => {
  const p = fakePorts();
  let tries = 0;
  const t = createThumbs(p, { makeThumb: async () => (++tries === 1 ? null : 'v.thumb.jpg') });
  await p.db.addMoment(video('v'));
  await t.ask('v', 'v');
  assert.equal(t.store.get().made.v, undefined);
  await t.ask('v', 'v');
  assert.equal(t.store.get().made.v, 'v.thumb.jpg');
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
  });
  for (const id of ['a', 'b', 'c']) await p.db.addMoment(video(id));
  await Promise.all(['a', 'b', 'c'].map((id) => t.ask(id, id)));
  assert.equal(most, 1);
  assert.equal(Object.keys(t.store.get().made).length, 3);
});
