/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { archivePlace } from '../../discovery/archivePois';
import { barsOf } from '../../discovery/bars';
import { kindRows, refineRead } from '../../discovery/refinements';
import type { Kind, Place } from '../../discovery/types';
import { findFor, KINDS, parseHidden, visibleMarks, type ChecklistItem } from '../../explore/explore';
import { ARCHIVE_CLASS_NAMES } from '../../presence/presence';
import type { LngLat } from '../../types';

// More attractions (specs/more-attractions, MA1-MA9; decision 0197), written from the spec before the code.

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261117';
const one = (cls: string, name = 'X', p: LngLat = O) => refineRead([archivePlace(name, cls, p, V)].filter((x): x is Place => !!x), { archive: [] })[0];
const item = (p: Place): ChecklistItem => ({ key: p.key, area_key: 'a', name: p.name, category: p.category, kind: p.kind!, at: p.at, generic: p.generic });
const K = (s: string) => s as Kind;
const label = (id: string) => KINDS.find((k) => k.id === id)?.label;

test('MA1: an archive museum no listing names shows within range and a capture beside it finds it', { todo: 'test first' }, () => {
  const p = one('museum_by_type', 'Mid-Atlantic Air Museum', at(40));
  assert.ok(p, 'the class is known');
  const it = item(p);
  assert.equal(visibleMarks({ items: [it], here: O, rangeM: 100, found: new Set(), hidden: parseHidden(null, null), revealed: new Set() }).length, 1);
  assert.equal(findFor(at(30), [it], new Set())?.name, 'Mid-Atlantic Air Museum');
});

test('MA2: a museum by type lights Culture alone; a listed museum still lights Culture and History', { todo: 'test first' }, () => {
  const byType = one('museum_by_type', 'Mid-Atlantic Air Museum');
  assert.equal(byType?.category, 'culture');
  assert.equal(byType?.kind, 'museums');
  assert.deepEqual(barsOf(byType), ['culture']);
  assert.deepEqual(barsOf(one('museum', 'Moravian Museum')), ['culture', 'history']);
});

test('MA3: a nature reserve is under Parks and gardens, in Nature reserves, on by default', { todo: 'test first' }, () => {
  const p = one('nature_reserve', 'Erie National Wildlife Refuge');
  assert.equal(p?.category, 'parks');
  assert.equal(p?.kind, 'nature_reserves');
  assert.equal(label('nature_reserves'), 'Nature reserves');
  assert.equal(kindRows(KINDS, new Set()).find((r) => (r.kind.id as string) === 'nature_reserves')?.depth, 1);
  assert.ok(!parseHidden(null, null).has(K('nature_reserves')));
});

test('MA4: amusement and water parks are under Zoos, aquariums and amusement parks, kept off for a reader who had zoos off', { todo: 'test first' }, () => {
  assert.equal(one('amusement_park', 'Dorney Park')?.kind, 'attractions');
  assert.equal(label('attractions'), 'Zoos, aquariums and amusement parks');
  const all = KINDS.map((k) => k.id);
  assert.ok(parseHidden(JSON.stringify(['attractions']), JSON.stringify(all)).has(K('attractions')));
});

test('MA5: a pier or boardwalk is under Buildings and structures, in Piers and boardwalks, on by default', { todo: 'test first' }, () => {
  const p = one('pier', 'Steel Pier');
  assert.equal(p?.category, 'history');
  assert.equal(p?.kind, 'piers');
  assert.equal(label('piers'), 'Piers and boardwalks');
  assert.ok(!parseHidden(null, null).has(K('piers')));
});

test('MA6: suspension bridges are Bridges, national monuments are Monuments, every new garden type a Garden', { todo: 'test first' }, () => {
  // The data side classes them (AT3, AT5): the app reads the classes it gets.
  assert.equal(one('bridge', 'Roebling Bridge')?.kind, 'bridges');
  assert.equal(one('monument', 'Statue of Liberty National Monument')?.kind, 'monuments');
  assert.equal(one('garden', 'Peace Garden')?.kind, 'gardens');
});

test('MA7: the app pins chronicles-data\'s contract v6, its class names exactly the archive table', { todo: 'test first' }, () => {
  const sources = JSON.parse(readFileSync(join(__dirname, 'contract', 'sources.json'), 'utf8'));
  assert.equal(sources.contractVersion, 6);
  assert.deepEqual([...ARCHIVE_CLASS_NAMES].sort(), [...sources.classes].sort());
});

test('MA8: no new label names significance or carries a number', { todo: 'test first' }, () => {
  for (const id of ['nature_reserves', 'piers', 'attractions']) {
    const l = label(id) ?? '';
    assert.ok(l.length > 0, id);
    assert.doesNotMatch(l, /notable|remarkable|champion|landmark|listed|wonder|famous|\d/i, id);
  }
});
