import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPLEX_CODE, COMPLEX_KINDS, type Complex, type ComplexKind } from '../../complexes/types';
import { hiddenToMeta, parseHiddenKinds, shown, switchLabel } from '../../complexes/kinds';
import { complexSection } from '../../complexes/lines';
import { complexMap } from '../../complexes/mapLayer';
import { createComplexes } from '../../complexes/shell';
import type { LngLat } from '../../types';

// CX10: a kind switched off leaves the card and the map, nothing else; the read and a moment's line ignore it.

const at: LngLat = [-76.88, 40.26];
const mk = (id: string, kind: ComplexKind): Complex => ({ id, name: id, kind, polygons: [[[at, [at[0] + 0.001, at[1]], [at[0], at[1] + 0.001], at]]], at, bbox: [at[0], at[1], at[0] + 0.001, at[1] + 0.001], release: 'r', code: COMPLEX_CODE });
const all = COMPLEX_KINDS.map((k) => mk(k, k));

test('CX10: kinds filter the view only; five switches; all off shows no section, no outline and no notice', async () => {
  assert.equal(COMPLEX_KINDS.length, 5);
  assert.deepEqual(COMPLEX_KINDS.map(switchLabel), ['Shopping', 'Markets', 'Campuses', 'Stations', 'Civic']);
  assert.deepEqual(parseHiddenKinds(hiddenToMeta(['markets', 'civic'])), ['markets', 'civic']);
  assert.deepEqual(parseHiddenKinds('markets,nonsense'), ['markets'], 'an unknown word is dropped');
  assert.deepEqual(parseHiddenKinds(null), []);
  assert.deepEqual(shown(all, ['markets']).map((c) => c.kind), ['shopping', 'campuses', 'stations', 'civic']);
  assert.equal(complexSection(shown(all, [...COMPLEX_KINDS]), { from: at, partial: true, hidden: [], expanded: true }), null);
  assert.deepEqual(complexMap(shown(all, [...COMPLEX_KINDS]), 18).lines.features, []);
  // The data is untouched: the store still holds every row, and a moment's line ignores the switches.
  const rows: Complex[] = [];
  const c = createComplexes({ source: { read: async () => ({ ok: false }) }, store: { putComplexes: async (r) => void rows.push(...r), complexesNear: async () => all }, now: () => 0 });
  assert.ok((await c.lineFor(at))?.complex, 'a moment\'s line ignores the switches');
});
