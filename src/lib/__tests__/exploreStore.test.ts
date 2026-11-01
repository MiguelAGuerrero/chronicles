/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVED_STORES, KEPT_STORES } from '../db/stores';
import { areaFromRow, areaToRow, findFromRow, findToRow, itemFromRow, itemToRow, readFromRow, readToRow } from '../db/exploreRow';
import type { ChecklistArea, ChecklistItem, ExploreRead, Find } from '../explore/explore';

// Slice 5 of v1 (explore): E13's storage, written before the code.

test('E13: checklists and finds are kept; where reads happened is derived (E4: a build change reads again)', () => {
  for (const s of ['checklist_area', 'checklist_item', 'find']) {
    assert.ok(KEPT_STORES.includes(s), `${s} is kept`);
    assert.ok(!DERIVED_STORES.includes(s));
  }
  assert.ok(DERIVED_STORES.includes('explore_read'));
});

test('E13: rows round-trip through SQLite columns', () => {
  const area: ChecklistArea = { key: 'k', level: 'neighborhood', name: 'Fox Point', at: [-71.4, 41.8], build: 'b1', built_at: 5, count: 3 };
  assert.deepEqual(areaFromRow(areaToRow(area)), area);
  const item: ChecklistItem = { key: 'p', area_key: null, name: 'Mural', category: 'art', kind: 'public_art', at: [-71.4, 41.8], generic: true };
  assert.deepEqual(itemFromRow(itemToRow(item)), item);
  const find: Find = { ...item, area_key: 'k', walk_id: 'w', capture_id: 'c', found_at: 9, generic: false };
  assert.deepEqual(findFromRow(findToRow(find)), find);
  const read: ExploreRead = { key: 'r', centre: [-71.4, 41.8], build: 'b1', read_at: 3, candidates: [{ level: 'neighborhood', name: 'H', at: [-71.4, 41.8], reachM: 1000 }] };
  assert.deepEqual(readFromRow(readToRow(read)), read);
});
