// tend presence 7 (2026-11-19, the lenses' auditor 5): the comments over ATLAS_OWN and ATLAS_CODE named a13 as the atlas's own
// part while the code was a15, so a reader bumping the code read a stale one.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ATLAS_CODE } from '../../atlas/atlas';

test('tend presence 7: the comments over ATLAS_OWN and ATLAS_CODE name no code but the one in force', () => {
  const lines = readFileSync(join(__dirname, '../../atlas/atlas.ts'), 'utf8').split('\n');
  const current = ATLAS_CODE.split('.')[0];
  // The lines that say what the atlas's own part is (the history lines a1..a15 say when each came, and stay).
  const about = lines.map((l, i) => [l, i] as const).filter(([l]) => /The atlas's own part of a row's code|A row's code: the atlas's own/.test(l));
  assert.equal(about.length, 2, 'the two comments are found');
  for (const [l, i] of about) {
    for (const n of l.match(/\ba\d+\b/g) ?? []) assert.equal(n, current, `atlas.ts l.${i + 1} names ${n}: ${l.trim()}`);
  }
});
