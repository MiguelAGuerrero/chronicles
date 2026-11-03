/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLaunchRoute } from '../launchRoute';

test('NV2: the first route seen is the launch route, until the app moves', () => {
  const r = createLaunchRoute();
  assert.equal(r.isLaunch('/replay/w1'), false, 'nothing seen yet');
  r.note('/replay/w1');
  r.note('/replay/w1');
  assert.equal(r.isLaunch('/replay/w1'), true, 'opened on the replay');
  assert.equal(r.isLaunch('/replay/w2'), false, 'another replay is not the launch');
});

test('NV2: coming back to the launch path from inside the app is not a launch', () => {
  const r = createLaunchRoute();
  r.note('/replay/w1');
  r.note('/chronicle');
  r.note('/replay/w1');
  assert.equal(r.isLaunch('/replay/w1'), false);
});
