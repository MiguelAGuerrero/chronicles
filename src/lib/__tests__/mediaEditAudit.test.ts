/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureBus, LOOSE_MOMENTS } from '../captureBus';
import { FULL_LINES_TEXT, openSession, step } from '../editSession';
import { emptyEdit, exportSpan, MAX_STROKES, type MediaEdit, type Stroke } from '../mediaEdit';
import { captureThumbStillWanted, editedThumbName, thumbName } from '../thumbPlan';

// The media-editing audit's regression tests (Nov 4), one per accepted finding,
// written before each fix. The e2e's are steps in the `edit` journey.

const line: Stroke = { tool: 'pen', color: 'black', w: 0.01, pts: [0.1, 0.1, 0.3, 0.2] };
const edit = (o: Partial<MediaEdit> = {}): MediaEdit => ({ ...emptyEdit(), ...o });

test('media-editing audit 1: Reset after a crop leaves no crop and a free aspect, as one event', () => {
  let s = openSession('photo', { edit: null, caption: null, caption_y: null });
  s = step(s, { type: 'aspect', aspect: 'square', W: 400, H: 300 }).state;
  assert.ok(s.edit.crop);
  s = step(s, { type: 'resetCrop' }).state;
  assert.equal(s.edit.crop, null);
  assert.equal(s.aspect, 'free');
});

test('media-editing audit 2: a loose moment\'s change reaches whoever lists loose moments', () => {
  const heard: string[] = [];
  const off = captureBus.subscribe(LOOSE_MOMENTS, {}, () => {}, (id) => heard.push(id));
  try {
    captureBus.patch(null, 'm1', { caption: 'Hi' }, {});
  } finally {
    off();
  }
  assert.deepEqual(heard, ['m1']);
});

test('media-editing audit 3: an edited copy is named by its edit, so a preview keyed by its ref loads the new one', () => {
  const c = { id: 'p1' };
  const a = editedThumbName(c, edit({ rotate: 90 }));
  const b = editedThumbName(c, edit({ rotate: 180 }));
  assert.notEqual(a, b);
  assert.equal(a, editedThumbName(c, edit({ rotate: 90 })));
  assert.notEqual(editedThumbName(c, null), thumbName(c), 'a revert is a new copy too');
  assert.match(a, /^p1\.thumb\.[a-z0-9]+\.jpg$/);
});

test('media-editing audit 8: the capture-time copy is kept only while the photo has no copy and no edit', () => {
  assert.equal(captureThumbStillWanted({ thumb_path: null, edit: null }), true);
  assert.equal(captureThumbStillWanted({ thumb_path: 'walks/w/p1.thumb.abc.jpg', edit: edit({ rotate: 90 }) }), false);
  assert.equal(captureThumbStillWanted({ thumb_path: null, edit: edit({ filter: 'mono' }) }), false);
  assert.equal(captureThumbStillWanted(null), false);
});

test('media-editing audit 9: a session opened on fifty lines is full at once', () => {
  const s = openSession('photo', { edit: edit({ strokes: Array.from({ length: MAX_STROKES }, () => line) }), caption: null, caption_y: null });
  assert.equal(s.full, true);
});

test('media-editing audit 10: an export ends at the trim, the media\'s duration, or the capture\'s own length, never at once', () => {
  assert.deepEqual(exportSpan({ start_ms: 1000, end_ms: 3000 }, 8, 8000), { startS: 1, endS: 3 });
  assert.deepEqual(exportSpan(null, 4.2, 4200), { startS: 0, endS: 4.2 });
  // MediaRecorder's own WebM reports no duration.
  assert.deepEqual(exportSpan(null, Infinity, 4000), { startS: 0, endS: 4 });
  assert.deepEqual(exportSpan(null, NaN, 0), { startS: 0, endS: 30 });
});

test('media-editing audit 12: the line limit is said in words', () => {
  assert.doesNotMatch(FULL_LINES_TEXT, /\d/);
  assert.match(FULL_LINES_TEXT, /fifty/);
});
