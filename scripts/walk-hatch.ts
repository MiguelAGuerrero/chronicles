// Writes the native map's hatch images (G5, CG10) from the look in `src/components/map/types.ts`: the web map draws the
// same pixels with `addImage`, so a change of `WALK_STYLE.car` is followed by this, and `walkHatch.test.ts` fails until it is.
//   node_modules/.bin/tsx scripts/walk-hatch.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WALK_STYLE } from '../src/components/map/types';
import { hatchPng } from '../src/lib/walk/hatch';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'map');
mkdirSync(dir, { recursive: true });
for (const [ratio, name] of [[1, 'walk-hatch.png'], [2, 'walk-hatch@2x.png'], [3, 'walk-hatch@3x.png']] as const) {
  writeFileSync(join(dir, name), hatchPng(WALK_STYLE.car, ratio));
  console.log(`${name}: written`);
}
