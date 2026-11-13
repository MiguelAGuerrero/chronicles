// @tree-wide: the map's name labels (marks, stars, area points, busy-street names)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// fix long-names: a long place name on the map wraps onto the next line; it is never cut to "Lopes International P...".

const SRC = join(__dirname, '..', '..', '..');
const LABELS = ['components/MarkPinView.tsx', 'components/StarView.tsx', 'components/AreaPoint.tsx'];

for (const file of LABELS) {
  test(`fix long-names: ${file} lets a long name wrap`, () => {
    const src = readFileSync(join(SRC, file), 'utf8');
    assert.doesNotMatch(src, /numberOfLines|ellipsizeMode/, `${file} truncates its name`);
  });
}

// The busy-street names are the map's own text since explore-dense-city (DC1): a long name wraps at its width, and a name
// with no room is left out, never cut.
test('fix long-names: the busy names wrap or are left out, never cut', async () => {
  const { busyNameLayers } = await import('../../../components/map/types');
  const { layout } = busyNameLayers();
  assert.ok(typeof layout['text-max-width'] !== 'undefined', 'a long name wraps');
  assert.doesNotMatch(JSON.stringify(layout), /slice|substring|ellipsis|…/, 'nothing cuts a name');
});
