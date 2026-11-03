/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryRecorder } from '../recorderRetry';
import type { RecorderStatus } from '../recorder/types';

// QL20: back in front with the recorder in error, the walk screen starts it again once, unless paused.

const error: RecorderStatus = { kind: 'error', message: 'Location permission was denied.' };

test('recorderRetry: retries an open, unpaused walk whose recorder is in error', () => {
  assert.equal(retryRecorder(error, false, true), true);
  assert.equal(retryRecorder({ kind: 'error', message: 'Off', openSettings: true }, false, true), true);
});

test('recorderRetry: never while paused (resume is the way back)', () => {
  assert.equal(retryRecorder(error, true, true), false);
});

test('recorderRetry: never without an open walk', () => {
  assert.equal(retryRecorder(error, false, false), false);
});

test('recorderRetry: only an error is retried', () => {
  for (const s of [{ kind: 'idle' }, { kind: 'waiting' }, { kind: 'recording' }] as RecorderStatus[]) {
    assert.equal(retryRecorder(s, false, true), false, s.kind);
  }
});
