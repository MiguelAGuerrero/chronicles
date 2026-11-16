import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ARRIVAL_M, stopWithin } from '../../outing/arrival';
import { at } from './fixtures';

const stops = [at(300, 0), at(600, 0)];

test('QC19: within 60 m of a stop it says which, once; beyond, nothing', () => {
  assert.equal(ARRIVAL_M, 60);
  assert.equal(stopWithin(stops, at(0, 0), new Set()), null);
  assert.equal(stopWithin(stops, at(330, 10), new Set()), 0);
  assert.equal(stopWithin(stops, at(330, 10), new Set([0])), null, 'said once');
  assert.equal(stopWithin(stops, at(600, 40), new Set([0])), 1);
  assert.equal(stopWithin(stops, at(400, 0), new Set()), null, 'passing at 100 m says nothing');
});

test('QC26: the chip is an on-screen line only: no haptic, sound, notification or accent in the outing core or its view', async () => {
  const { existsSync } = await import('node:fs');
  for (const f of ['src/lib/outing/arrival.ts', 'src/lib/outing/words.ts', 'src/components/outing/ArrivalChip.tsx']) {
    const p = new URL(`../../../../${f}`, import.meta.url);
    if (!existsSync(p)) continue;
    assert.doesNotMatch(readFileSync(p, 'utf8'), /feedback\(|notifier|Haptics|Audio|theme\.accent/);
  }
});
