import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNavStore } from '../../nav/store/shell';
import * as scenic from '../../nav/scenic';
import type { RouteOption } from '../../nav/scenic';
import type { Waypoint } from '../../nav/types';
import { createRouteLeanings, ROUTE_LEANINGS_KEY } from '../../routeLeanings/shell';
import { fakePorts } from '../fakes';

// specs/storefronts: the route leaning says storefronts (SF8), and a leaning saved under the old word holds (SF12).

test('SF8: the leaning is Storefronts, and a route leaning on it is titled "Along storefronts"', () => {
  assert.ok((scenic.LEANINGS as readonly string[]).includes('storefronts'));
  const words = (scenic as unknown as { LEANING_WORDS: Record<string, { label: string; note: string }> }).LEANING_WORDS;
  assert.equal(words.storefronts.label, 'Storefronts');
  assert.equal(words.storefronts.note, 'Along streets of shops and cafés, the high street');
  const o = { leanings: ['storefronts'], route: { coords: [], distanceM: 1000, durationS: 700, steps: [] }, passes: { parks: [], streets: [], found: [], unfound: 0 } } as unknown as RouteOption;
  assert.equal(scenic.rowWords(o, 'km').title, 'Along storefronts');
});

test('SF12: a leaning saved as busy is read as storefronts, on or off', async () => {
  const on = fakePorts();
  await on.db.setMeta(ROUTE_LEANINGS_KEY, JSON.stringify(['green', 'busy']));
  const a = createRouteLeanings(on);
  await a.load();
  assert.deepEqual(a.store.get(), ['green', 'storefronts'], 'saved on, still on');
  const off = fakePorts();
  await off.db.setMeta(ROUTE_LEANINGS_KEY, JSON.stringify(['green', 'sights']));
  const b = createRouteLeanings(off);
  await b.load();
  assert.deepEqual(b.store.get(), ['green', 'sights'], 'saved off, still off');
});

test('SF12: a navigation in progress that leaned on busy streets leans on storefronts after a reload', async () => {
  const p = fakePorts();
  const dest = { at: [-71.4, 41.812], label: 'Fox Point', kind: 'place', leanings: ['busy'] } as unknown as Waypoint;
  await createNavStore(p).saveNav('w1', dest);
  const back = await createNavStore(p).loadNav('w1');
  assert.deepEqual(back?.leanings, ['storefronts']);
});
