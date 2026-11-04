/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureBus, type CapturePatch } from '../captureBus';
import { createCaptureEdits } from '../captureEdits/shell';
import type { MediaEdit } from '../mediaEdit';
import type { Capture } from '../types';
import { fakePorts } from './fakes';

const edit: MediaEdit = { v: 1, rotate: 90, crop: null, filter: 'vivid', strokes: [], trim: null };
const photo: Capture = { id: 'p1', walk_id: 'w1', t: 1, lat: null, lon: null, kind: 'photo', file_path: 'walks/w1/p1.jpg', body: null, segment_id: null };

test('ME21: a saved edit and caption are stored, then reach every open view of the walk on the bus', async () => {
  const p = fakePorts();
  await p.db.addCapture(photo);
  const heard: [string, CapturePatch][] = [];
  const off = captureBus.subscribe('w1', {}, () => {}, (id, patch) => heard.push([id, patch]));
  try {
    await createCaptureEdits(p).save(photo, { edit, caption: 'Mural', caption_y: 0.3 });
  } finally {
    off();
  }
  const [stored] = await p.db.getCapturesByIds(['p1']);
  assert.deepEqual(stored.edit, edit);
  assert.equal(stored.caption, 'Mural');
  assert.deepEqual(heard, [['p1', { edit, caption: 'Mural', caption_y: 0.3 }]]);
});

test('ME21: a failed write throws and tells no one (a failure only the fake can produce)', async () => {
  const p = fakePorts();
  await p.db.addCapture(photo);
  const heard: string[] = [];
  const off = captureBus.subscribe('w1', {}, () => {}, (id) => heard.push(id));
  p.db.failNext('updateCapture');
  try {
    await assert.rejects(createCaptureEdits(p).save(photo, { edit }));
  } finally {
    off();
  }
  assert.deepEqual(heard, []);
});
