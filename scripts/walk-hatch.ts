// Writes the native map's hatch images (G5, CG10) from the look in `src/components/map/types.ts`, one a quarter zoom (the
// owner, "Hold at every zoom"): the web map draws the same pixels with `addImage`, so a change of `WALK_STYLE.car` is
// followed by this, and `walkHatch.test.ts` fails until it is.
//   node_modules/.bin/tsx scripts/walk-hatch.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WALK_STYLE } from '../src/components/map/types';
import { HATCH_QUARTERS, hatchLookAt, hatchPng } from '../src/lib/walk/hatch';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'map');
mkdirSync(dir, { recursive: true });
for (const q of HATCH_QUARTERS)
  for (const [ratio, suffix] of [[1, ''], [2, '@2x'], [3, '@3x']] as const) {
    writeFileSync(join(dir, `walk-hatch-${q}${suffix}.png`), hatchPng(hatchLookAt(WALK_STYLE.car, q), ratio));
    console.log(`walk-hatch-${q}${suffix}.png: written`);
  }
