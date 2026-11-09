import assert from 'node:assert/strict';
import test from 'node:test';
import { noticeShown } from '../../pauseReminder';

test('fix pause-banner: the paused reminder goes when the walk resumes', () => {
  const reminder = { message: 'Paused for 10 min. Nothing is recorded until you resume.', sticky: true, forPause: 1000 };
  assert.equal(noticeShown(reminder, 1000), reminder);
  assert.equal(noticeShown(reminder, null), null);
});

test('fix pause-banner audit 1: a reminder from an ended pause is not shown when a new pause opens', () => {
  const reminder = { message: 'Paused for 10 min.', sticky: true, forPause: 1000 };
  assert.equal(noticeShown(reminder, 9000), null);
});

test('fix pause-banner: other notices stay whether paused or not', () => {
  const other = { message: 'Could not resume: x', tone: 'error' as const, sticky: true };
  assert.equal(noticeShown(other, null), other);
  assert.equal(noticeShown(other, 1000), other);
  assert.equal(noticeShown(null, null), null);
});
