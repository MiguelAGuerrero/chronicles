/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCATION_OFF, START_OFF, startOffNotice } from '../../locate/notice';
import { RecorderError, startErrorFrom } from '../../recorder/types';

// T26 (the owner's yes, decision 0162): Start refused reads as Locate's refusal does since T17, a quiet notice in the
// notice's colour and not the red fault, in Locate's words with its own end; on a phone the words stay, with Open Settings.

test('tend recording T26: Start refused says Locate’s line with its own end, quietly, on the web and on a phone', () => {
  assert.equal(START_OFF.web, 'Location is off for this site. Turn it on in the browser’s settings to record a walk.');
  assert.equal(START_OFF.native, 'Location is turned off for Chronicles. Turn it on in Settings to record a walk.');
  // Beside Locate's: the same beginning, its own end.
  const head = (s: string) => s.slice(0, s.indexOf(' to '));
  assert.equal(head(START_OFF.web), head(LOCATION_OFF.web));
  assert.equal(head(START_OFF.native), head(LOCATION_OFF.native));
  assert.deepEqual(startOffNotice('web'), { message: START_OFF.web, tone: 'info' });
  assert.deepEqual(startOffNotice('native'), { message: START_OFF.native, openSettings: true, tone: 'info' });
  // A refusal carries its tone to the screen; any other failed start is a fault, as before.
  assert.equal(new RecorderError('x', true, 'info').tone, 'info');
  assert.equal(new RecorderError('x').tone, 'error');
  assert.equal(new RecorderError('x').openSettings, false);
});

test('tend recording audit 5: a refused start reaches the screen as a quiet StartError; any other failure is a fault', () => {
  // The web's refusal, and a phone's (Open Settings), as the recorders throw them.
  const web = startOffNotice('web');
  assert.deepEqual(startErrorFrom(new RecorderError(web.message, false, web.tone)), { message: START_OFF.web, openSettings: false, tone: 'info' });
  const native = startOffNotice('native');
  assert.deepEqual(startErrorFrom(new RecorderError(native.message, true, native.tone)), { message: START_OFF.native, openSettings: true, tone: 'info' });
  // A phone's prompt declined: quiet, no Settings to open yet.
  assert.deepEqual(startErrorFrom(new RecorderError('Location permission is needed to record a walk.', false, 'info')), {
    message: 'Location permission is needed to record a walk.', openSettings: false, tone: 'info',
  });
  // Not a refusal: no location in the browser at all, a failed write, or anything thrown that is not an Error.
  assert.deepEqual(startErrorFrom(new RecorderError('This browser has no location access, so it cannot record a walk.')), {
    message: 'This browser has no location access, so it cannot record a walk.', openSettings: false, tone: 'error',
  });
  assert.deepEqual(startErrorFrom(new Error('QuotaExceededError')), { message: 'QuotaExceededError', openSettings: false, tone: 'error' });
  assert.deepEqual(startErrorFrom('gone'), { message: 'gone', openSettings: false, tone: 'error' });
});
