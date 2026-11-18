/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const SRC = join(__dirname, '../../..');
const FILES = ['app/replay/[id].tsx', 'app/day/[key].tsx', 'components/ScreenError.tsx'];

test('tend replay audit 9: a walk not found, a day with nothing kept and the error screen say "Back to Chronicle", never the old words', () => {
  // The owner's yes to T20 (decision 0165): each goes to Chronicle, so each says so. The launch journey checks the
  // screens; this holds the words in the replay's own tests (npm run test:feature replay; the T20 review's auditor 3).
  const said = FILES.map((f) => {
    const text = readFileSync(join(SRC, f), 'utf8');
    return [f, /label="Back to Chronicle"/.test(text), /Back to walks|Back to the map/.test(text)];
  });
  assert.deepEqual(said, FILES.map((f) => [f, true, false]));
});
