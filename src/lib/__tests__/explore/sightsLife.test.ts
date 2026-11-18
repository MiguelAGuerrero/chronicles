/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as atlasModule from '../../atlas/atlas';
import type { AtlasPlace, Familiarity, Listed, Steps } from '../../atlas/atlas';
import type { CategoryId, Kind } from '../../discovery/types';
import { placesFromArchive } from '../../discovery/archivePois';
import { placesFromTilePois } from '../../discovery/tilePois';
import { parseHidden } from '../../explore/explore';
import type { LngLat } from '../../types';

// Sights and Local life, phase 1 (specs/sights-and-local-life, decisions 0197, 0198). Written before the code: the module's
// new exports are read through `any` until they exist.

const A = atlasModule as any;
const { ATLAS_ORDER, presenceTally, stepsFrom, characterLine, tileLabel, marksExplained, ringOf } = atlasModule;
const O: LngLat = [-75.19, 40.98];
const z: Steps = { history: 0, art: 0, culture: 0, parks: 0, viewpoints: 0, food: 0, shops: 0, nightlife: 0 };
const SIGHTS: CategoryId[] = ['history', 'art', 'culture', 'parks', 'viewpoints'];
const LIFE: CategoryId[] = ['food', 'shops', 'nightlife'];
const BUSY = /\b(busy|busier|busiest|popular|trending|lively|alive|buzzing|vibrant)\b/i;
const fam: Familiarity = { walks: 0, last: null };
const listed = (steps: Steps): Listed => ({
  area: { key: 'k', level: 'neighborhood', name: 'Main', at: O, reachM: 800, build: 'b', code: 'c', listed_at: 1, read_at: 1, failed_at: null,
    profile: { steps, strips: [], stripAt: null, marks: [], sketch: { streets: [], ring: '', parks: [] } as never, overture: null } },
  distanceM: 300, here: false,
} as unknown as Listed);
const place = (key: string, category: CategoryId, kind: Kind | undefined, o: Partial<AtlasPlace> = {}): AtlasPlace =>
  ({ key, category, at: O, markable: kind ? true : undefined, kind, ...o });

test('SG10: Sights and Local life hold every kind once, in ATLAS_ORDER', () => {
  const groups = A.KIND_GROUPS as { id: string; label: string; kinds: CategoryId[] }[];
  assert.deepEqual(groups.map((g) => g.label), ['Sights', 'Local life']);
  assert.deepEqual(groups[0].kinds, SIGHTS);
  assert.deepEqual(groups[1].kinds, LIFE);
  assert.deepEqual(groups.flatMap((g) => g.kinds), [...ATLAS_ORDER]);
});

test('SG2: a tile\'s kinds by group, in order, a group with none dropped', () => {
  const g = A.groupsPresent as (s: Steps) => { id: string; kinds: CategoryId[] }[];
  assert.deepEqual(g({ ...z, art: 1, history: 2, food: 3 }).map((x) => [x.id, x.kinds]), [['sights', ['history', 'art']], ['life', ['food']]]);
  assert.deepEqual(g({ ...z, food: 1, nightlife: 2 }).map((x) => x.id), ['life'], 'no Sights: one group, so no space between');
  assert.deepEqual(g({ ...z, parks: 1 }).map((x) => x.id), ['sights']);
  assert.deepEqual(g(z), []);
});

test('SG9: over the presence sample, the groups laid end to end are the present kinds in ATLAS_ORDER', () => {
  const g = A.groupsPresent as (s: Steps) => { kinds: CategoryId[] }[];
  const pt = (props: Record<string, string>, c: LngLat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: props });
  type Area = { name: string; at: LngLat; pois: [string, string, string, number, number][]; archive: [string, string, number, number, string][] };
  let n = 0;
  for (const file of ['presenceSample.json', 'presenceTowns.json']) {
    const d = JSON.parse(readFileSync(join(__dirname, file), 'utf8')) as { tiles: string; areas: Area[] };
    for (const a of d.areas) {
      const map = placesFromTilePois(a.pois.map(([name, cls, sub, lon, lat]) => pt({ name, class: cls, subclass: sub }, [lon, lat])) as never, d.tiles);
      const arch = placesFromArchive(a.archive.map(([name, cls, lon, lat]) => pt({ name, class: cls }, [lon, lat])) as never, 'fixture');
      const steps = ringOf(map, arch, a.at).steps;
      assert.deepEqual(g(steps).flatMap((x) => x.kinds), ATLAS_ORDER.filter((c) => steps[c] > 0), `${file} ${a.name}`);
      n++;
    }
  }
  assert.ok(n > 100, 'the sample and the towns');
});

test('SG5: a tile\'s spoken line names the groups present, in order', () => {
  const fmt = (m: number) => `${m} m`;
  const both = tileLabel(listed({ ...z, history: 1, art: 2, food: 3 }), fam, fmt);
  assert.match(both, /Sights: History: some, Art: plenty\. Local life: Food: lots\./, both);
  const life = tileLabel(listed({ ...z, food: 2 }), fam, fmt);
  assert.match(life, /Local life: Food: plenty\./, life);
  assert.doesNotMatch(life, /Sights/, 'a group with nothing present is not said');
});

