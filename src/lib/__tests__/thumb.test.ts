/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THUMB, thumbName, thumbResize, wantsThumb } from '../thumbPlan';

test('thumbnails TH1: 240 px on the long edge, never larger than the photo', () => {
  assert.equal(THUMB.edge, 240);
  assert.deepEqual(thumbResize(4032, 3024), { width: 240 });
  assert.deepEqual(thumbResize(3024, 4032), { height: 240 });
  assert.equal(thumbResize(200, 150), null, 'already small: no copy');
});

test('thumbnails TH1: the copy sits beside the photo', () => {
  assert.equal(thumbName('walks/w1/abc.jpg'), 'abc.thumb.jpg');
  assert.equal(thumbName('walks/moments/x.png'), 'x.thumb.jpg');
});

test('thumbnails TH3: only a photo with a file and no copy wants one', () => {
  assert.equal(wantsThumb({ kind: 'photo', file_path: 'a.jpg', thumb_path: null }), true);
  assert.equal(wantsThumb({ kind: 'photo', file_path: 'a.jpg' }), true);
  assert.equal(wantsThumb({ kind: 'photo', file_path: 'a.jpg', thumb_path: 'a.thumb.jpg' }), false);
  assert.equal(wantsThumb({ kind: 'video', file_path: 'a.mp4' }), false);
  assert.equal(wantsThumb({ kind: 'photo', file_path: null }), false);
});
