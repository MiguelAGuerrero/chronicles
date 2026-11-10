/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pinsFor, pinThumb, type CapturePin } from '../../pins';
import { THUMB } from '../../thumbPlan';
import type { CaptureKind } from '../../types';

const cap = (id: string, kind: CaptureKind, o: Partial<Faced> = {}): Faced => facedOf({
  id, walk_id: 'w1', t: 1000, lat: 41.812, lon: -71.4, kind, file_path: `walks/w1/${id}.jpg`, body: null, segment_id: null, thumb_path: null, ...o,
});
const pinOf = (...cs: Faced[]): CapturePin => {
  const pins = pinsFor(cs, 30);
  assert.equal(pins.length, 1);
  return pins[0];
};

test('QL26: a pin of one photo with its small copy shows the copy', () => {
  const pin = pinOf(cap('a', 'photo', { thumb_path: 'walks/w1/a.thumb.jpg' }));
  assert.equal(pinThumb(pin), 'walks/w1/a.thumb.jpg');
});

test('QL26: a loose moment\'s photo shows its copy too', () => {
  const pin = pinOf(cap('m', 'photo', { walk_id: null, file_path: 'walks/moments/m.jpg', thumb_path: 'walks/moments/m.thumb.jpg' }));
  assert.equal(pinThumb(pin), 'walks/moments/m.thumb.jpg');
});

test('QL26: never the full photo: no copy yet, or one that will not decode, shows the icon', () => {
  assert.equal(pinThumb(pinOf(cap('a', 'photo'))), null, 'copy not made yet');
  assert.equal(pinThumb(pinOf(cap('a', 'photo', { thumb_path: undefined }))), null, 'an older row with no field');
  assert.equal(pinThumb(pinOf(cap('a', 'photo', { thumb_path: '' }))), null, 'an empty ref');
  assert.equal(pinThumb(pinOf(cap('a', 'photo', { thumb_path: THUMB.none }))), null, 'marked undecodable');
});

test('QL26: a pin of several captures keeps its count, even all photos with copies', () => {
  const pin = pinOf(
    cap('a', 'photo', { thumb_path: 'walks/w1/a.thumb.jpg' }),
    cap('b', 'photo', { t: 2000, thumb_path: 'walks/w1/b.thumb.jpg' }),
  );
  assert.equal(pin.captures.length, 2);
  assert.equal(pinThumb(pin), null);
});

test('QL26: other kinds keep their icon, whatever their thumb_path', () => {
  for (const kind of ['video', 'voice', 'text'] as const) {
    assert.equal(pinThumb(pinOf(cap('a', kind, { thumb_path: 'walks/w1/a.thumb.jpg' }))), null, kind);
  }
});
