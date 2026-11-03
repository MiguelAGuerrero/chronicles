import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Area, WalkArea } from '../areas/types';
import type { Db } from '../db/types';
import type { Mark, Offered, Place, Recall } from '../discovery/types';
import type { LandingRow } from '../landing/view';
import type { Capture, StreetSegment, VisitedSegment, Walk, WalkSummary } from '../types';

/**
 * What every `Db` must do, run against each implementation that can run in
 * Node: the in-memory fake (`fakes/memoryDb`) and the IndexedDB store
 * (`db/index.web.ts` over fake-indexeddb). It pins the behavior shells rely
 * on, so the fake can't drift from the real store unnoticed. SQLite can't run
 * in Node; `db/index.native.ts` is held to the same behavior by hand.
 */
export function dbContract(name: string, fresh: () => Promise<Db>) {
  const LON = -71.4, LAT = 41.812;
  const walk = (id: string, started_at: number, more: Partial<Walk> = {}): Walk => ({
    id, started_at, ended_at: null, title: null, epilogue: null, open: false, area: null, snapped_build: null, ...more,
  });
  const capture = (id: string, walk_id: string, t: number, more: Partial<Capture> = {}): Capture => ({
    id, walk_id, t, lat: LAT, lon: LON, kind: 'text', file_path: null, body: 'hi', segment_id: null, ...more,
  });
  const segment = (id: string, dLon = 0, build = 'b1'): StreetSegment => ({
    id, name: 'Main St', kind_detail: 'residential', length_m: 80, build,
    geometry: [[[LON + dLon, LAT], [LON + dLon + 0.001, LAT]]],
  });
  const visit = (segment_id: string, walk_id: string, street_key = 'name:main st'): VisitedSegment => ({
    segment_id, walk_id, covered_fraction: 1, first_t: 1, street_key,
  });
  const summary = (walk_id: string, build = 'b1'): WalkSummary => ({
    walk_id, build, distance_m: 100, duration_ms: 60_000, new_streets: 1, streets_walked: 1,
    photos: 0, videos: 0, voices: 0, notes: 1, streets_read: true,
  });
  const area = (key: string): Area => ({ key, level: 'town', name: key, parent_key: null, lon: LON, lat: LAT, rules: 'r1' });
  const walkArea = (walk_id: string, area_key: string): WalkArea => ({
    walk_id, area_key, metres: 50, first_t: 1, last_t: 2, lon: LON, lat: LAT,
  });
  const place = (key: string, at: [number, number] = [LON, LAT]): Place => ({
    key, name: key, category: 'art', at, generic: false, build: 'b1', markable: true,
  });
  const offer = (key: string, offered_at: number): Offered => ({
    key, name: key, category: 'art', at: [LON, LAT], generic: false, offered_at, origin: 'scan',
  });
  const mark = (id: string, walk_id: string | null, created_at: number, more: Partial<Mark> = {}): Mark => ({
    id, walk_id, key: `k-${id}`, name: id, category: 'art', at: [LON, LAT], generic: false, origin: 'scan',
    state: 'open', created_at, resolved_at: null, capture_id: null, ...more,
  });
  const box: [number, number, number, number] = [LON - 0.01, LAT - 0.01, LON + 0.01, LAT + 0.01];

  describe(`Db contract: ${name}`, () => {
    test('walks: newest first, the open one found, patches merge, a missing id is a no-op', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2, { open: true }));
      assert.deepEqual((await db.listWalks()).map((w) => w.id), ['b', 'a']);
      assert.equal((await db.getOpenWalk())?.id, 'b');
      await db.updateWalk('b', { open: false, ended_at: 5 });
      assert.equal(await db.getOpenWalk(), null);
      assert.deepEqual(await db.getWalk('b'), walk('b', 2, { open: false, ended_at: 5 }));
      await db.updateWalk('missing', { title: 'x' });
      assert.equal(await db.getWalk('missing'), null);
    });

    test('a walk id is used once', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await assert.rejects(db.createWalk(walk('a', 2)));
      assert.equal((await db.getWalk('a'))?.started_at, 1);
    });

    test('rows come out as copies: changing one changes nothing stored', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      const w = (await db.getWalk('a'))!;
      w.title = 'changed';
      assert.equal((await db.getWalk('a'))?.title, null);
    });

    test('points: per walk, in time order', async () => {
      const db = await fresh();
      const p = (walk_id: string, t: number) => ({ walk_id, t, lat: LAT, lon: LON, accuracy_m: 5, speed: 1, course: null });
      await db.appendPoints([p('a', 3), p('a', 1), p('b', 2)]);
      await db.appendPoints([]);
      assert.deepEqual((await db.getPoints('a')).map((x) => x.t), [1, 3]);
    });

    test('captures: per walk in time order, by id skipping missing ones, in bounds only with a place', async () => {
      const db = await fresh();
      await db.addCapture(capture('c2', 'a', 2));
      await db.addCapture(capture('c1', 'a', 1));
      await db.addCapture(capture('c3', 'b', 3, { lat: null, lon: null }));
      await db.addCapture(capture('c4', 'b', 4, { lon: LON + 1 }));
      await db.updateCapture('c1', { caption: 'hello', caption_y: 0.5 });
      assert.deepEqual((await db.getCaptures('a')).map((c) => c.id), ['c1', 'c2']);
      assert.equal((await db.getCaptures('a'))[0].caption, 'hello');
      assert.deepEqual((await db.getCapturesByIds(['c2', 'nope', 'c1'])).map((c) => c.id), ['c1', 'c2']);
      assert.deepEqual((await db.capturesIn(box)).map((c) => c.id), ['c1', 'c2']);
      await assert.rejects(db.addCapture(capture('c1', 'a', 9)));
    });

    test('pauses: at most one open per walk; ending closes it; in start order', async () => {
      const db = await fresh();
      await db.startPause('a', 10);
      await db.startPause('a', 20); // already paused: ignored
      assert.deepEqual(await db.getPauses('a'), [{ walk_id: 'a', started_at: 10, ended_at: null }]);
      await db.endPause('a', 30);
      await db.endPause('a', 40); // nothing open: ignored
      await db.startPause('a', 50);
      assert.deepEqual(await db.getPauses('a'), [
        { walk_id: 'a', started_at: 10, ended_at: 30 },
        { walk_id: 'a', started_at: 50, ended_at: null },
      ]);
      assert.deepEqual(await db.getPauses('b'), []);
    });

    test('segments: found by the bounds they touch', async () => {
      const db = await fresh();
      await db.putSegments([segment('near'), segment('far', 1)]);
      await db.putSegments([]);
      assert.deepEqual((await db.getSegmentsIn(box)).map((s) => s.id), ['near']);
      assert.deepEqual((await db.getSegmentsIn(box))[0], segment('near'));
    });

    test('saveSnap: replaces the walk\'s visited rows and summary, and marks it snapped only when complete', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.saveSnap('a', [segment('s1')], [visit('s1', 'a'), visit('s2', 'a')], summary('a'), null, true);
      assert.equal((await db.getWalk('a'))?.snapped_build, 'b1');
      await db.saveSnap('a', [], [visit('s3', 'a')], summary('a', 'b2'), null, false);
      assert.deepEqual((await db.getVisited('a')).map((v) => v.segment_id), ['s3']);
      assert.equal((await db.listSummaries())[0].build, 'b2');
      assert.equal((await db.getWalk('a'))?.snapped_build, null);
      assert.deepEqual((await db.getSegmentsIn(box)).map((s) => s.id), ['s1']);
    });

    test('saveSnap: placing replaces the walk\'s areas and drops areas no walk uses; no placement keeps them', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.saveSnap('a', [], [], summary('a'), { areas: [area('Old'), area('Shared')], rows: [walkArea('a', 'Old'), walkArea('a', 'Shared')] });
      await db.saveSnap('b', [], [], summary('b'), { areas: [area('Shared')], rows: [walkArea('b', 'Shared')] });
      await db.saveSnap('a', [], [], summary('a'), { areas: [area('New')], rows: [walkArea('a', 'New')] });
      assert.deepEqual((await db.listAreas()).map((x) => x.key).sort(), ['New', 'Shared']);
      assert.deepEqual((await db.listWalkAreas()).map((r) => `${r.walk_id}:${r.area_key}`).sort(), ['a:New', 'b:Shared']);
      await db.saveSnap('a', [], [], summary('a'), null);
      assert.deepEqual((await db.listWalkAreas()).map((r) => `${r.walk_id}:${r.area_key}`).sort(), ['a:New', 'b:Shared']);
    });

    test('visited: every credited id, and street keys of earlier walks only', async () => {
      const db = await fresh();
      await db.createWalk(walk('old', 1));
      await db.createWalk(walk('new', 5));
      await db.saveSnap('old', [], [visit('s1', 'old', 'name:a st')], summary('old'));
      await db.saveSnap('new', [], [visit('s2', 'new', 'name:b st')], summary('new'));
      assert.deepEqual([...(await db.visitedSegmentIds())].sort(), ['s1', 's2']);
      assert.deepEqual([...(await db.streetKeysBefore(5))], ['name:a st']);
    });

    test('places: same key replaces; found inside the bounds', async () => {
      const db = await fresh();
      await db.putPlaces([place('p1'), place('p2', [LON + 1, LAT]), place('p3', [LON, LAT + 1])]);
      await db.putPlaces([{ ...place('p1'), name: 'renamed' }]);
      await db.putPlaces([]);
      assert.deepEqual(await db.placesIn(box), [{ ...place('p1'), name: 'renamed' }]);
    });

    test('offered: the first offer of a place wins, from addOffered or a scan', async () => {
      const db = await fresh();
      await db.addOffered([offer('k1', 1)]);
      await db.addOffered([offer('k1', 2), offer('k2', 3)]);
      await db.saveScan({ replace: [], marks: [], offered: [offer('k2', 4)] });
      assert.deepEqual((await db.listOffered()).map((o) => `${o.key}@${o.offered_at}`).sort(), ['k1@1', 'k2@3']);
    });

    test('saveScan: replaces only open marks; home marks are those with no walk; in creation order', async () => {
      const db = await fresh();
      await db.saveScan({ replace: [], marks: [mark('m1', null, 2), mark('m2', null, 1), mark('m3', 'w', 3, { state: 'found' })], offered: [] });
      await db.saveScan({ replace: ['m1', 'm3', 'missing'], marks: [mark('m4', 'w', 4)], offered: [] });
      assert.deepEqual((await db.listMarks(null)).map((m) => `${m.id}:${m.state}`), ['m2:open', 'm1:replaced']);
      assert.deepEqual((await db.listMarks('w')).map((m) => `${m.id}:${m.state}`), ['m3:found', 'm4:open']);
      await db.updateMark('m4', { state: 'dismissed', resolved_at: 9 });
      assert.equal((await db.listMarks('w'))[1].state, 'dismissed');
    });

    test('saveScan is all or nothing: a duplicate mark id changes nothing', async () => {
      const db = await fresh();
      await db.saveScan({ replace: [], marks: [mark('m1', null, 1)], offered: [] });
      await assert.rejects(db.saveScan({ replace: ['m1'], marks: [mark('m1', null, 2)], offered: [offer('k9', 1)] }));
      assert.deepEqual((await db.listMarks(null)).map((m) => `${m.id}:${m.state}:${m.created_at}`), ['m1:open:1']);
      assert.deepEqual(await db.listOffered(), []);
    });

    test('recalls: one per capture, cleared by capture', async () => {
      const db = await fresh();
      const r = (capture_id: string, fired_count = 0): Recall => ({
        capture_id, frequency: 'once', until: null, last_fired_at: null, fired_count, last_walk_id: null,
      });
      await db.setRecall(r('c1'));
      await db.setRecall(r('c1', 2));
      await db.setRecall(r('c2'));
      await db.clearRecall('c2');
      assert.deepEqual(await db.listRecalls(), [r('c1', 2)]);
    });

    test('landings: the same key replaces', async () => {
      const db = await fresh();
      const row = (analyzed_at: number) => ({ key: 'L', centre: [LON, LAT], analysis: {}, build: 'b1', rules: 'r', analyzed_at }) as unknown as LandingRow;
      await db.putLanding(row(1));
      await db.putLanding(row(2));
      assert.deepEqual((await db.listLandings()).map((l) => l.analyzed_at), [2]);
    });

    test('meta: null until set; an empty string is stored as it is', async () => {
      const db = await fresh();
      assert.equal(await db.getMeta('k'), null);
      await db.setMeta('k', 'v');
      assert.equal(await db.getMeta('k'), 'v');
      await db.setMeta('k', '');
      assert.equal(await db.getMeta('k'), '');
    });

    test('purgeDerived: drops segments and places and unmarks every walk; truth and visited rows stay', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.saveSnap('a', [segment('s1')], [visit('s1', 'a')], summary('a'));
      await db.putPlaces([place('p1')]);
      await db.saveScan({ replace: [], marks: [mark('m1', 'a', 1)], offered: [offer('k1', 1)] });
      await db.setRecall({ capture_id: 'c1', frequency: 'visit', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
      await db.purgeDerived();
      assert.deepEqual(await db.getSegmentsIn(box), []);
      assert.deepEqual(await db.placesIn(box), []);
      assert.equal((await db.getWalk('a'))?.snapped_build, null);
      assert.equal((await db.getVisited('a')).length, 1);
      assert.equal((await db.listSummaries()).length, 1);
      assert.equal((await db.listMarks('a')).length, 1);
      assert.equal((await db.listOffered()).length, 1);
      assert.equal((await db.listRecalls()).length, 1);
    });
  });
}
