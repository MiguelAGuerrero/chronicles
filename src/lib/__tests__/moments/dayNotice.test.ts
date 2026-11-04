import assert from 'node:assert/strict';
import { test } from 'node:test';

// Moments and days, M15: nothing nags to watch the day.

test('M15 no notification ever suggests watching the day: the only kinds are reminders and the pause', async () => {
  const { NOTICE_KINDS } = await import('../../notify/core');
  assert.deepEqual(NOTICE_KINDS.map((k) => k.id), ['recall', 'pause']);
  for (const k of NOTICE_KINDS) assert.doesNotMatch(`${k.label} ${k.note}`, /\bday\b|watch/i, k.id);
});
