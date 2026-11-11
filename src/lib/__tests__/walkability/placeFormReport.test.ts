/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeForm } from '../../walk/placeForm';
import { formatReport, type ReportRow } from '../../walk/placeFormReport';
import { measureRings } from '../../walk/placeSignals';
import { loadSet, readOf } from './placeFormFixtures';

// The report the owner reads (specs/place-form PF16), written from the spec before the code.

test('PF16: the report names every place, its confirmed word, the rule\'s word and its measures, then each set\'s accuracy and recall', () => {
  const set = loadSet('Calibration')!;
  const rows: ReportRow[] = set.places.map((p) => {
    const rings = measureRings(readOf(p));
    return { id: p.id, set: 'calibration', expected: p.word, accept: p.accept, got: placeForm(rings), measures: rings[0] };
  });
  const text = formatReport(rows);
  for (const r of rows) assert.ok(text.includes(r.id), `${r.id} is in the report`);
  assert.match(text, /accuracy/i);
  assert.match(text, /recall/i);
  assert.match(text, /confus/i);
  assert.match(text, /junctions/i, 'the measures are printed');
});
