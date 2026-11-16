/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { characterLine, ringOf, type AtlasProfile } from '../../atlas/atlas';
import { archivePlace } from '../../discovery/archivePois';
import type { Kind } from '../../discovery/types';
import { parseHidden } from '../../explore/explore';
import type { LngLat } from '../../types';

// Small places' bars (specs/small-places SP12, SP13; decision 0182): a small place weighs by the size of the stop, only
// while its subset is on, and a switch changes the dots without reading the area again. Written before the code.

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261116';
const atlas = () => import(String('../../atlas/atlas')) as Promise<{
  presenceTally(places: unknown[], centre: LngLat): { counts: Record<string, number>; shares: Record<string, Record<string, number>> };
  stepsShown(profile: Pick<AtlasProfile, 'steps'> & { tally?: unknown }, hidden: Set<Kind>): Record<string, number>;
}>;
const arch = (cls: string, n: number, name = '') => Array.from({ length: n }, (_, i) => archivePlace(name ? `${name} ${i}` : '', cls, at(i * 30, 40), V)!);

test('SP12: four plaques light History\'s first dot with plaques on, none with them off; weights by the size of the stop', { todo: 'test first' }, async () => {
  const { presenceTally, stepsShown } = await atlas();
  const ring = ringOf(arch('marker', 4, 'Plaque'), null, O).ring;
  const tally = presenceTally(ring, O);
  assert.equal(tally.counts.history ?? 0, 0, 'plaques are never in the base count');
  assert.equal(tally.shares.plaques?.history, 1, 'four quarters');
  const profile = { steps: { history: 0 }, tally } as never;
  assert.equal(stepsShown(profile, new Set()).history, 1, 'plaques on');
  assert.equal(stepsShown(profile, parseHidden(null, null)).history, 0, 'plaques off by default');
  // One plaque is a quarter: no dot even with plaques on.
  assert.equal(stepsShown({ steps: { history: 0 }, tally: presenceTally(ringOf(arch('marker', 1, 'Lone'), null, O).ring, O) } as never, new Set()).history, 0);
  // Little libraries weigh a half; two light Culture's first dot.
  assert.equal(presenceTally(ringOf(arch('public_bookcase', 2), null, O).ring, O).shares.little_libraries?.culture, 1);
  // A community garden counts a half toward Parks always; a mural a whole toward Art always (no switch of their own).
  const fixed = presenceTally(ringOf([...arch('community_garden', 2, 'Garden'), ...arch('mural', 1, 'Mural')], null, O).ring, O);
  assert.equal(fixed.counts.parks, 1);
  assert.equal(fixed.counts.art, 1);
});

test('SP13: flipping a switch changes the dots and the character line from the stored profile alone', { todo: 'test first' }, async () => {
  const { presenceTally, stepsShown } = await atlas();
  const ring = ringOf(arch('marker', 16, 'Plaque'), null, O).ring;
  const profile = { steps: { history: 0, art: 0, food: 0, shops: 0, parks: 0, culture: 0, viewpoints: 0, nightlife: 0 }, tally: presenceTally(ring, O) } as never;
  const on = stepsShown(profile, new Set());
  const off = stepsShown(profile, new Set(['plaques' as Kind]));
  assert.equal(on.history, 2);
  assert.equal(off.history, 0);
  assert.notEqual(characterLine(on as never), characterLine(off as never));
});
