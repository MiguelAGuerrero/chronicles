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

test('tend explore audit 11: the walk screen holds the queue while it decides', () => {
  const src = readFileSync(SRC, 'utf8');
  const maybeRead = src.slice(src.indexOf('const maybeRead = useCallback'), src.indexOf('}, [loadKnown, loadItems, readAt]);'));
  assert.match(maybeRead, /await exploreHold\(async \(\) => \{\s*\n\s*const build = await exploreBuild\(\);/, 'maybeRead holds the queue from its first await');
  const route = src.slice(src.indexOf('for (const p of routeProbes(routePath))') - 200, src.indexOf('for (const p of routeProbes(routePath))'));
  assert.match(route, /await exploreHold\(async \(\) => \{\s*$/, 'the route loop holds the queue');
});

// tend explore audit 13 (auditor 5): a read waiting behind another went on to read for a route already dropped (its only
// stop was the screen's unmount), and a stopped read set the failure's 2-minute wait.
test('tend explore audit 13: another centre waits for the running read, then reads its own (tend explore 15)', async () => {
  const f = fakeRead();
  const q = createReadQueue(f.read);
  const a = q.read(fix, { remember: false }, () => false);
  const b = q.read(probe, { remember: false }, () => false);
  const same = q.read([fix[0], fix[1]], { remember: false }, () => false);
  assert.equal(same, a, 'the same centre shares the running read');
  assert.deepEqual(f.asked, [fix], 'one read at a time');
  f.end(0);
  await a;
  await tick();
  assert.deepEqual(f.asked, [fix, probe], 'the probe reads its own once the first ends');
  f.end(1);
  assert.deepEqual(await b, { ok: true, areas: [] });
});

test('tend explore audit 13: a waiter stopped meanwhile reads nothing, and says it was stopped', async () => {
  const f = fakeRead();
  const q = createReadQueue(f.read);
  let dropped = false;
  const a = q.read(fix, { remember: false }, () => false);
  const b = q.read(probe, { remember: false }, () => dropped);
  dropped = true;
  f.end(0);
  await a;
  assert.deepEqual(await b, { ok: false, stopped: true });
  assert.deepEqual(f.asked, [fix], 'no read for the dropped route');
});

test('tend explore audit 13: a read its caller stopped says so; one that failed by itself does not', async () => {
  const f = fakeRead();
  const q = createReadQueue(f.read);
  let stop = false;
  const a = q.read(fix, { remember: false }, () => stop);
  stop = true;
  f.end(0, { ok: false });
  assert.deepEqual(await a, { ok: false, stopped: true });
  const b = q.read(probe, { remember: false }, () => false);
  f.end(1, { ok: false });
  assert.deepEqual(await b, { ok: false });
});

test('tend explore audit 13: the walk screen gives route reads the route\'s stop, and a stopped read sets no failure', () => {
  const src = readFileSync(SRC, 'utf8');
  assert.match(src, /readAt\(centre, \(\) => !alive\)/, 'a route read stops with its route');
  assert.match(src, /if \(!r\.stopped\) failed\.current = /, 'only a read that failed by itself waits');
});
