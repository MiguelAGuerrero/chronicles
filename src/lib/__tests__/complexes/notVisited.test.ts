import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { complexSection } from '../../complexes/lines';
import { COMPLEX_CODE, type Complex } from '../../complexes/types';

// CX7: nothing is visited, counted or assigned to a walk.

const ROOT = join(__dirname, '..', '..', '..', '..');
const at = [-76.88, 40.26] as [number, number];
const c: Complex = { id: 'a', name: 'Strawberry Square', kind: 'shopping', polygons: [], at, bbox: [at[0], at[1], at[0], at[1]], release: 'r', code: COMPLEX_CODE };

test('CX7: a row says its name and kind and nothing about visits or numbers; no walk, area or replay type names a complex', { todo: 'test first' }, () => {
  const s = complexSection([c], { from: at, partial: false, hidden: [], expanded: true })!;
  assert.deepEqual(Object.keys(s.rows[0]).sort(), ['at', 'id', 'label', 'name', 'word']);
  for (const text of [s.title, s.rows[0].word, s.rows[0].label]) assert.equal(/visited|walked|new to you|been to|of \d|complexes? (here|nearby)/i.test(text.replace('Complexes near here', '')), false, text);
  // A walk is never assigned to a complex: no field of the walk, its areas or the home's rows names one.
  for (const f of ['src/lib/types.ts', 'src/lib/areas/types.ts', 'src/lib/places.ts']) assert.equal(/complex/i.test(readFileSync(join(ROOT, f), 'utf8')), false, f);
});
