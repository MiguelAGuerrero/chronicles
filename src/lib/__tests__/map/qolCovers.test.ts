/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// tend map audit 54 (the diff review's auditor 6): `npm run check:affected` names a journey by its `covers`, so a change
// to a view whose units qol checks (tend map 23) must name qol, or its checks are skipped.
const ROOT = join(__dirname, '..', '..', '..', '..');
const req = createRequire(__filename);
const qol = req(join(ROOT, 'scripts', 'e2e', 'journeys', 'qol.js')) as { covers: string[] };
const { globToRegExp } = req(join(ROOT, 'scripts', 'features.js')) as { globToRegExp: (g: string) => RegExp };

test('tend map audit 54: qol covers every view whose units it checks', () => {
  const covers = qol.covers.map(globToRegExp);
  for (const f of [
    'src/app/(tabs)/explore.tsx',
    'src/components/atlas/AtlasTile.tsx',
    'src/components/atlas/AtlasCard.tsx',
    'src/components/ExploreSettings.tsx',
    'src/components/StartSettings.tsx',
    'src/components/walk/useReady.tsx',
    'src/lib/startPlan.ts',
    'src/lib/useUnits.ts',
  ]) assert.ok(covers.some((re) => re.test(f)), f);
});
