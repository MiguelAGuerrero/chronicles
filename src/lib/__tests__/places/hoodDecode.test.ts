/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outlineTileFrom } from '../../areas/divisionTiles';
import { OUTLINE_DECODE, outlineSet, stampRelease, tileCurrent } from '../../areas/outlines';
import type { TileFeature } from '../../areas/tilePlaces';
import { baltimoreSet, baltimoreTiles } from './hoodFixture';

// Neighborhood boundaries, what is read (HB1), against Overture's real divisions tiles for Baltimore.

const area = (subtype: string, name: string | null, id: string, extra: Record<string, unknown> = {}): TileFeature => ({
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
  properties: { subtype, '@name': name, division_id: id, class: 'land', ...extra },
});

test('HB1: neighborhood and macrohood areas on land are read; microhood, maritime, unnamed, association-named and non-neighborhoods are not', () => {
  const names = new Set(baltimoreTiles().flatMap((t) => (t.hoods ?? []).map((h) => h.name)));
  for (const n of ['Mount Vernon', 'Seton Hill', 'Downtown West', 'Federal Hill', 'Downtown']) assert.ok(names.has(n), `${n} is read`);
  assert.ok(![...baltimoreTiles().flatMap((t) => t.hoods ?? [])].find((h) => h.name === 'Downtown')!.subtype.startsWith('neigh'), 'Downtown is a macrohood');
  assert.ok(!names.has('McKeldin Plaza'), 'a microhood is a plaza, not a neighborhood');
  assert.ok(!names.has('Silo Point Community Association') && !names.has('McHenry Pointe Homeowners Association'), 'an association is not a neighborhood (the owner, Nov 12)');
  assert.ok(!names.has('Baltimore'), 'a county is not a neighborhood');
  // Synthetic: maritime, unnamed, and a locality are left out; a plain neighborhood stays.
  const t = outlineTileFrom(0, 0, 'r', 1, {
    division_area: [area('neighborhood', 'Harbour', 'a', { class: 'maritime' }), area('neighborhood', null, 'b'), area('neighborhood', 'Riverside', 'c'), area('macrohood', 'Greater Riverside', 'd'), area('locality', 'Elsewhere', 'e')],
    division: [],
  });
  assert.deepEqual((t.hoods ?? []).map((h) => h.name).sort(), ['Greater Riverside', 'Riverside']);
  // A shape lying in two tiles is one neighborhood, its pieces merged by id.
  const mv = baltimoreSet().hoods!.filter((h) => h.name === 'Mount Vernon');
  assert.equal(mv.length, 1);
  assert.ok(mv[0].polygons.length >= 2, 'pieces from both tiles');
  const [lon, lat] = mv[0].at;
  assert.ok(lon > mv[0].bbox[0] && lon < mv[0].bbox[2] && lat > mv[0].bbox[1] && lat < mv[0].bbox[3]);
  // Tiles stored before the decoder are read again.
  assert.equal(tileCurrent({ release: '2026-10-21.0#sub1' }), false);
  assert.equal(tileCurrent({ release: stampRelease('2026-10-21.0') }), true);
  assert.notEqual(OUTLINE_DECODE, 'sub1');
  // Borders (z10) are not cut for neighborhoods: they are drawn from the z12 read only.
  assert.equal(outlineSet([outlineTileFrom(0, 0, 'r', 1, { division_area: [area('neighborhood', 'Riverside', 'c')], division: [] }, 10)]).hoods?.length ?? 0, 0);
});
