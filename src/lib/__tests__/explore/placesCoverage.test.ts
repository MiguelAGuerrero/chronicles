/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Remarkable and public, RP17: the coverage benchmark's pure parts. Written before the code.
const later = (path: string): Promise<Record<string, unknown>> => import(String(path));

test('RP17: the benchmark matches a Wikidata item to a place and names why a miss was missed', async () => {
  const m = await later('../../../../scripts/places-archive/coverage.mjs') as {
    isDestination: (item: { p31: string[]; listed?: boolean; nhl?: boolean; dissolved?: boolean; links?: number }) => boolean;
    outcome: (item: { name: string; at: [number, number] }, seen: { places: { name: string; at: [number, number]; mark: boolean }[]; raw: { name: string; at: [number, number] }[] }) => string;
  };
  const at: [number, number] = [-75.38, 40.62];
  // Structural only: a listing or a pinned public type, standing, not a district; never sitelinks.
  assert.equal(m.isDestination({ p31: ['Q16970'], listed: true }), true);
  assert.equal(m.isDestination({ p31: ['Q4830453'], links: 120 }), false, 'a well-known company is no destination');
  assert.equal(m.isDestination({ p31: ['Q15243209'], listed: true }), false, 'a district is an area');
  assert.equal(m.isDestination({ p31: ['Q16970'], listed: true, dissolved: true }), false);
  const item = { name: 'Central Moravian Church', at };
  assert.equal(m.outcome(item, { places: [{ name: 'Central Moravian Church', at, mark: true }], raw: [] }), 'shown');
  assert.equal(m.outcome(item, { places: [{ name: 'Central Moravian Church', at, mark: false }], raw: [] }), 'stopped by the name rule');
  assert.equal(m.outcome(item, { places: [], raw: [{ name: 'Central Moravian Church', at }] }), 'dropped by the adapter');
  assert.equal(m.outcome(item, { places: [], raw: [] }), 'not in the tiles');
  assert.equal(m.outcome(item, { places: [{ name: 'Central Moravian Church', at: [at[0] + 0.01, at[1]], mark: true }], raw: [] }), 'not in the tiles', 'a namesake 800 m away is another place');
});

test('remarkable-and-public audit 8: the benchmark measures reach over walkable ways, matches "Jim Thorpe", and a shared town word is no match', async () => {
  const m = await later('../../../../scripts/places-archive/coverage.mjs') as {
    similar: (a: string, b: string) => boolean; areaKey?: (s: string) => string; walkable?: (cls: string) => boolean;
  };
  assert.equal(m.similar('Moravian Museum', 'Moravian Book Shop'), false, '"moravian" alone is the town\'s word');
  assert.equal(m.similar('Central Moravian Church', 'Central Moravian Church'), true);
  assert.equal(m.similar('Hugh Moore Park', 'Hugh Moore Historical Park'), true);
  assert.equal(m.areaKey?.('Jim Thorpe'), 'jimthorpe');
  for (const c of ['rail', 'transit', 'ferry', 'aerialway', 'motorway']) assert.equal(m.walkable?.(c), false, c);
  for (const c of ['minor', 'path', 'service', 'tertiary', 'primary']) assert.equal(m.walkable?.(c), true, c);
});

// Presence and kinds, PK15: the gate's measurement, written before the code.
test('PK15: the gate report lists names and says overlap in words, no percentage', async () => {
  const m = await later('../../../../scripts/places-archive/coverage.mjs') as {
    gateReport?: (areas: { name: string; held: string[]; apart: { historyAlone: number; cultureAlone: number; both: number } }[]) => string;
  };
  assert.equal(typeof m.gateReport, 'function');
  const r = m.gateReport!([
    { name: 'Lititz', held: ['General Sutter Inn', 'Lititz Springs Park'], apart: { historyAlone: 1, cultureAlone: 0, both: 2 } },
    { name: 'Coplay', held: [], apart: { historyAlone: 0, cultureAlone: 0, both: 1 } },
  ]);
  assert.match(r, /General Sutter Inn/);
  assert.match(r, /Lititz Springs Park/);
  assert.match(r, /Coplay/);
  assert.ok(!/%|percent|\d+\s*(of|\/)\s*\d+/i.test(r), r);
});
