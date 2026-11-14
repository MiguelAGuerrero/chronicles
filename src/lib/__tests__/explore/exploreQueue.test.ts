/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { placeKey } from '../../discovery/places';
import type { ChecklistItem } from '../../explore/explore';
import { createCaptureFinds, createReadQueue, type ExploreResult } from '../../explore/exploreQueue';
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
  assert.match(src, /createCaptureFinds\(\{ pending: explorePending \}\)/, 'captures wait while a read is pending');
});

// tend explore audit 12 (auditor 4): a capture held while a read ran could report a second "Found" (its haptic, toast and
// announcement) for a place an earlier capture was still recording: the finds known then did not hold it yet.
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((fix[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [fix[0] + x * dLon, fix[1] + y * dLat];
const item = (name: string, at: LngLat): ChecklistItem => ({ key: placeKey('culture', name, at), area_key: 'A', name, category: 'culture', kind: 'museums', at, generic: false });

test('tend explore audit 12: a place being recorded is never reported again by a capture looked at meanwhile', async () => {
  let reading = true;
  const finder = createCaptureFinds({ pending: () => reading });
  const museum = item('Museum', m(20, 0));
  const reported: string[] = [];
  let finish: () => void = () => {};
  const record = (it: ChecklistItem, id: string) => {
    reported.push(`${id}:${it.name}`);
    return new Promise<void>((r) => (finish = r));
  };
  const first = finder.look([{ id: 'c1', at: fix }, { id: 'c2', at: m(5, 0) }], [museum], new Set(), record);
  assert.deepEqual(reported, ['c1:Museum'], 'c1 finds it; c2 waits while a read runs');
  // The read ends while c1's find is still being written: c2 is looked at again before the finds hold the museum.
  reading = false;
  await finder.look([{ id: 'c2', at: m(5, 0) }], [museum], new Set(), record);
  assert.deepEqual(reported, ['c1:Museum'], 'the museum is not reported a second time');
  assert.equal(finder.isHandled('c2'), true);
  finish();
  await first;
});

test('tend explore audit 12: once the finds hold a place, it is theirs; a capture of a place found and deleted may find it again', async () => {
  const finder = createCaptureFinds({ pending: () => false });
  const museum = item('Museum', m(20, 0));
  const reported: string[] = [];
  const record = async (it: ChecklistItem, id: string) => void reported.push(`${id}:${it.name}`);
  await finder.look([{ id: 'c1', at: fix }], [museum], new Set(), record);
  await finder.look([{ id: 'c2', at: fix }], [museum], new Set([museum.key]), record);
  // The find deleted (the place can be found again on this walk, deletion audit 6): the finds no longer hold it.
  await finder.look([{ id: 'c3', at: fix }], [museum], new Set(), record);
  assert.deepEqual(reported, ['c1:Museum', 'c3:Museum']);
});

test('tend explore audit 12: the walk screen finds through the finder, with its record', () => {
  const src = readFileSync(SRC, 'utf8');
  assert.match(src, /finder\.look\([^;]*found, record, /, 'the capture effect looks through the finder');
  assert.match(src, /finder\.seen\(/, "a reload's finds are handled");
});
