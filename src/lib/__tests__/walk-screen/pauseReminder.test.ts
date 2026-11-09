import assert from 'node:assert/strict';
import test from 'node:test';
import { noticeShown } from '../../pauseReminder';

test('fix pause-banner: the paused reminder goes when the walk resumes', () => {
  const reminder = { message: 'Paused for 10 min. Nothing is recorded until you resume.', sticky: true, forPause: true };
  assert.equal(noticeShown(reminder, true), reminder);
  assert.equal(noticeShown(reminder, false), null);
});

test('fix pause-banner: other notices stay whether paused or not', () => {
  const other = { message: 'Could not resume: x', tone: 'error' as const, sticky: true };
  assert.equal(noticeShown(other, false), other);
  assert.equal(noticeShown(null, false), null);
});
