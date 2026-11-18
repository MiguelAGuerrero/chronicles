/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLaunchRoute } from '../../launchRoute';

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

test('NV16: Explore asks for one fix per launch, and none once a fix is known', async () => {
  const { createLaunchFix } = await import('../../lastFix');
  const a = createLaunchFix();
  assert.equal(a.take(false), true, 'the first focus with no fix asks');
  assert.equal(a.take(false), false, 'only once per launch');
  const b = createLaunchFix();
  assert.equal(b.take(true), false, 'Navigate already read one: nothing to ask');
  assert.equal(b.take(false), false, 'and the launch has had its chance');
});

// `lib/launchRoute` kept the app's instance beside its factory while tagged core (the /tend tabs review's F8): a file that
// keeps state is a shell (.claude/rules/functional-core.md, "Which layer?"; `memoGate` is the same shape). Its comment
// said a stale launch goes to Explore; since decision 0112 it goes to Chronicle.
test('tend tabs 15: lib/launchRoute, which keeps the app\'s launch path, is a shell, and says a stale launch goes to Chronicle', () => {
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const text = readFileSync(join(__dirname, '..', '..', 'launchRoute.ts'), 'utf8');
  assert.match(text, /^\/\/ @layer shell\n/);
  assert.match(text, /^export const launchRoute = createLaunchRoute\(\);$/m);
  assert.doesNotMatch(text, /goes to Explore/);
  assert.match(text, /goes to Chronicle/);
});
