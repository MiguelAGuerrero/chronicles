import assert from 'node:assert/strict';
import { test } from 'node:test';
import { barsShown, viewerLine } from '../../viewerBars';

// UI conformance audit: the viewer's decisions, pure (CaptureView draws them).

test('ui-conformance audit 3: a moment that is not a photo always shows its bars', () => {
  for (const kind of ['video', 'text', 'voice'] as const) assert.equal(barsShown({ chrome: false, reader: false, recording: false, kind }), true, kind);
  assert.equal(barsShown({ chrome: false, reader: false, recording: false, kind: 'photo' }), false);
});

test('ui-conformance audit 16: the bars stay up while a reply is being recorded, and with a screen reader', () => {
  assert.equal(barsShown({ chrome: false, reader: false, recording: true, kind: 'photo' }), true);
  assert.equal(barsShown({ chrome: false, reader: true, recording: false, kind: 'photo' }), true);
});

test('ui-conformance audit 19: the info line names the day before anything else', () => {
  const now = new Date(2026, 10, 10, 12).getTime();
  const line = viewerLine({ kind: 'Note', t: new Date(2026, 9, 20, 9, 5).getTime(), time: '9:05 AM', now, parts: ['In a thread'] });
  assert.match(line, /^Note · Oct 20, 9:05 AM · In a thread$/);
});

test('ui-conformance audit 21: "Added to a thread" stands in for "In a thread", never beside it', () => {
  const now = new Date(2026, 10, 10, 12).getTime();
  const line = viewerLine({ kind: 'Note', t: now, time: '9:05 AM', now, parts: ['In a thread', 'Added to a thread'] });
  assert.doesNotMatch(line, /In a thread/);
  assert.match(line, /Added to a thread$/);
});
