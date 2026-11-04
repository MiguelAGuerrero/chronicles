/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openWalkAtLaunch } from '../../launchWalk';

const never = () => new Promise<never>(() => {});

test('NV2 launch 1: an open walk opens the walk screen before the recorder resumes, then the cover lifts', async () => {
  const seen: string[] = [];
  let resumed!: () => void;
  const done = openWalkAtLaunch({
    findOpen: async () => ({ id: 'w1' }),
    showWalk: () => seen.push('walk'),
    lift: () => seen.push('lift'),
    // On web the recorder waits for the browser's first fix, up to 10 s: Explore showed all that time.
    resume: () => {
      seen.push('resume');
      return new Promise<void>((r) => (resumed = r));
    },
    capMs: 1000,
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(seen, ['walk', 'lift', 'resume'], 'the walk is in front, uncovered, while the fix is still coming');
  resumed();
  await done;
});

test('NV2 launch 2: with no walk open, the cover lifts on the screen the app opened on', async () => {
  const seen: string[] = [];
  await openWalkAtLaunch({
    findOpen: async () => null,
    showWalk: () => seen.push('walk'),
    lift: () => seen.push('lift'),
    resume: async () => {
      seen.push('resume');
    },
    capMs: 1000,
  });
  assert.deepEqual(seen, ['lift', 'resume'], 'resume still runs: it stops a recorder left on with no walk');
});

test('NV2 launch 3: a read that fails or never settles never leaves the app covered', async () => {
  for (const findOpen of [() => Promise.reject(new Error('db')), never]) {
    const seen: string[] = [];
    await openWalkAtLaunch({
      findOpen,
      showWalk: () => seen.push('walk'),
      lift: () => seen.push('lift'),
      resume: async () => {
        seen.push('resume');
      },
      capMs: 20,
    });
    assert.deepEqual(seen, ['lift', 'resume']);
  }
});

test('NV2 launch 4: a resume that fails is swallowed, after the walk is already in front', async () => {
  const seen: string[] = [];
  await openWalkAtLaunch({
    findOpen: async () => ({ id: 'w1' }),
    showWalk: () => seen.push('walk'),
    lift: () => seen.push('lift'),
    resume: () => Promise.reject(new Error('Location permission was denied.')),
    capMs: 1000,
  });
  assert.deepEqual(seen, ['walk', 'lift']);
});

test('NV2 launch 5: the cover stays until the walk screen is in front, at most the cap', async () => {
  const seen: string[] = [];
  let inFront!: () => void;
  const done = openWalkAtLaunch({
    findOpen: async () => ({ id: 'w1' }),
    // A replace commits a frame later: lifting at once showed the tabs for that frame (the e2e).
    showWalk: () => {
      seen.push('walk');
      return new Promise<void>((r) => (inFront = r));
    },
    lift: () => seen.push('lift'),
    resume: async () => {
      seen.push('resume');
    },
    capMs: 1000,
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(seen, ['walk'], 'still covered while the walk is on its way');
  inFront();
  await done;
  assert.deepEqual(seen, ['walk', 'lift', 'resume']);

  const capped: string[] = [];
  await openWalkAtLaunch({
    findOpen: async () => ({ id: 'w1' }),
    showWalk: () => {
      capped.push('walk');
      return never();
    },
    lift: () => capped.push('lift'),
    resume: async () => {},
    capMs: 20,
  });
  assert.deepEqual(capped, ['walk', 'lift'], 'a walk screen that never comes never leaves the app covered');
});
