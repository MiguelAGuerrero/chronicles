import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_NOTICE_PREFS } from '../../notify/core';
import { createNoticePrefs, NOTIFY_OFF_KEY } from '../../notify/prefs';
import { fakePorts } from '../fakes';

// The notification kinds switched off in Settings (NT4), as a shell over fakes (specs/shells-saved-settings, SH3).

test('SH3 the switches read back; none saved is every kind on', async () => {
  const p = fakePorts();
  const prefs = createNoticePrefs(p);
  assert.deepEqual(await prefs.loadNoticePrefs(), DEFAULT_NOTICE_PREFS, 'none saved');
  await prefs.saveNoticePrefs({ recall: false, pause: true });
  assert.deepEqual(await prefs.loadNoticePrefs(), { recall: false, pause: true });
  assert.equal(await p.db.getMeta(NOTIFY_OFF_KEY), '["recall"]', 'stored as the kinds switched off, so a new kind starts on');
  await prefs.saveNoticePrefs({ recall: true, pause: true });
  assert.deepEqual(await prefs.loadNoticePrefs(), DEFAULT_NOTICE_PREFS);
});
