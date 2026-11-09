// @tree-wide: the map's name labels (marks, stars, area points, busy-street names)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// fix long-names: a long place name on the map wraps onto the next line; it is never cut to "Lopes International P...".

const SRC = join(__dirname, '..', '..', '..');
const LABELS = ['components/MarkPinView.tsx', 'components/StarView.tsx', 'components/AreaPoint.tsx', 'components/LandingMarks.tsx'];

for (const file of LABELS) {
  test(`fix long-names: ${file} lets a long name wrap`, () => {
    const src = readFileSync(join(SRC, file), 'utf8');
    assert.doesNotMatch(src, /numberOfLines|ellipsizeMode/, `${file} truncates its name`);
  });
}
