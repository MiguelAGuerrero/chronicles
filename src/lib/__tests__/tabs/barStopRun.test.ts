/// <reference types="node" />
// tend tabs audit 53 (the diff review's auditor 1, a regression of tend tabs 19): once a stop from the bar outlived its
// bound, the bar's Stop came back and a second hold began a second end beside the first: two ends of one walk, two
// replays pushed, an empty walk's drop scheduled twice. The stop's promise is kept per walk: a hold after the bound
// joins the end under way, and only that end pushes its replay.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createBarStops } from '../../tabsHidden';

const bar = readFileSync(join(__dirname, '..', '..', '..', 'components', 'RecordingBar.tsx'), 'utf8');

test('tend tabs audit 53: a hold after the stop\'s bound joins the stop under way; one replay is pushed when it settles', async () => {
  const stops = createBarStops();
  const pushed: string[] = [];
  let ends = 0;
  let settle: () => void = () => {};
  // The bar's end of a walk, over fakes: it hangs until settled, then pushes the walk's replay.
  const end = (id: string) => async () => {
    ends += 1;
    await new Promise<void>((r) => (settle = r));
    pushed.push(`/replay/${id}`);
  };
  const first = stops.run('w1', end('w1'));
  const second = stops.run('w1', end('w1'));
  assert.equal(ends, 1, 'the second hold begins no end of its own');
  settle();
  await Promise.all([first, second]);
  assert.deepEqual(pushed, ['/replay/w1'], 'one replay, pushed by the end under way');
  // Settled, a later end of the same walk (a refusal said, held again) runs anew; another walk's never waits on it.
  const again = stops.run('w1', end('w1'));
  assert.equal(ends, 2);
  settle();
  await again;
  // The wiring: the bar's Stop runs its end through the walk's one promise.
  assert.match(bar, /await barStops\.run\(walk\.id, endWalk\);/);
});

test('tend tabs audit 53: a failed end lets the next hold try again', async () => {
  const stops = createBarStops();
  await assert.rejects(stops.run('w1', async () => { throw new Error('wedged'); }));
  let ran = false;
  await stops.run('w1', async () => { ran = true; });
  assert.equal(ran, true);
});
