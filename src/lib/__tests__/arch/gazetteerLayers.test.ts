import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Place search (specs/place-search, GZ12, GZ16): the source tree names no dataset, and a search stores nothing.
const ROOT = join(__dirname, '../../../..');
const files = (dir: string) => readdirSync(join(ROOT, dir)).filter((f) => /\.tsx?$/.test(f)).map((f) => join(ROOT, dir, f));

test('GZ12: no dataset is named in src', { todo: 'test first' }, () => {
  const all = [...files('src/lib/gazetteer'), ...files('src/components/atlas')];
  assert.ok(files('src/lib/gazetteer').length > 4, 'the gazetteer folder exists');
  const named = all.filter((f) => /geonames/i.test(readFileSync(f, 'utf8')));
  assert.deepEqual(named, []);
  assert.ok(files('src/components/atlas').some((f) => f.endsWith('PlaceSearch.tsx')), 'PlaceSearch.tsx exists');
});

test('GZ16: a search stores nothing: the gazetteer and its view import no db, ports, store or storage', { todo: 'test first' }, () => {
  const mine = [...files('src/lib/gazetteer'), join(ROOT, 'src/components/atlas/PlaceSearch.tsx')];
  for (const f of mine) {
    const text = readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /from '[^']*\/(db|ports|store|useStore)'|AsyncStorage|localStorage|sessionStorage|indexedDB/, f);
  }
});
