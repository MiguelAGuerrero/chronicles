// tend presence 4 (2026-11-19, the lenses' ux-reviewer 2): "Courthouses and halls" wore History's own glyph (library-outline), so
// in "What I'm into" a subtype read as its category, and History's glyph stood for two things (H4, consistency).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CATEGORIES } from '../../discovery/categories';
import { SUBTYPES } from '../../discovery/subtypes';
import { KINDS } from '../../explore/explore';

test('tend presence 4: no subtype wears a category\'s glyph, and none shares one with another subtype', () => {
  const categoryIcons = new Set(CATEGORIES.map((c) => c.icon));
  const subtypes = new Set(SUBTYPES.map((s) => s.kind));
  const rows = KINDS.filter((k) => subtypes.has(k.id));
  assert.equal(rows.length, SUBTYPES.length, 'every subtype is a row');
  const clash = rows.filter((r) => categoryIcons.has(r.icon)).map((r) => `${r.label}: ${r.icon}`);
  assert.deepEqual(clash, [], 'a subtype wears a category\'s glyph');
  const icons = rows.map((r) => r.icon);
  assert.equal(new Set(icons).size, icons.length, 'two subtypes share a glyph');
  const glyphs = JSON.parse(readFileSync(join(__dirname, '../../../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'));
  for (const i of icons) assert.ok(i in glyphs, `${i} is an installed Ionicons glyph`);
});
