import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as copy from '../../gallery/copy';

// Media gallery (specs/media-gallery): every sentence the gallery writes.

test('MG10: empty in words, for all and for each kind', () => {
  assert.equal(copy.emptyLine('all'), 'Photos, videos and voice memos you keep show here.');
  assert.equal(copy.emptyLine('photo'), 'No photos kept yet.');
  assert.equal(copy.emptyLine('video'), 'No videos kept yet.');
  assert.equal(copy.emptyLine('voice'), 'No voice memos kept yet.');
});

test('MG6: the place line\'s phrases verbatim, and no "and others"', () => {
  assert.equal(copy.NOT_ON_A_WALK, 'Not on a walk');
  assert.equal(copy.OUTSIDE_A_WALK, 'and outside a walk');
  assert.equal(copy.untitledWalk('morning', 'Alfama'), 'a morning walk in Alfama');
  assert.equal(copy.untitledWalk('afternoon', null), 'an afternoon walk');
  assert.equal(copy.moreWalks(1), 'another walk');
  assert.equal(copy.moreWalks(2), 'two other walks');
  assert.equal(copy.OTHER_STREETS, 'other streets');
  assert.equal(copy.morePlaces(1), 'another place');
  assert.equal(copy.morePlaces(4), 'other places');
  assert.equal(copy.listed(['a', 'b', 'c']), 'a, b and c');
  assert.deepEqual(copy.ONLY, { photo: 'Photos only', video: 'Videos only', voice: 'Memos only' });
  const n = [1, 2, 5, 19, 40, 120];
  const every = [
    ...(Object.values(copy) as unknown[]).filter((v): v is string => typeof v === 'string'),
    ...[copy.ONLY, copy.SHOW_LABEL, copy.ORDER_LABEL, copy.ZOOM_LABEL, copy.SHAPE_LABEL, copy.KIND_WORD].flatMap((o) => Object.values(o)),
    ...n.map(copy.moreWalks),
    ...n.map(copy.morePlaces),
    ...(['all', 'photo', 'video', 'voice'] as const).map(copy.emptyLine),
  ];
  for (const s of every) {
    assert.doesNotMatch(String(s), /\band others\b/, String(s));
    assert.doesNotMatch(String(s), /\d/, `no digit leaves the copy (MG7): ${s}`);
  }
});
