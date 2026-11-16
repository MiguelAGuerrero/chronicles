import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { validatePack } from '../../gazetteer/pack';
import { buildIndex, search } from '../../gazetteer/search';
import { GAZETTEER_CREDIT } from '../../../components/map/types';

// The committed pack (specs/place-search, GZ13): real data, so the checks are on what the app ships.
const load = () => createRequire(import.meta.url)('../../../../assets/gazetteer/places.json');

test('GZ13: the committed pack holds only the allowed fields and its tables agree', () => {
  assert.deepEqual(validatePack(load()), []);
});

test('GZ12: the committed pack is within its weight budget and names its dataset and date', () => {
  const bytes = readFileSync(new URL('../../../../assets/gazetteer/places.json', import.meta.url)).length;
  assert.ok(bytes < 6_000_000, `the pack is ${bytes} bytes`);
  assert.match(load().id, /\d{4}-\d{2}-\d{2}$/);
});

test('GZ3: real names are found by their plain spelling, their local one and an alternate', () => {
  const ix = buildIndex(load());
  const found = (q: string, region?: string) => search(ix, q, null, 50).places.some((p) => p.name.toLowerCase().includes(q.split(' ')[0]) && (!region || p.region === region));
  assert.ok(found('zurich'));
  assert.ok(found('carlisle pa', 'Pennsylvania'));
  assert.ok(search(ix, 'munich', null).places.length > 0, 'an English reader types Munich');
  assert.ok(search(ix, 'cologne', null).places.length > 0, 'and Cologne, an alternate of Köln');
  assert.ok(search(ix, 'camp hill pa', null).places.length > 0);
});

test('GZ14: the map\'s credit is the pack\'s own credit, with its date', () => {
  assert.equal(GAZETTEER_CREDIT, load().credit);
  assert.match(GAZETTEER_CREDIT, /GeoNames/);
  assert.match(GAZETTEER_CREDIT, /CC BY 4\.0/);
});
