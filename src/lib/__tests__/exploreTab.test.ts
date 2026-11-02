/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaInView, tabMarks } from '../explore/exploreTab';
import type { ChecklistArea, ChecklistItem, Find } from '../explore/explore';
import type { LandingRow } from '../landing/view';
import type { LngLat } from '../types';

const O: LngLat = [-71.4, 41.812];
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const area: ChecklistArea = { key: 'n:fox', level: 'neighborhood', name: 'Fox Point', at: east(100), build: 'b', built_at: 1, count: 3 };
const item = (key: string, name: string, category: ChecklistItem['category'], at: LngLat): ChecklistItem => ({ key, area_key: area.key, name, category, kind: 'history' as ChecklistItem['kind'], at, generic: false });
const items = [item('a', 'Hessian Memorial', 'history', east(50)), item('b', 'Gano Park', 'parks', east(400)), item('c', 'Far Museum', 'culture', east(5000))];
const finds: Find[] = [{ key: 'a', area_key: area.key, walk_id: 'w', capture_id: 'c', found_at: 1, name: 'Hessian Memorial', category: 'history', kind: 'history' as Find['kind'], at: east(50), generic: false }];
const landing = { key: 'l', centre: east(1100), build: 'b', rules: 'r', analyzed_at: 1, analysis: { strips: [{ name: 'Thayer Street' }, { name: 'Angell Street' }], pockets: [] } } as unknown as LandingRow;

test('NV16: the drawer names the area in view: its checklist area, with its busy streets', () => {
  const v = areaInView(O, [area], [landing], items, finds);
  assert.equal(v.name, 'Fox Point');
  assert.deepEqual(v.streets, ['Thayer Street', 'Angell Street']);
});

test('NV14: places to find by kind only, finds by name, and no counts anywhere', () => {
  const v = areaInView(O, [area], [landing], items, finds);
  assert.deepEqual(v.toFind, ['Parks & green spaces'], 'the found memorial is not still to find; the far museum is outside the area');
  assert.deepEqual(v.found, ['Hessian Memorial']);
  const all = [v.name, ...v.streets, ...v.toFind, ...v.found].join(' ');
  assert.ok(!/\d+\s*of\s*\d+/.test(all) && !/\d/.test(all), `no counts (${all})`);
});

test('NV16: with nothing remembered nearby, the drawer says to look around', () => {
  const v = areaInView(east(20000), [area], [landing], items, finds);
  assert.equal(v.name, null);
  assert.deepEqual(v.streets, []);
});

test('NV14: marks on the map: unfound places as "?", finds as found pins', () => {
  const m = tabMarks(items.slice(0, 2), finds);
  assert.deepEqual(m.map((x) => [x.id, x.revealed, !!x.found]), [['a', true, true], ['b', false, false]]);
});
