import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGallery } from '../../gallery/shell';
import { DEFAULT_VIEW } from '../../gallery/view';
import { fakePorts } from '../fakes';
import { at, walk } from './fixtures';
import type { Moment } from '../../types';

// Media gallery (specs/media-gallery): the gallery's shell over fakePorts().

const moment = (id: string, t: number, o: Partial<Moment> = {}): Moment => ({
  id, walk_id: null, t, lat: null, lon: null, segment_id: null,
  pieces: [{ id, moment_id: id, t, kind: 'photo', file_path: `${id}.jpg`, body: null }], ...o,
});

test('MG9: the filter and the zoom are back to All Items and Days on a new open', () => {
  const g = createGallery(fakePorts());
  g.opened(0);
  g.setShow('video');
  g.setZoom('years');
  g.opened(0);
  assert.equal(g.store.get().show, 'video', 'Memories and back to Media is the same open: the choice holds');
  assert.equal(g.store.get().zoom, 'years');
  g.opened(1);
  assert.equal(g.store.get().show, 'all', 'the app went elsewhere: a new open');
  assert.equal(g.store.get().zoom, 'days');
});

test('MG14: a load reads what is new; a patch shows at once', async () => {
  const p = fakePorts();
  const g = createGallery(p);
  await p.db.addMoment(moment('a', at(2026, 11, 1)));
  await g.load();
  assert.deepEqual(g.store.get().moments.map((m) => m.id), ['a']);
  await p.db.createWalk(walk('w', at(2026, 11, 2, 8)));
  await p.db.addMoment(moment('b', at(2026, 11, 2, 9), { walk_id: 'w' }));
  await g.load();
  assert.deepEqual(g.store.get().moments.map((m) => m.id).sort(), ['a', 'b'], 'kept while Media was elsewhere, read on the next show');
  assert.deepEqual(g.store.get().walks.map((w) => w.id), ['w']);
  g.patch('b', { thumb_path: 'b.edited.thumb.jpg', edit: { rotate: 90 } as never });
  const b = g.store.get().moments.find((m) => m.id === 'b')!;
  assert.equal(b.thumb_path, 'b.edited.thumb.jpg', 'the face shows the edit at once');
  assert.equal(b.pieces[0].thumb_path, 'b.edited.thumb.jpg');
  // A failed read keeps what was shown.
  p.db.failNext('momentsBetween');
  await g.load();
  assert.equal(g.store.get().status, 'ready');
  assert.equal(g.store.get().moments.length, 2);
});

test('MG14: an older, slower read never overwrites a newer one', async () => {
  const p = fakePorts();
  const g = createGallery(p);
  await p.db.addMoment(moment('a', 1));
  const first = g.load();
  await p.db.addMoment(moment('b', 2));
  const second = g.load();
  await Promise.all([second, first]);
  assert.equal(g.store.get().moments.length, 2);
});

test('MG22: sort, size and shape are kept, and a bad saved value falls back to the default', async () => {
  const p = fakePorts();
  const g = createGallery(p);
  await g.loadView();
  assert.deepEqual(g.store.get().view, DEFAULT_VIEW);
  await g.setView({ order: 'oldest' });
  await g.setView({ size: 2, shape: 'aspect' });
  const again = createGallery(p);
  await again.loadView();
  assert.deepEqual(again.store.get().view, { order: 'oldest', size: 2, shape: 'aspect' }, 'as they were, after a relaunch');
  await p.db.setMeta('gallery_view', '{"order":"sideways","size":9}');
  await again.loadView();
  assert.deepEqual(again.store.get().view, DEFAULT_VIEW);
});

test("MG6: a loose moment's street is read once, from the segments near its fix", async () => {
  const p = fakePorts();
  const g = createGallery(p);
  await p.db.putSegments([{ id: 's1', name: 'Hope Street', kind_detail: 'residential', length_m: 100, geometry: [[[-9.1400, 38.7100], [-9.1390, 38.7100]]], build: 'b' }]);
  await p.db.addMoment(moment('near', 1, { lat: 38.71001, lon: -9.1395 }));
  await p.db.addMoment(moment('nofix', 2));
  await g.load();
  await g.streetsFor(['near', 'nofix']);
  assert.deepEqual(g.store.get().streets, { near: 'Hope Street', nofix: null });
  const segmentReads = () => p.log.entries.filter((e) => e.call.includes('getSegmentsIn')).length;
  assert.equal(segmentReads(), 1, 'one read for the moment with a fix, none for the one without');
  await g.streetsFor(['near']);
  assert.equal(segmentReads(), 1, 'read once');
});

test('MG6: a failed street read is asked again next time', async () => {
  const p = fakePorts();
  const g = createGallery(p);
  await p.db.addMoment(moment('m', 1, { lat: 38.71, lon: -9.14 }));
  await g.load();
  p.db.failNext('getSegmentsIn');
  await g.streetsFor(['m']);
  assert.equal('m' in g.store.get().streets, false, 'never "no street" on a failure');
  await g.streetsFor(['m']);
  assert.equal(g.store.get().streets.m, null);
});