test('SG7: how the marks work names both groups, in words, the ring\'s line last', () => {
  for (const extent of [undefined, 'outline', 'shape'] as const) {
    const lines = marksExplained(extent ? ({ extent } as never) : null);
    const all = lines.join(' ');
    assert.equal(all.match(/\d/), null, all);
    assert.match(all, /Sights/);
    assert.match(all, /Local life/);
    assert.match(all, /worth finding/i);
    assert.match(all, /What I.m into/, 'Sights follow the switches (SG12)');
    assert.match(all, /never turns? up as a “?\?”?/i);
    assert.match(all, /never how good/i);
    assert.match(all, /how many people go there/i, 'never how busy, in words that are not the banned word (SG11)');
    assert.match(all, /history and culture/i, 'while Culture is a Sight, a museum may count toward both');
    assert.match(lines[lines.length - 1], extent === 'outline' ? /whole outline/ : /ten-minute walk|shape/i, 'its own last line kept (TP8)');
  }
});

test('SG11: no number and no word for busyness in the groups, the line under Sights, the explanation or a tile\'s line', () => {
  const words = [...(A.KIND_GROUPS ?? []).map((g: { label: string }) => g.label), A.SIGHTS_LINE ?? '', ...marksExplained(null)];
  for (const s of [{ ...z, food: 3, shops: 3 }, { ...z, history: 2, food: 3 }, { ...z, art: 1 }] as Steps[]) words.push(characterLine(s));
  assert.ok(A.SIGHTS_LINE, 'the line under Sights exists');
  for (const w of words) {
    assert.equal(w.match(/\d/), null, w);
    assert.doesNotMatch(w, BUSY, w);
  }
});

test('SG12: a Sights kind switched off leaves its bar; back on restores it; Local life has no switch', () => {
  const ring = [
    place('m1', 'history', 'monuments'), place('m2', 'history', 'monuments'), place('m3', 'history', 'monuments'), place('m4', 'history', 'monuments'),
    place('c1', 'history', 'cemeteries'),
    place('f1', 'food', undefined), place('f2', 'food', undefined), place('f3', 'food', undefined), place('f4', 'food', undefined),
    // A historic museum lights History and Culture (PK1).
    place('mu', 'culture', 'museums', { classes: ['museum', 'recorded', 'historic'] as never }),
  ];
  const t = presenceTally(ring, O);
  const on = stepsFrom(t, new Set());
  assert.equal(on.history, 2, 'four monuments, a cemetery and the museum: a handful');
  assert.equal(on.culture, 1);
  assert.equal(on.food, 1);
  const off = stepsFrom(t, new Set<Kind>(['monuments', 'cemeteries', 'museums']));
  assert.equal(off.history, 0, 'every History kind off: none');
  assert.equal(off.culture, 0, 'the museum off counts toward neither of its bars');
  assert.equal(off.food, 1, 'Local life never changes with the switches');
  assert.deepEqual(stepsFrom(t, new Set()), on, 'back on restores it');
  // With the switches as they start, the stored steps are what they were (SG9).
  assert.deepEqual(stepsFrom(t, parseHidden(null, null)), on);
});

test('SG12: a profile from before a15 is read again', () => {
  assert.match(atlasModule.ATLAS_CODE, /^a15\./);
});

test('SG13: a tile\'s line leads with Sights, Local life only when there is no Sight', () => {
  assert.equal(characterLine({ ...z, history: 2, parks: 2, food: 3, shops: 3 }), 'Plenty of history and green space');
  assert.equal(characterLine({ ...z, history: 3, food: 3, art: 1 }), 'Lots of history');
  assert.equal(characterLine({ ...z, food: 3, shops: 3 }), 'Lots of food and shops');
  assert.equal(characterLine({ ...z, art: 1, food: 3 }), 'A little art');
  assert.equal(characterLine({ ...z, history: 1, art: 1, culture: 1, parks: 1, food: 1 }), 'A little of everything');
  assert.equal(characterLine(z), 'Not much on the map here');
  assert.equal(characterLine({ ...z, food: 3 }, true), '', 'a thin area says nothing (SG8)');
});

test('SG2: eight kinds in two groups fit a selected tile on a 320 px phone', () => {
  // A tile at 320 px is round(320 * 0.78) = 250 px (AtlasCarousel's cardW), less 2 x 12 px padding and the selected
  // tile's 2 px border on each side: 222 px inside (the plan review's A1).
  const s = A.STRIP as { chip: number; gap: number; groupGap: number };
  const width = 8 * s.chip + 6 * s.gap + s.groupGap;
  assert.ok(width <= 222, `${width} px`);
  assert.ok(s.groupGap >= 3 * s.gap, 'the space between the groups reads as wider than between kinds');
});
