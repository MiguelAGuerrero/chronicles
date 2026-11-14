/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createReadQueue, type ExploreResult } from '../../explore/exploreQueue';
import type { LngLat } from '../../types';

// The explore reads' queue, run with a fake read (no ports for the explore reads: the owner's cluster call waits).

const fix: LngLat = [-71.4, 41.812];
const probe: LngLat = [-71.39, 41.82];
/** A read that resolves when told, and the centres it was asked for. */
function fakeRead() {
  const asked: LngLat[] = [];
  const ends: ((r: ExploreResult) => void)[] = [];
  const read = (centre: LngLat) => {
    asked.push(centre);
    return new Promise<ExploreResult>((resolve) => ends.push(resolve));
  };
  return { read, asked, end: (i: number, r: ExploreResult = { ok: true, areas: [] }) => ends[i](r) };
}
const tick = () => new Promise((r) => setImmediate(r));
const SRC = join(__dirname, '../../explore/useExplore.ts');

// tend explore audit 11 (auditor 3): tend explore 14 asked whether a read ran, but `maybeRead` decides where to read first
// (the tile build, the kept reads, the archive): a capture made in that window was handled against the items loaded then.
test('tend explore audit 11: a caller holding the queue makes it pending before its read runs, and lets go after', async () => {
  const f = fakeRead();
  const q = createReadQueue(f.read);
  let decide: () => void = () => {};
  const held = q.hold(() => new Promise<void>((r) => (decide = r)));
  assert.equal(q.running(), false, 'no read runs yet');
  assert.equal(q.pending(), true, 'but one is on its way: a capture waits');
  decide();
  await held;
  assert.equal(q.pending(), false);
});

test('tend explore audit 11: a running read is pending until it ends', async () => {
  const f = fakeRead();
  const q = createReadQueue(f.read);
  const r = q.read(fix, { remember: false }, () => false);
  assert.equal(q.pending(), true);
  f.end(0);
  await r;
  assert.equal(q.pending(), false);
});

test('tend explore audit 11: the walk screen holds the queue while it decides, and its captures wait while it is pending', () => {
  const src = readFileSync(SRC, 'utf8');
  const maybeRead = src.slice(src.indexOf('const maybeRead = useCallback'), src.indexOf('}, [loadKnown, loadItems, readAt]);'));
  assert.match(maybeRead, /await exploreHold\(async \(\) => \{\s*\n\s*const build = await exploreBuild\(\);/, 'maybeRead holds the queue from its first await');
  const route = src.slice(src.indexOf('for (const p of routeProbes(routePath))') - 200, src.indexOf('for (const p of routeProbes(routePath))'));
  assert.match(route, /await exploreHold\(async \(\) => \{\s*$/, 'the route loop holds the queue');
  assert.match(src, /reading: explorePending\(\)/, 'captures wait while a read is pending');
});
