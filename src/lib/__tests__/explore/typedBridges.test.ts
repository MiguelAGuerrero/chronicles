/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presenceTally, ringOf, stepsShown } from '../../atlas/atlas';
import { archivePlace } from '../../discovery/archivePois';
import { refineRead } from '../../discovery/refinements';
import type { Place } from '../../discovery/types';
import { archiveUnnamedLabel, subsetOf } from '../../presence/presence';
import type { LngLat } from '../../types';

// Typed bridges (specs/more-attractions MA10; decision 0198, the owner's call of Nov 18): chronicles-data's contract v8
// adds `suspension_bridge`, a suspension bridge known only by its Wikidata type, with no National Register listing.
// Listed and covered bridges stay `bridge`.

const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const V = 'us-20261118';
const read = (places: (Place | null)[]) => refineRead(places.filter((p): p is Place => !!p), { archive: [] });
const one = (cls: string, name: string, p: LngLat = O) => read([archivePlace(name, cls, p, V)])[0];
const history = (cls: string, names: string[]) => {
  const places = names.map((n, i) => archivePlace(n, cls, at(i * 30, 40), V)!);
  return stepsShown({ steps: {} as never, tally: presenceTally(ringOf(places, null, O).ring, O) } as never, new Set()).history;
};

test('typed bridges: a suspension bridge by type is a Bridges place that lights no History (MA10)', () => {
  const p = one('suspension_bridge', 'Lambertville Suspension Bridge', at(0, 40));
  assert.ok(p, 'a place: the app knows the class');
  assert.equal(p?.category, 'history', 'the category of a bridge');
  assert.equal(p?.kind, 'bridges', 'in the Bridges row under Buildings and structures');
  assert.equal(subsetOf(p!.classes!), 'bridges');
  assert.ok(p?.classes?.includes('by_type'), 'held for its type');
  assert.ok(!p?.classes?.includes('recorded'), 'never a listing');
  assert.ok(!p?.classes?.includes('historic'));
  // It lights no History, whatever its name; a listed bridge lights it as before.
  assert.equal(history('suspension_bridge', ['Lambertville Suspension Bridge', 'Old Chain Bridge', 'Riegelsville Bridge']), 0, 'typed bridges on, History unlit');
  assert.ok(history('bridge', ['Knechts Covered Bridge', 'Sheards Mill Covered Bridge', 'Erwinna Covered Bridge']) > 0, 'listed bridges light History');
  const listed = one('bridge', 'Knechts Covered Bridge');
  assert.equal(listed?.kind, 'bridges');
  assert.ok(listed?.classes?.includes('recorded'));
  // It never comes unnamed.
  assert.equal(archiveUnnamedLabel('suspension_bridge'), null);
  assert.equal(archivePlace('', 'suspension_bridge', O, V), null);
});
