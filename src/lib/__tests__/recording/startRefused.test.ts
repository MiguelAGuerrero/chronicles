/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LOCATION_OFF, START_OFF, startOffNotice } from '../../locate/notice';
import { RecorderError } from '../../recorder/types';

// T26 (the owner's yes, decision 0162): Start refused reads as Locate's refusal does since T17, a quiet notice in the
// notice's colour and not the red fault, in Locate's words with its own end; on a phone the words stay, with Open Settings.

const src = (rel: string) => readFileSync(join(__dirname, '../..', rel), 'utf8');

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

test('tend recording T26: the recorders read their refused start from locate/notice, and say it quietly', () => {
  const web = src('recorder/index.web.ts');
  assert.match(web, /from '\.\.\/locate\/notice'/);
  assert.match(web, /startOffNotice\('web'\)/);
  // Locate's old line, which the web start said in red until T26, is gone.
  assert.doesNotMatch(web, /Location permission was denied/);
  const native = src('recorder/index.native.ts');
  assert.match(native, /startOffNotice\('native'\)/);
  assert.doesNotMatch(native, /'Location is turned off for Chronicles\. Turn it on in Settings to record a walk\.'/);
  // The walk's "Not recording" notice takes the recorder's tone, raised by the status or brought back by the chip.
  const walk = src('../app/walk.tsx');
  assert.doesNotMatch(walk, /setNotice\(\{ message: (s|status)\.message, tone: 'error'/);
});
