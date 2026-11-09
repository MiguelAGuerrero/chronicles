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
