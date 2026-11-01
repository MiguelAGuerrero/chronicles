/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THUMB, thumbJob, thumbName, thumbShown, wantsThumb, type ThumbDeps } from '../thumbPlan';

const photo = (o: Partial<{ id: string; walk_id: string | null; kind: string; file_path: string | null; thumb_path: string | null }> = {}) =>
  ({ id: 'abc', walk_id: 'w1', kind: 'photo', file_path: 'walks/w1/abc.jpg', thumb_path: null, ...o });

function fakeDeps(o: { fail?: boolean } = {}) {
  const calls = { loads: [] as { uri: string; max: number }[], released: 0, kept: [] as string[], resolved: 0 };
  const deps: ThumbDeps = {
    resolve: async () => {
      calls.resolved++;
      return 'blob:full';
    },
    render: async (uri, max) => {
      calls.loads.push({ uri, max });
      if (o.fail) throw new Error('undecodable');
      return { uri: 'blob:small', release: () => void calls.released++ };
    },
    keep: async (tmp, folder, name) => {
      calls.kept.push(`${folder}/${name}`);
      return `walks/${folder}/${name}`;
    },
    releaseUri: () => {},
  };
  return { deps, calls };
}

test('thumbnails TH1, audit 2: one bounded decode at 240 px, released after', async () => {
  const { deps, calls } = fakeDeps();
  const got = await thumbJob(photo(), deps);
  assert.equal(got, 'walks/w1/abc.thumb.jpg');
  assert.deepEqual(calls.loads, [{ uri: 'blob:full', max: THUMB.edge }]);
  assert.equal(calls.released, 1);
});

test('thumbnails audit 5: named by the capture, under its walk or moments, whatever the old ref looks like', async () => {
  assert.equal(thumbName(photo({ id: 'x1' })), 'x1.thumb.jpg');
  const { deps, calls } = fakeDeps();
  await thumbJob(photo({ id: 'm9', walk_id: null, file_path: 'data:image/jpeg;base64,AAAA/BBB' }), deps);
  assert.deepEqual(calls.kept, ['moments/m9.thumb.jpg']);
});

test('thumbnails audit 3: a photo that will not decode is marked, so it is never tried again', async () => {
  const { deps } = fakeDeps({ fail: true });
  assert.equal(await thumbJob(photo(), deps), THUMB.none);
  assert.equal(wantsThumb(photo({ thumb_path: THUMB.none })), false);
});

test('thumbnails audit 3: two previews of one photo at once make one copy', async () => {
  const { deps, calls } = fakeDeps();
  const [a, b] = await Promise.all([thumbJob(photo({ id: 'same' }), deps), thumbJob(photo({ id: 'same' }), deps)]);
  assert.equal(a, b);
  assert.equal(calls.loads.length, 1);
});

test('thumbnails TH3: only a photo with a file and no copy wants one', () => {
  assert.equal(wantsThumb(photo()), true);
  assert.equal(wantsThumb(photo({ thumb_path: 'walks/w1/abc.thumb.jpg' })), false);
  assert.equal(wantsThumb(photo({ kind: 'video' })), false);
  assert.equal(wantsThumb(photo({ file_path: null })), false);
});

test('thumbnails TH4, audit 6, 7: what a preview shows', () => {
  assert.equal(thumbShown(photo({ thumb_path: 'walks/w1/abc.thumb.jpg' }), false), 'walks/w1/abc.thumb.jpg');
  assert.equal(thumbShown(photo({ thumb_path: 'walks/w1/abc.thumb.jpg' }), true), 'walks/w1/abc.jpg', 'a missing copy falls back to the photo');
  assert.equal(thumbShown(photo({ thumb_path: THUMB.none }), false), 'walks/w1/abc.jpg', 'undecodable: the photo as before');
  assert.equal(thumbShown(photo(), false), null, 'while its copy is made: the icon, not a second full decode');
});
