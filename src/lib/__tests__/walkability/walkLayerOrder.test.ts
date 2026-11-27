/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { WALK_BELOW } from '../../../components/map/types';

// walkability-car-ground audit 14 (the auditor's F5), written before the code: the hatch and its edge sit under the base
// map's labels on both maps, so the streets' names show over the car ground. Read from the two renderers' own source: the
// native one cannot run here.

const MAP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'components', 'map');

test('walkability-car-ground audit 14: both maps put the hatch and its edge under the base map\'s first label', () => {
  const native = readFileSync(join(MAP, 'WalkMap.native.tsx'), 'utf8');
  for (const id of ['walk-car', 'walk-car-edge']) {
    const tag = native.slice(native.indexOf(`<Layer id="${id}"`), native.indexOf('/>', native.indexOf(`<Layer id="${id}"`)));
    assert.match(tag, /beforeId=\{WALK_BELOW\}/, `native ${id} is placed under the labels`);
  }
  const web = readFileSync(join(MAP, 'WalkMap.web.tsx'), 'utf8');
  for (const id of ['walk-car', 'walk-car-edge']) {
    const at = web.indexOf(`id: '${id}'`);
    const end = web.indexOf(');', at);
    assert.match(web.slice(at, end), /\}, firstSymbol$/, `web ${id} is added before the first symbol layer`);
  }
  assert.equal(typeof WALK_BELOW, 'string');
});
