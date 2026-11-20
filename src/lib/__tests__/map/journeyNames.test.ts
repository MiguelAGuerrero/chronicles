/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// tend map 22 (the lenses' auditor 6, Nov 20): an expectation line (decision 0236) names a journey's template check by
// its fixed text before the first `${`, and `npm run expectations` refuses a name that another check of the journey
// starts. A template whose fixed text is empty (a step's failure, ``check(false, `${name}: …`)``) is started by every
// text, so no template check of its journey could be named: `qol`, the map's own journey, among them.

const ROOT = join(__dirname, '..', '..', '..', '..');
const JOURNEYS = join(ROOT, 'scripts', 'e2e', 'journeys');
type Index = { journeys: Record<string, { templates: { fixed: string }[] }> };
const ex = createRequire(__filename)(join(ROOT, 'scripts', 'expectations.js')) as {
  indexOf(files: { journeys: Record<string, string>; tests: Record<string, string> }): Index;
  check(feature?: string): unknown;
};

const journeys = Object.fromEntries(
  readdirSync(JOURNEYS).filter((f) => f.endsWith('.js')).map((f) => [f.replace(/\.js$/, ''), readFileSync(join(JOURNEYS, f), 'utf8')]),
);

test('tend map 22: no journey reports a check whose message opens on ${, so every template check can be named', () => {
  const index = ex.indexOf({ journeys, tests: {} });
  const open = Object.entries(index.journeys)
    .filter(([, j]) => j.templates.some((t) => !/\p{L}/u.test(t.fixed)))
    .map(([name]) => name);
  assert.deepEqual(open, []);
});

test('tend map 22: a step that throws in qol or edit is reported under a fixed "step " prefix', () => {
  for (const name of ['qol', 'edit']) assert.match(journeys[name], /check\(false, `step \$\{/, name);
});
