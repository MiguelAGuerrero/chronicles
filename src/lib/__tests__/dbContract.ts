import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Area, WalkArea } from '../areas/types';
import type { OutlineTile } from '../areas/outlines';
import type { WalkTile } from '../walk/types';
import type { AtlasArea } from '../atlas/atlas';
import type { Db } from '../db/types';
import type { Mark, Place, Recall } from '../discovery/types';
import type { ChecklistArea, ChecklistItem, ExploreRead, Find } from '../explore/explore';
import type { LandingRow } from '../landing/view';
import type { Capture, GapDecision, Moment, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { parseEdit, type MediaEdit } from '../mediaEdit';
import { momentOf, type Flat } from '../moment';

/**
 * What every `Db` must do (FC7), run against every implementation: the in-memory fake (`fakes/memoryDb`), the
 * IndexedDB store (`db/index.web.ts` over fake-indexeddb) and, since MT11 (decision 0123), the native store
 * (`db/sqliteStore.ts` over Node's built-in SQLite, `fakes/nodeSqlite`). It pins the behavior shells rely on, so
 * no store can drift from the others unnoticed.
 *
 * Every title starts `FC7 <method>, ...: `; `db.contract.test.ts` fails when
 * a `Db` method is named in no title. Lists whose order the interface doesn't
 * state are compared sorted. A case marked "(web store as it is)" pins what
 * the IndexedDB store does where that differs from its doc comment or from the
 * native store, and what the native store does instead (`store` is 'sqlite'): the fake follows the web store.
 */
/** Rows only an older app wrote: the retired scan's marks, which old walks' replays still read (`listMarks`). */
export type Legacy = { marks?: Mark[] };

/** Which store runs the suite: the native store (MT11) differs from the web store and the fake where a case says so. */
export type StoreKind = 'web' | 'sqlite';

export function dbContract(name: string, fresh: (legacy?: Legacy) => Promise<Db>, store: StoreKind = 'web') {
  const LON = -71.4, LAT = 41.812;
  const walk = (id: string, started_at: number, more: Partial<Walk> = {}): Walk => ({
    id, started_at, ended_at: null, title: null, epilogue: null, open: false, area: null, snapped_build: null, ...more,
  });
  const point = (walk_id: string, t: number): TracePoint => ({ walk_id, t, lat: LAT, lon: LON, accuracy_m: 5, speed: 1, course: null });
  const capture = (id: string, walk_id: string | null, t: number, more: Partial<Flat> = {}): Flat => ({
    id, walk_id, t, lat: LAT, lon: LON, kind: 'text', file_path: null, body: 'hi', segment_id: null, ...more,
  });
  const segment = (id: string, dLon = 0, build = 'b1'): StreetSegment => ({
    id, name: 'Main St', kind_detail: 'residential', length_m: 80, build,
    geometry: [[[LON + dLon, LAT], [LON + dLon + 0.001, LAT]]],
  });
  const visit = (segment_id: string, walk_id: string, street_key = 'name:main st'): VisitedSegment => ({
    segment_id, walk_id, covered_fraction: 1, first_t: 1, street_key,
  });
  const summary = (walk_id: string, build = 'b1', more: Partial<WalkSummary> = {}): WalkSummary => ({
    walk_id, build, distance_m: 100, duration_ms: 60_000, new_streets: 1, streets_walked: 1,
    photos: 0, videos: 0, voices: 0, notes: 0, streets_read: true, ...more,
  });
  const area = (key: string): Area => ({ key, level: 'town', name: key, parent_key: null, lon: LON, lat: LAT, rules: 'r1' });
  const walkArea = (walk_id: string, area_key: string): WalkArea => ({
    walk_id, area_key, metres: 50, first_t: 1, last_t: 2, lon: LON, lat: LAT,
  });
  const place = (key: string, at: [number, number] = [LON, LAT]): Place => ({
    key, name: key, category: 'art', at, generic: false, build: 'b1', markable: true,
  });
  const mark = (id: string, walk_id: string | null, created_at: number, more: Partial<Mark> = {}): Mark => ({
    id, walk_id, key: `k-${id}`, name: id, category: 'art', at: [LON, LAT], generic: false, origin: 'scan',
    state: 'open', created_at, resolved_at: null, capture_id: null, ...more,
  });
  const recall = (capture_id: string, fired_count = 0): Recall => ({
    capture_id, frequency: 'once', until: null, last_fired_at: null, fired_count, last_walk_id: null,
  });
  const gap = (walk_id: string, t0: number, state: GapDecision['state'] = 'kept'): GapDecision => ({
    walk_id, t0, t1: t0 + 10, state, path: [[LON, LAT], [LON + 0.001, LAT]], length_m: 80, street: null, decided_at: t0 + 20,
  });
  const checklistArea = (key: string, count = 1, build = 'b1', archive: string | null = null): ChecklistArea => ({
    key, level: 'neighborhood', name: key, at: [LON, LAT], build, built_at: 1, count, archive,
  });
  const item = (key: string, area_key: string | null, at: [number, number] = [LON, LAT]): ChecklistItem => ({
    key, area_key, name: key, category: 'art', kind: 'public_art', at, generic: false,
  });
  const read = (key: string, read_at = 1, build = 'b1'): ExploreRead => ({ key, centre: [LON, LAT], build, read_at, candidates: [] });
  const find = (key: string, walk_id: string | null, capture_id: string, found_at = 1): Find => ({
    key, area_key: null, walk_id, capture_id, found_at, name: key, category: 'art', kind: 'public_art', at: [LON, LAT], generic: false,
  });
  const outlineTile = (key: string, read_at = 1): OutlineTile => {
    const [z, x, y] = key.split('/').map(Number);
    return {
      key, z, x, y, release: '2026-10-21.0', read_at,
      pieces: [{ id: 'd1', name: 'Whitehall', polygons: [[[[-75.5, 40.6], [-75.4, 40.6], [-75.4, 40.7], [-75.5, 40.6]]]] }],
      points: [{ id: 'd1', at: [-75.45, 40.65] }],
    };
  };
  const walkTile = (key: string, read_at = 1): WalkTile => {
    const [x, y] = key.split('/').map(Number);
    return { key, x, y, build: '2026-10-21.0', code: 'w2', from: 'overture', read_at, junctions: [[LON, LAT], [LON + 0.0005, LAT]], ways: [{ id: 'a', cls: 'residential', speedKmh: 40, level: 0, line: [[LON, LAT], [LON + 0.001, LAT]] }] };
  };
  const atlasArea = (key: string, listed_at = 1): AtlasArea => ({
    key, level: 'town', name: key, at: [LON, LAT], reachM: 2000, build: 'b1', code: 'a1', listed_at, read_at: null, failed_at: null, profile: null,
  });
  const landing = (key: string, analyzed_at: number) =>
    ({ key, centre: [LON, LAT], analysis: {}, build: 'b1', rules: 'r', analyzed_at }) as unknown as LandingRow;
  const box: [number, number, number, number] = [LON - 0.01, LAT - 0.01, LON + 0.01, LAT + 0.01];
  const sorted = (xs: string[]) => [...xs].sort();
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
  // A one-piece moment read back as the flat record it was kept from (MT4: the reads return what they did).
  const flat = (m: Moment): Flat => {
    const { moment_id: _m, ...media } = m.pieces[0];
    return { ...media, walk_id: m.walk_id, lat: m.lat, lon: m.lon, segment_id: m.segment_id };
  };
  const flats = (ms: Moment[]) => ms.map(flat);
  const keys = (rows: { key: string }[]) => sorted(rows.map((r) => r.key));

  describe(`Db contract: ${name}`, () => {
    // ---- walks

    test('FC7 createWalk, listWalks, getOpenWalk, updateWalk, getWalk: newest first, the open one found, patches merge, a missing id is a no-op', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2, { open: true }));
      assert.deepEqual(ids(await db.listWalks()), ['b', 'a']);
      assert.equal((await db.getOpenWalk())?.id, 'b');
      await db.updateWalk('b', { open: false, ended_at: 5 });
      assert.equal(await db.getOpenWalk(), null);
      assert.deepEqual(await db.getWalk('b'), walk('b', 2, { open: false, ended_at: 5 }));
      await db.updateWalk('missing', { title: 'x' });
      assert.equal(await db.getWalk('missing'), null);
      assert.equal((await db.listWalks()).length, 2);
    });

    test('FC7 getOpenWalk: the newest open walk when several are open; null with no walks', async () => {
      const db = await fresh();
      assert.equal(await db.getOpenWalk(), null);
      assert.deepEqual(await db.listWalks(), []);
      await db.createWalk(walk('a', 1, { open: true }));
      await db.createWalk(walk('c', 3));
      await db.createWalk(walk('b', 2, { open: true }));
      assert.equal((await db.getOpenWalk())?.id, 'b');
    });

    test('FC7 createWalk: a walk id is used once; the first stays', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await assert.rejects(db.createWalk(walk('a', 2)));
      assert.equal((await db.getWalk('a'))?.started_at, 1);
    });

    test('FC7 getWalk, listWalks, getMoments, listMarks, getVisited, listSummaries: rows go in and come out as copies', async () => {
      const m = mark('m1', 'a', 1);
      const db = await fresh({ marks: [m] });
      const w = walk('a', 1);
      await db.createWalk(w);
      w.title = 'changed after writing';
      const got = (await db.getWalk('a'))!;
      got.title = 'changed after reading';
      (await db.listWalks())[0].title = 'changed in a list';
      assert.equal((await db.getWalk('a'))?.title, null);

      const c = capture('c1', 'a', 1);
      await db.addMoment(momentOf(c));
      c.body = 'changed';
      (await db.getMoments('a'))[0].pieces[0].body = 'changed';
      assert.equal((await db.getMoments('a'))[0].pieces[0].body, 'hi');

      m.at[0] = 0;
      (await db.listMarks('a'))[0].at[0] = 0;
      assert.equal((await db.listMarks('a'))[0].at[0], LON);

      await db.saveSnap('a', [], [visit('s1', 'a')], summary('a'));
      (await db.getVisited('a'))[0].covered_fraction = 0;
      (await db.listSummaries())[0].distance_m = 0;
      assert.equal((await db.getVisited('a'))[0].covered_fraction, 1);
      assert.equal((await db.listSummaries())[0].distance_m, 100);
    });

    // ---- trace

    test('FC7 appendPoints, getPoints: per walk, in time order; an empty batch is a no-op', async () => {
      const db = await fresh();
      await db.appendPoints([point('a', 3), point('a', 1), point('b', 2)]);
      await db.appendPoints([]);
      await db.appendPoints([point('a', 2)]);
      assert.deepEqual((await db.getPoints('a')).map((x) => x.t), [1, 2, 3]);
      assert.deepEqual(await db.getPoints('b'), [point('b', 2)]);
      assert.deepEqual(await db.getPoints('none'), []);
    });

    test('FC7 appendPoints: points are appended, never merged: the same walk and t twice is two points', async () => {
      const db = await fresh();
      await db.appendPoints([point('a', 1)]);
      await db.appendPoints([{ ...point('a', 1), accuracy_m: 9 }]);
      assert.deepEqual((await db.getPoints('a')).map((p) => p.accuracy_m), [5, 9]);
    });

    // ---- captures

    test('FC7 addMoment, updatePiece, getMoments, getMomentsByIds: per walk in time order, by id skipping missing ones, patches merge', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c2', 'a', 2)));
      await db.addMoment(momentOf(capture('c1', 'a', 1)));
      await db.addMoment(momentOf(capture('c3', 'b', 3)));
      await db.addMoment(momentOf(capture('loose', null, 4)));
      await db.updatePiece('c1', { caption: 'hello', caption_y: 0.5 });
      await db.updatePiece('missing', { caption: 'x' });
      assert.deepEqual(ids(flats(await db.getMoments('a'))), ['c1', 'c2']);
      assert.deepEqual((flats(await db.getMoments('a')))[0], capture('c1', 'a', 1, { caption: 'hello', caption_y: 0.5 }));
      assert.deepEqual(ids(flats(await db.getMomentsByIds(['loose', 'c2', 'nope', 'c1']))), ['c1', 'c2', 'loose']);
      assert.deepEqual(flats(await db.getMomentsByIds([])), []);
      assert.deepEqual(flats(await db.getMomentsByIds(['missing'])), []);
    });

    test('ME21: updatePiece keeps an edit, and clears it with null', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c1', 'a', 1)));
      const edit: MediaEdit = { v: 1, rotate: 90, crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 }, filter: 'mono', strokes: [{ tool: 'pen', color: 'red', w: 0.01, pts: [0.1, 0.2, 0.3, 0.4] }], trim: null };
      await db.updatePiece('c1', { edit, caption: 'hi', caption_y: 0.4 });
      const [got] = flats(await db.getMomentsByIds(['c1']));
      assert.deepEqual(parseEdit(got.edit), edit);
      assert.equal(got.caption, 'hi');
      await db.updatePiece('c1', { edit: null });
      assert.equal(parseEdit((flats(await db.getMoments('a')))[0].edit), null);
    });

    test('media-editing audit 7: every capture read gives the edit parsed; a newer or broken one reads as none', async () => {
      const db = await fresh();
      const edit: MediaEdit = { v: 1, rotate: 180, crop: null, filter: 'noir', strokes: [], trim: null };
      await db.addMoment(momentOf({ ...capture('ok', 'a', 1), lat: 41.8, lon: -71.4 }));
      await db.addMoment(momentOf({ ...capture('bad', 'a', 2), lat: 41.8, lon: -71.4 }));
      await db.updatePiece('ok', { edit });
      await db.updatePiece('bad', { edit: { v: 2, rotate: 45 } as unknown as MediaEdit });
      const reads = [
        flats(await db.getMoments('a')),
        flats(await db.getMomentsByIds(['ok', 'bad'])),
        flats(await db.momentsBetween(0, 10)),
        flats(await db.momentsIn([-72, 41, -71, 42])),
      ];
      for (const rows of reads) {
        assert.deepEqual(rows.find((r) => r.id === 'ok')?.edit, edit);
        assert.equal(rows.find((r) => r.id === 'bad')?.edit, null);
      }
    });

    test('FC7 addMoment: a moment id is used once; the first stays', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c1', 'a', 1)));
      await assert.rejects(db.addMoment(momentOf(capture('c1', 'b', 9))));
      assert.deepEqual(flats(await db.getMomentsByIds(['c1'])), [capture('c1', 'a', 1)]);
    });

    test('FC7 updateMoment: moving a moment to another walk moves it between walks\' lists', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c1', null, 1)));
      await db.updateMoment('c1', { walk_id: 'a' });
      assert.deepEqual(ids(flats(await db.getMoments('a'))), ['c1']);
    });

    test('FC7 momentsIn: moments with a position inside the bounds (edges included), loose ones too, in time order', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c2', 'a', 2)));
      await db.addMoment(momentOf(capture('c1', 'b', 1, { lat: LAT - 0.01, lon: LON + 0.01 }))); // on the corner
      await db.addMoment(momentOf(capture('loose', null, 3)));
      await db.addMoment(momentOf(capture('noplace', 'a', 4, { lat: null, lon: null })));
      await db.addMoment(momentOf(capture('east', 'a', 5, { lon: LON + 1 })));
      await db.addMoment(momentOf(capture('north', 'a', 6, { lat: LAT + 1 })));
      assert.deepEqual(ids(flats(await db.momentsIn(box))), ['c1', 'c2', 'loose']);
    });

    test('FC7 momentsBetween: every moment, loose or in a walk, with from <= t < to, in time order; an empty range is empty', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c3', 'a', 30)));
      await db.addMoment(momentOf(capture('loose', null, 20)));
      await db.addMoment(momentOf(capture('c1', 'b', 10)));
      await db.addMoment(momentOf(capture('end', 'a', 40)));
      await db.addMoment(momentOf(capture('before', 'a', 9)));
      assert.deepEqual(ids(flats(await db.momentsBetween(10, 40))), ['c1', 'loose', 'c3']);
      assert.deepEqual(flats(await db.momentsBetween(40, 40)), []);
      assert.deepEqual(flats(await db.momentsBetween(40, 10)), []);
      assert.deepEqual(ids(flats(await db.momentsBetween(0, 100))), ['before', 'c1', 'loose', 'c3', 'end']);
    });

    // ---- moments (Moment table, MT3-MT6, decision 0123)

    const planned = fresh;
    const one = (id: string, walk_id: string | null, t: number, more: Partial<Moment> = {}, media: Partial<Capture> = {}): Moment => ({
      id, walk_id, t, lat: LAT, lon: LON, segment_id: null,
      pieces: [{ id, moment_id: id, t, kind: 'text', file_path: null, body: 'hi', ...media }], ...more,
    });

    test('FC7 addMoment, MT3: a moment and its first piece are one write; an id is used once and the first stays', async () => {
      const db = await planned();
      await db.addMoment(one('m1', 'a', 1));
      await assert.rejects(db.addMoment(one('m1', 'b', 9)));
      assert.deepEqual(await db.getMomentsByIds(['m1']), [one('m1', 'a', 1)]);
      await assert.rejects(db.addMoment({ ...one('m2', 'a', 2), pieces: [] }), 'a moment is never kept without a piece');
      assert.deepEqual(await db.getMomentsByIds(['m2']), []);
    });

    test('FC7 getMoments, momentsBetween, getMomentsByIds, momentsIn, MT4: moments with their pieces, as the capture reads were', async () => {
      const db = await planned();
      await db.addMoment(one('c2', 'a', 2));
      await db.addMoment(one('c1', 'b', 1, { lat: LAT - 0.01, lon: LON + 0.01 }));
      await db.addMoment(one('loose', null, 3));
      await db.addMoment(one('noplace', 'a', 4, { lat: null, lon: null }));
      await db.addMoment(one('east', 'a', 5, { lon: LON + 1 }));
      assert.deepEqual(ids(await db.getMoments('a')), ['c2', 'noplace', 'east']);
      assert.deepEqual(ids(await db.momentsIn(box)), ['c1', 'c2', 'loose']);
      assert.deepEqual(ids(await db.momentsBetween(2, 5)), ['c2', 'loose', 'noplace']);
      assert.deepEqual(await db.momentsBetween(5, 2), []);
      assert.deepEqual(ids(await db.getMomentsByIds(['loose', 'nope', 'c1'])), ['c1', 'loose']);
      assert.deepEqual(await db.getMomentsByIds([]), []);
      assert.deepEqual((await db.getMoments('a'))[0], one('c2', 'a', 2));
    });

    test('FC7 updateMoment, updatePiece, MT5: the place is the moment\'s; a piece\'s update never moves it, and patches merge', async () => {
      const db = await planned();
      await db.addMoment(one('m1', null, 1, { lat: null, lon: null }));
      await db.updateMoment('m1', { lat: LAT, lon: LON, segment_id: 's1' });
      await db.updatePiece('m1', { caption: 'hello', caption_y: 0.5 });
      await db.updatePiece('missing', { caption: 'x' });
      await db.updateMoment('m1', { walk_id: 'a' });
      const [m] = await db.getMoments('a');
      assert.deepEqual([m.lat, m.lon, m.segment_id], [LAT, LON, 's1']);
      assert.equal(m.pieces[0].caption, 'hello');
      assert.equal(m.pieces[0].caption_y, 0.5);
      const edit: MediaEdit = { v: 1, rotate: 90, crop: null, filter: 'mono', strokes: [], trim: null };
      await db.updatePiece('m1', { edit });
      assert.deepEqual((await db.getMomentsByIds(['m1']))[0].pieces[0].edit, edit);
    });

    // ---- moment stacks, round 1 (MS3, MS13, MS15; decision 0123)
    const stacks = fresh;
    const piece = (id: string, moment_id: string, t: number, more: Partial<Capture> = {}): Capture => ({ id, moment_id, t, kind: 'photo', file_path: `${id}.jpg`, body: null, ...more });

    test('FC7 addPiece, MS3, MS15: a piece joins its moment with its own time; the moment\'s place and time stay', async () => {
      const db = await stacks();
      await db.addMoment(one('m1', 'a', 10));
      await db.addPiece('m1', piece('p2', 'm1', 40));
      await db.addPiece('m1', piece('p1', 'm1', 20));
      const [m] = await db.getMoments('a');
      assert.deepEqual([m.t, m.lat, m.lon], [10, LAT, LON]);
      assert.deepEqual(m.pieces.map((p) => [p.id, p.t]), [['m1', 10], ['p1', 20], ['p2', 40]]);
      assert.deepEqual(ids(await db.momentsBetween(0, 100)), ['m1'], 'still one moment');
      await assert.rejects(db.addPiece('missing', piece('p3', 'missing', 50)), 'no piece without its moment');
      await assert.rejects(db.addPiece('m1', piece('p1', 'm1', 60)), 'a piece id is used once');
      await db.updatePiece('p1', { caption: 'side' });
      assert.equal((await db.getMomentsByIds(['m1']))[0].pieces[1].caption, 'side');
    });

    test('FC7 deletePieces, MS13: pieces go and their moment stays; a moment\'s last piece is never deleted this way', async () => {
      const db = await stacks();
      await db.createWalk(walk('a', 1));
      await db.addMoment(one('m1', 'a', 10, {}, { kind: 'photo', file_path: 'm1.jpg', body: null }));
      await db.addPiece('m1', piece('p1', 'm1', 20));
      await db.addPiece('m1', piece('v1', 'm1', 30, { kind: 'voice', file_path: 'v1.m4a' }));
      await db.setRecall(recall('m1'));
      await db.saveSnap('a', [], [], summary('a'));
      await db.deletePieces(['p1']);
      assert.deepEqual((await db.getMoments('a'))[0].pieces.map((p) => p.id), ['m1', 'v1']);
      assert.deepEqual((await db.listRecalls()).map((r) => r.capture_id), ['m1'], 'the moment keeps its reminder');
      const s = (await db.listSummaries())[0];
      assert.deepEqual([s.photos, s.voices], [1, 1], 'the walk\'s counts follow the pieces left');
      await assert.rejects(db.deletePieces(['m1', 'v1']), 'deleting every piece is deleting the moment');
      assert.deepEqual((await db.getMoments('a'))[0].pieces.map((p) => p.id), ['m1', 'v1'], 'and nothing went');
    });

    test('FC7 splitPiece, MS16: a piece leaves its moment as a moment of its own, in one write; the original keeps the rest', async () => {
      const db = await fresh();
      await db.addMoment(one('m1', 'a', 10));
      await db.addPiece('m1', piece('p1', 'm1', 20));
      await db.addPiece('m1', piece('p2', 'm1', 30));
      await db.splitPiece('p1', { id: 'p1', walk_id: 'a', t: 20, lat: LAT + 0.001, lon: LON, segment_id: null });
      const ms = await db.getMoments('a');
      assert.deepEqual(ms.map((m) => [m.id, m.t, m.pieces.map((p) => [p.id, p.moment_id])]), [['m1', 10, [['m1', 'm1'], ['p2', 'm1']]], ['p1', 20, [['p1', 'p1']]]]);
      assert.equal(ms[1].lat, LAT + 0.001);
      await assert.rejects(db.splitPiece('missing', { id: 'x', walk_id: 'a', t: 1, lat: null, lon: null, segment_id: null }));
      await assert.rejects(db.splitPiece('p1', { id: 'p1b', walk_id: 'a', t: 20, lat: null, lon: null, segment_id: null }), 'p1 alone is its moment: never split');
      assert.deepEqual((await db.getMoments('a')).map((m) => m.id), ['m1', 'p1'], 'and nothing changed');
    });

    test('FC7 deleteMoments, MT6: a moment goes with its pieces, reminder, find, memberships and links; others stay', async () => {
      const db = await planned();
      await db.addMoment(one('m1', 'a', 1));
      await db.addMoment(one('m2', 'a', 2));
      await db.setRecall(recall('m1'));
      await db.addFind(find('f1', 'a', 'm1'));
      await db.deleteMoments(['m1']);
      assert.deepEqual(ids(await db.getMoments('a')), ['m2']);
      assert.deepEqual(await db.listRecalls(), []);
      assert.deepEqual(await db.listFinds('a'), []);
    });

    // ---- deleting (D1-D9)

    test('FC7 deleteWalk: removes the walk, its trace, pauses, stills, gap decisions, captures and their reminders, summary, visited rows, finds, marks and explored meta; other walks keep theirs', async () => {
      const db = await fresh({ marks: [mark('m-a', 'a', 1), mark('m-b', 'b', 2)] });
      const fill = async (w: string, t: number) => {
        await db.createWalk(walk(w, t));
        await db.appendPoints([point(w, t)]);
        await db.startPause(w, t);
        await db.endPause(w, t + 1);
        await db.startStill(w, t);
        await db.putGapDecision(gap(w, t));
        await db.addMoment(momentOf(capture(`c-${w}`, w, t)));
        await db.setRecall(recall(`c-${w}`));
        await db.saveSnap(w, [segment(`s-${w}`)], [visit(`s-${w}`, w, `name:${w} st`)], summary(w), {
          areas: [area(`A-${w}`)], rows: [walkArea(w, `A-${w}`)],
        });
        await db.addFind(find(`f-${w}`, w, `c-${w}`));
        await db.setMeta(`explored:${w}`, String(t));
      };
      await fill('a', 1);
      await fill('b', 2);
      await db.setMeta('other', 'kept');
      await db.deleteWalk('a');

      assert.equal(await db.getWalk('a'), null);
      assert.deepEqual(await db.getPoints('a'), []);
      assert.deepEqual(await db.getPauses('a'), []);
      assert.deepEqual(await db.getStills('a'), []);
      assert.deepEqual(await db.getGapDecisions('a'), []);
      assert.deepEqual(flats(await db.getMoments('a')), []);
      assert.deepEqual(flats(await db.getMomentsByIds(['c-a'])), []);
      assert.deepEqual(await db.getVisited('a'), []);
      assert.deepEqual(await db.listFinds('a'), []);
      assert.deepEqual(await db.listMarks('a'), []);
      assert.equal(await db.getMeta('explored:a'), null);
      assert.deepEqual((await db.listSummaries()).map((s) => s.walk_id), ['b']);
      assert.deepEqual(sorted((await db.listRecalls()).map((r) => r.capture_id)), ['c-b']);
      assert.deepEqual((await db.listWalkAreas()).map((r) => r.walk_id), ['b']);

      // The other walk is whole; cached segments stay (cache, not the walk's).
      assert.deepEqual(ids(await db.listWalks()), ['b']);
      assert.equal((await db.getPoints('b')).length, 1);
      assert.equal((await db.getPauses('b')).length, 1);
      assert.equal((await db.getStills('b')).length, 1);
      assert.equal((await db.getGapDecisions('b')).length, 1);
      assert.equal((flats(await db.getMoments('b'))).length, 1);
      assert.equal((await db.getVisited('b')).length, 1);
      assert.equal((await db.listFinds('b')).length, 1);
      assert.equal((await db.listMarks('b')).length, 1);
      assert.equal(await db.getMeta('explored:b'), '2');
      assert.equal(await db.getMeta('other'), 'kept');
      assert.deepEqual(ids(await db.getSegmentsIn(box)).sort(), ['s-a', 's-b']);
    });

    test('FC7 deleteWalk: areas no walk uses go, shared ones stay; later walks\' new streets are counted again without it (D7, D8)', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.createWalk(walk('c', 3));
      await db.saveSnap('a', [], [visit('s1', 'a', 'name:x st')], summary('a', 'b1', { new_streets: 1 }), {
        areas: [area('Only'), area('Shared')], rows: [walkArea('a', 'Only'), walkArea('a', 'Shared')],
      });
      // b walked x st again (not new) and y st (new); c walked x st only (not new).
      await db.saveSnap('b', [], [visit('s1', 'b', 'name:x st'), visit('s2', 'b', 'name:y st')], summary('b', 'b1', { new_streets: 1 }), {
        areas: [area('Shared')], rows: [walkArea('b', 'Shared')],
      });
      await db.saveSnap('c', [], [visit('s1', 'c', 'name:x st')], summary('c', 'b1', { new_streets: 0 }));
      await db.deleteWalk('a');
      assert.deepEqual(keys(await db.listAreas()), ['Shared']);
      const counts = Object.fromEntries((await db.listSummaries()).map((s) => [s.walk_id, s.new_streets]));
      assert.deepEqual(counts, { b: 2, c: 0 });
    });

    test('FC7 deleteWalk: a walk that doesn\'t exist changes nothing; loose captures stay', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.addMoment(momentOf(capture('loose', null, 1)));
      await db.saveSnap('a', [], [visit('s1', 'a')], summary('a'), { areas: [area('A')], rows: [walkArea('a', 'A')] });
      await db.deleteWalk('nope');
      assert.deepEqual(ids(await db.listWalks()), ['a']);
      assert.deepEqual(ids(flats(await db.getMomentsByIds(['loose']))), ['loose']);
      assert.deepEqual(keys(await db.listAreas()), ['A']);
      assert.equal((await db.listSummaries())[0].new_streets, 1);
    });

    test('FC7 deleteMoments: removes the rows, their reminders and finds; the walks\' counts follow from the rows left (D2, D3, D9)', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.addMoment(momentOf(capture('p1', 'a', 1, { kind: 'photo' })));
      await db.addMoment(momentOf(capture('p2', 'a', 2, { kind: 'photo' })));
      await db.addMoment(momentOf(capture('n1', 'a', 3)));
      await db.addMoment(momentOf(capture('v1', 'a', 4, { kind: 'voice' })));
      await db.saveSnap('a', [], [], summary('a', 'b1', { distance_m: 321 }));
      assert.deepEqual(
        (({ photos, videos, voices, notes }) => ({ photos, videos, voices, notes }))((await db.listSummaries())[0]),
        { photos: 2, videos: 0, voices: 1, notes: 1 },
      );
      await db.setRecall(recall('p1'));
      await db.setRecall(recall('n1'));
      await db.addFind(find('f1', 'a', 'p1'));
      await db.addFind(find('f2', 'a', 'n1'));
      await db.deleteMoments(['p1', 'v1', 'missing']);
      assert.deepEqual(ids(flats(await db.getMoments('a'))), ['p2', 'n1']);
      assert.deepEqual((await db.listRecalls()).map((r) => r.capture_id), ['n1']);
      assert.deepEqual(keys(await db.listFinds()), ['f2']);
      const s = (await db.listSummaries())[0];
      assert.deepEqual({ photos: s.photos, videos: s.videos, voices: s.voices, notes: s.notes, distance_m: s.distance_m }, {
        photos: 1, videos: 0, voices: 0, notes: 1, distance_m: 321,
      });
    });

    test('FC7 deleteMoments: keepFinds keeps the finds; a loose moment\'s find goes; an empty list or only missing ids change nothing', async () => {
      const db = await fresh();
      await db.addMoment(momentOf(capture('c1', 'a', 1)));
      await db.addMoment(momentOf(capture('loose', null, 2)));
      await db.addFind(find('f1', 'a', 'c1'));
      await db.addFind(find('f2', null, 'loose'));
      await db.deleteMoments([]);
      await db.deleteMoments(['missing']);
      assert.equal((flats(await db.getMomentsByIds(['c1', 'loose']))).length, 2);
      await db.deleteMoments(['c1'], { keepFinds: true });
      assert.deepEqual(flats(await db.getMoments('a')), []);
      assert.deepEqual(keys(await db.listFinds()), ['f1', 'f2']);
      await db.deleteMoments(['loose']);
      assert.deepEqual(keys(await db.listFinds()), ['f1']);
    });

    test('FC7 deleteMoments: (web store as it is) a find filed under another walk than its moment\'s stays (SQLite deletes every find of the moment, MT11)', async () => {
      // The web store looks finds up by the deleted captures' walks; SQLite deletes by capture_id.
      // Finds are written with their capture's walk, so this only shows if a capture moves walk.
      const db = await fresh();
      await db.addMoment(momentOf(capture('c1', 'a', 1)));
      await db.addFind(find('f1', 'other', 'c1'));
      await db.deleteMoments(['c1']);
      assert.deepEqual(keys(await db.listFinds()), store === 'sqlite' ? [] : ['f1']);
    });

    // ---- pauses, stills, gaps

    test('FC7 startPause, endPause, getPauses: at most one open per walk; ending closes it; in start order; per walk', async () => {
      const db = await fresh();
      await db.startPause('a', 10);
      await db.startPause('a', 20); // already paused: ignored
      await db.startPause('b', 15);
      assert.deepEqual(await db.getPauses('a'), [{ walk_id: 'a', started_at: 10, ended_at: null }]);
      await db.endPause('a', 30);
      await db.endPause('a', 40); // nothing open: ignored
      await db.startPause('a', 50);
      assert.deepEqual(await db.getPauses('a'), [
        { walk_id: 'a', started_at: 10, ended_at: 30 },
        { walk_id: 'a', started_at: 50, ended_at: null },
      ]);
      assert.deepEqual(await db.getPauses('b'), [{ walk_id: 'b', started_at: 15, ended_at: null }]);
      assert.deepEqual(await db.getPauses('c'), []);
    });

    test('FC7 startStill, endStill, getStills: at most one open per walk; ending closes it; in start order; apart from pauses', async () => {
      const db = await fresh();
      await db.startStill('a', 10);
      await db.startStill('a', 20); // already still: ignored
      await db.endStill('a', 30);
      await db.endStill('a', 35); // nothing open: ignored
      await db.startStill('a', 40);
      await db.startStill('b', 5);
      assert.deepEqual(await db.getStills('a'), [
        { walk_id: 'a', started_at: 10, ended_at: 30 },
        { walk_id: 'a', started_at: 40, ended_at: null },
      ]);
      assert.deepEqual(await db.getStills('b'), [{ walk_id: 'b', started_at: 5, ended_at: null }]);
      assert.deepEqual(await db.getPauses('a'), []);
      await db.startPause('a', 50);
      assert.equal((await db.getStills('a')).length, 2);
    });

    test('FC7 putGapDecision, getGapDecisions: per walk in t0 order; the same walk and t0 replaces', async () => {
      const db = await fresh();
      await db.putGapDecision(gap('a', 30));
      await db.putGapDecision(gap('a', 10));
      await db.putGapDecision(gap('b', 10));
      await db.putGapDecision(gap('a', 30, 'dismissed'));
      assert.deepEqual(await db.getGapDecisions('a'), [gap('a', 10), gap('a', 30, 'dismissed')]);
      assert.deepEqual(await db.getGapDecisions('b'), [gap('b', 10)]);
      assert.deepEqual(await db.getGapDecisions('c'), []);
    });

    // ---- streets and snaps

    test('FC7 putSegments, getSegmentsIn: found by the bounds they touch, as they were put; the same id replaces', async () => {
      const db = await fresh();
      await db.putSegments([segment('near'), segment('far', 1)]);
      await db.putSegments([]);
      assert.deepEqual(await db.getSegmentsIn(box), [segment('near')]);
      await db.putSegments([{ ...segment('near'), name: 'Renamed St' }]);
      assert.deepEqual(await db.getSegmentsIn(box), [{ ...segment('near'), name: 'Renamed St' }]);
      assert.deepEqual(ids(await db.getSegmentsIn([LON + 0.999, LAT - 0.01, LON + 1.01, LAT + 0.01])), ['far']);
    });

    test('FC7 putSegments, getSegmentsIn: a bridge or tunnel piece keeps its level, a ground piece has none (gap bridges GB1)', async () => {
      const db = await fresh();
      await db.putSegments([{ ...segment('near'), level: 1 }, { ...segment('far', 1), level: -1 }, segment('ground', 0.0005)]);
      const read = await db.getSegmentsIn([LON - 0.01, LAT - 0.01, LON + 1.01, LAT + 0.01]);
      assert.equal(read.find((s) => s.id === 'near')?.level, 1);
      assert.equal(read.find((s) => s.id === 'far')?.level, -1);
      assert.deepEqual(read.find((s) => s.id === 'ground'), segment('ground', 0.0005), 'no level key on the ground');
    });

    test('FC7 getSegmentsIn: (web store as it is) a piece is found by the tile of its centre, so a piece far longer than 200 m that only grazes the bounds is missed (SQLite compares each piece\'s box, MT11)', async () => {
      // The web store files pieces under one z14 tile and reads the bounds' tiles widened by 250 m
      // (pieces are at most 200 m); SQLite compares each piece's box.
      const db = await fresh();
      const long: StreetSegment = { ...segment('long'), geometry: [[[LON + 0.009, LAT], [LON + 0.2, LAT]]] };
      await db.putSegments([long]);
      assert.deepEqual(ids(await db.getSegmentsIn(box)), store === 'sqlite' ? ['long'] : []);
      assert.deepEqual(ids(await db.getSegmentsIn([LON + 0.09, LAT - 0.01, LON + 0.11, LAT + 0.01])), ['long']);
    });

    test('FC7 saveSnap, getVisited, listSummaries, getSegmentsIn: replaces the walk\'s visited rows and summary, caches the segments, marks it snapped only when complete', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.saveSnap('b', [], [visit('s9', 'b')], summary('b'));
      await db.saveSnap('a', [segment('s1')], [visit('s1', 'a'), visit('s2', 'a')], summary('a'), null, true);
      assert.equal((await db.getWalk('a'))?.snapped_build, 'b1');
      assert.deepEqual(sorted((await db.getVisited('a')).map((v) => v.segment_id)), ['s1', 's2']);
      await db.saveSnap('a', [], [visit('s3', 'a')], summary('a', 'b2'), null, false);
      assert.deepEqual(await db.getVisited('a'), [visit('s3', 'a')]);
      assert.deepEqual(await db.getVisited('b'), [visit('s9', 'b')]);
      assert.deepEqual((await db.listSummaries()).map((s) => `${s.walk_id}:${s.build}`).sort(), ['a:b2', 'b:b1']);
      assert.equal((await db.getWalk('a'))?.snapped_build, null);
      assert.deepEqual(ids(await db.getSegmentsIn(box)), ['s1']);
      await db.saveSnap('a', [], [], summary('a', 'b3'));
      assert.equal((await db.getWalk('a'))?.snapped_build, 'b3');
      assert.deepEqual(await db.getVisited('a'), []);
    });

    test('FC7 saveSnap: the summary\'s moment counts are taken from the walk\'s capture rows as they stand; the rest is kept as given', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.addMoment(momentOf(capture('p', 'a', 1, { kind: 'photo' })));
      await db.addMoment(momentOf(capture('v', 'a', 2, { kind: 'video' })));
      await db.addMoment(momentOf(capture('other', 'b', 3, { kind: 'photo' })));
      await db.saveSnap('a', [], [], summary('a', 'b1', { photos: 9, videos: 9, voices: 9, notes: 9, distance_m: 42 }));
      // SQLite's column gives a summary kept without a ride its default, 0 (MT11); the others keep it absent.
      const ride = store === 'sqlite' ? { ride_m: 0 } : {};
      assert.deepEqual(await db.listSummaries(), [summary('a', 'b1', { photos: 1, videos: 1, voices: 0, notes: 0, distance_m: 42, ...ride })]);
    });

    test('FC7 saveSnap: a walk deleted (or never made) gets nothing back: no segments, visited rows, summary or areas', async () => {
      const db = await fresh();
      await db.saveSnap('gone', [segment('s1')], [visit('s1', 'gone')], summary('gone'), { areas: [area('A')], rows: [walkArea('gone', 'A')] });
      assert.deepEqual(await db.getSegmentsIn(box), []);
      assert.deepEqual(await db.getVisited('gone'), []);
      assert.deepEqual(await db.listSummaries(), []);
      assert.deepEqual(await db.listAreas(), []);
      assert.deepEqual(await db.listWalkAreas(), []);
      assert.equal(await db.getWalk('gone'), null);
    });

    test('FC7 saveSnap, listAreas, listWalkAreas: placing replaces the walk\'s areas and drops areas no walk uses; no placement keeps them', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.saveSnap('a', [], [], summary('a'), { areas: [area('Old'), area('Shared')], rows: [walkArea('a', 'Old'), walkArea('a', 'Shared')] });
      await db.saveSnap('b', [], [], summary('b'), { areas: [area('Shared')], rows: [walkArea('b', 'Shared')] });
      await db.saveSnap('a', [], [], summary('a'), { areas: [area('New')], rows: [walkArea('a', 'New')] });
      assert.deepEqual(keys(await db.listAreas()).sort(), ['New', 'Shared']);
      assert.deepEqual((await db.listWalkAreas()).map((r) => `${r.walk_id}:${r.area_key}`).sort(), ['a:New', 'b:Shared']);
      await db.saveSnap('a', [], [], summary('a'), null);
      await db.saveSnap('a', [], [], summary('a'));
      assert.deepEqual((await db.listWalkAreas()).map((r) => `${r.walk_id}:${r.area_key}`).sort(), ['a:New', 'b:Shared']);
      assert.deepEqual((await db.listAreas()).sort((x, y) => (x.key < y.key ? -1 : 1)), [area('New'), area('Shared')].sort((x, y) => (x.key < y.key ? -1 : 1)));
      await db.saveSnap('a', [], [], summary('a'), { areas: [], rows: [] });
      assert.deepEqual(keys(await db.listAreas()), ['Shared']);
      assert.deepEqual((await db.listWalkAreas()).map((r) => r.walk_id), ['b']);
    });

    test('FC7 visitedSegmentIds, streetKeysBefore: every credited id once; street keys of walks started strictly earlier', async () => {
      const db = await fresh();
      assert.deepEqual([...(await db.visitedSegmentIds())], []);
      await db.createWalk(walk('old', 1));
      await db.createWalk(walk('new', 5));
      await db.saveSnap('old', [], [visit('s1', 'old', 'name:a st'), visit('s3', 'old', 'name:a st')], summary('old'));
      await db.saveSnap('new', [], [visit('s2', 'new', 'name:b st'), visit('s1', 'new', 'name:a st')], summary('new'));
      assert.deepEqual([...(await db.visitedSegmentIds())].sort(), ['s1', 's2', 's3']);
      assert.deepEqual([...(await db.streetKeysBefore(5))], ['name:a st']);
      assert.deepEqual([...(await db.streetKeysBefore(1))], []);
      assert.deepEqual([...(await db.streetKeysBefore(6))].sort(), ['name:a st', 'name:b st']);
    });

    // ---- discovery

    test('FC7 putPlaces, placesIn: same key replaces; found inside the bounds, as they were put', async () => {
      const db = await fresh();
      await db.putPlaces([place('p1'), place('p2', [LON + 1, LAT]), place('p3', [LON, LAT + 1])]);
      await db.putPlaces([{ ...place('p1'), name: 'renamed' }]);
      await db.putPlaces([]);
      assert.deepEqual(await db.placesIn(box), [{ ...place('p1'), name: 'renamed' }]);
      assert.deepEqual(await db.placesIn([LON + 0.99, LAT - 0.01, LON + 1.01, LAT + 0.01]), [place('p2', [LON + 1, LAT])]);
    });

    test('FC7 listMarks: a walk\'s marks by walk, the home\'s are those with no walk, each in creation order', async () => {
      const db = await fresh({ marks: [mark('m1', null, 2), mark('m2', null, 1), mark('m3', 'w', 3, { state: 'found' }), mark('m4', 'w', 4)] });
      assert.deepEqual(ids(await db.listMarks(null)), ['m2', 'm1']);
      assert.deepEqual((await db.listMarks('w')).map((m) => `${m.id}:${m.state}`), ['m3:found', 'm4:open']);
      assert.deepEqual(await db.listMarks('w'), [mark('m3', 'w', 3, { state: 'found' }), mark('m4', 'w', 4)]);
      assert.deepEqual(await db.listMarks('none'), []);
    });

    test('FC7 setRecall, clearRecall, listRecalls: one per capture, replaced by capture, cleared by capture', async () => {
      const db = await fresh();
      await db.setRecall(recall('c1'));
      await db.setRecall(recall('c1', 2));
      await db.setRecall(recall('c2'));
      await db.clearRecall('c2');
      await db.clearRecall('missing');
      assert.deepEqual(await db.listRecalls(), [recall('c1', 2)]);
    });

    // ---- landing and atlas

    test('FC7 putLanding, listLandings: the same key replaces; others stay', async () => {
      const db = await fresh();
      await db.putLanding(landing('L', 1));
      await db.putLanding(landing('M', 3));
      await db.putLanding(landing('L', 2));
      assert.deepEqual((await db.listLandings()).map((l) => `${l.key}@${l.analyzed_at}`).sort(), ['L@2', 'M@3']);
    });

    test('FC7 putAtlasAreas, listAtlasAreas: the same key replaces; others stay; an empty list is a no-op', async () => {
      const db = await fresh();
      assert.deepEqual(await db.listAtlasAreas(), []);
      await db.putAtlasAreas([atlasArea('A', 1), atlasArea('B', 1)]);
      await db.putAtlasAreas([{ ...atlasArea('A', 2), read_at: 5 }]);
      await db.putAtlasAreas([]);
      const got = await db.listAtlasAreas();
      assert.deepEqual(keys(got), ['A', 'B']);
      assert.deepEqual(got.find((r) => r.key === 'A'), { ...atlasArea('A', 2), read_at: 5 });
    });

    test('FC7 putWalkTiles, getWalkTiles (WK2): the same key replaces; only the keys asked for come back, in key order; empty is a no-op', async () => {
      const db = await fresh();
      assert.deepEqual(await db.getWalkTiles(['1/2']), []);
      await db.putWalkTiles([walkTile('1/2', 1), walkTile('3/4', 1)]);
      await db.putWalkTiles([walkTile('1/2', 2)]);
      await db.putWalkTiles([]);
      assert.deepEqual(await db.getWalkTiles([]), []);
      assert.deepEqual(keys(await db.getWalkTiles(['1/2', '9/9'])), ['1/2']);
      assert.deepEqual((await db.getWalkTiles(['1/2']))[0], walkTile('1/2', 2));
      assert.deepEqual(keys(await db.getWalkTiles(['3/4', '1/2'])), ['1/2', '3/4']);
    });

    test('WK19 purgeDerived clears the walk tiles', async () => {
      const db = await fresh();
      await db.putWalkTiles([walkTile('1/2', 1)]);
      await db.purgeDerived();
      assert.deepEqual(await db.getWalkTiles(['1/2']), []);
    });

    test('FC7 putOutlineTiles, getOutlineTiles: the same key replaces; only the keys asked for come back; an empty list is a no-op', async () => {
      const db = await fresh();
      assert.deepEqual(await db.getOutlineTiles(['12/1/2']), []);
      await db.putOutlineTiles([outlineTile('12/1/2', 1), outlineTile('12/3/4', 1)]);
      await db.putOutlineTiles([outlineTile('12/1/2', 2)]);
      await db.putOutlineTiles([]);
      assert.deepEqual(await db.getOutlineTiles([]), []);
      assert.deepEqual(keys(await db.getOutlineTiles(['12/1/2', '12/9/9'])), ['12/1/2']);
      assert.deepEqual((await db.getOutlineTiles(['12/1/2']))[0], outlineTile('12/1/2', 2));
      assert.deepEqual(keys(await db.getOutlineTiles(['12/3/4', '12/1/2'])), ['12/1/2', '12/3/4']);
      // TB7: a z10 tile under the same x/y is its own row.
      await db.putOutlineTiles([outlineTile('10/1/2', 3)]);
      assert.deepEqual((await db.getOutlineTiles(['10/1/2']))[0], outlineTile('10/1/2', 3));
      assert.deepEqual((await db.getOutlineTiles(['12/1/2']))[0], outlineTile('12/1/2', 2));
    });

    // ---- explore

    test('FC7 saveChecklists, listChecklistAreas, checklistItemsIn, listExploreReads: a rebuilt area\'s items are replaced, other areas\' items and orphans stay, the read is recorded', async () => {
      const db = await fresh();
      await db.saveChecklists({
        areas: [checklistArea('N1', 2), checklistArea('N2', 1)],
        items: [item('i1', 'N1'), item('i2', 'N1'), item('i3', 'N2'), item('o1', null)],
        read: read('r1', 1),
      });
      await db.saveChecklists({ areas: [checklistArea('N1', 1, 'b2')], items: [item('i4', 'N1'), item('o2', null)], read: read('r2', 2) });
      assert.deepEqual(keys(await db.checklistItemsIn(box)), ['i3', 'i4', 'o1', 'o2']);
      const areas = await db.listChecklistAreas();
      assert.deepEqual(keys(areas), ['N1', 'N2']);
      assert.deepEqual(areas.find((a) => a.key === 'N1'), checklistArea('N1', 1, 'b2'));
      assert.deepEqual(keys(await db.listExploreReads()), ['r1', 'r2']);
      await db.saveChecklists({ areas: [], items: [], read: read('r1', 9) });
      assert.deepEqual((await db.listExploreReads()).map((r) => `${r.key}@${r.read_at}`).sort(), ['r1@9', 'r2@2']);
    });

    test('PW12 saveChecklists, listChecklistAreas: an area keeps the archive version it was built with, or none', async () => {
      const db = await fresh();
      await db.saveChecklists({ areas: [checklistArea('N1', 1, 'b1', '20261108'), checklistArea('N2')], items: [], read: read('r1', 1) });
      const areas = await db.listChecklistAreas();
      assert.equal(areas.find((a) => a.key === 'N1')?.archive, '20261108');
      assert.equal(areas.find((a) => a.key === 'N2')?.archive ?? null, null);
    });

    test('FC7 checklistItemsIn: only items inside the bounds (edges included), as they were saved', async () => {
      const db = await fresh();
      await db.saveChecklists({
        areas: [],
        items: [item('in', 'N', [LON, LAT]), item('edge', 'N', [LON + 0.01, LAT + 0.01]), item('east', 'N', [LON + 1, LAT]), item('north', null, [LON, LAT + 1])],
        read: read('r'),
      });
      const got = await db.checklistItemsIn(box);
      assert.deepEqual(keys(got), ['edge', 'in']);
      assert.deepEqual(got.find((i) => i.key === 'in'), item('in', 'N', [LON, LAT]));
    });

    test('FC7 addFind, listFinds: the first find of a place stands; every find, or one walk\'s', async () => {
      const db = await fresh();
      await db.addFind(find('f1', 'a', 'c1', 1));
      await db.addFind(find('f1', 'b', 'c2', 2)); // the same place again: ignored, no error
      await db.addFind(find('f2', 'b', 'c3', 3));
      await db.addFind(find('f3', null, 'c4', 4));
      assert.deepEqual(keys(await db.listFinds()), ['f1', 'f2', 'f3']);
      assert.deepEqual(await db.listFinds('a'), [find('f1', 'a', 'c1', 1)]);
      assert.deepEqual(keys(await db.listFinds('b')), ['f2']);
      assert.deepEqual(await db.listFinds('none'), []);
    });

    test('FC7 saveChecklists, addFind: a rebuild never touches finds', async () => {
      const db = await fresh();
      await db.saveChecklists({ areas: [checklistArea('N1')], items: [item('i1', 'N1')], read: read('r1') });
      await db.addFind({ ...find('i1', 'a', 'c1'), area_key: 'N1' });
      await db.saveChecklists({ areas: [checklistArea('N1')], items: [], read: read('r2') });
      assert.deepEqual(keys(await db.listFinds()), ['i1']);
      assert.deepEqual(await db.checklistItemsIn(box), []);
    });

    // ---- meta and the build

    test('FC7 getMeta, setMeta: null until set; the last write wins; an empty string is stored as it is', async () => {
      const db = await fresh();
      assert.equal(await db.getMeta('k'), null);
      await db.setMeta('k', 'v');
      await db.setMeta('j', 'w');
      assert.equal(await db.getMeta('k'), 'v');
      await db.setMeta('k', '');
      assert.equal(await db.getMeta('k'), '');
      assert.equal(await db.getMeta('j'), 'w');
    });

    test('FC7 purgeDerived: drops segments, places, explore reads, atlas areas and outline tiles and unmarks every walk; truth, visited rows and summaries stay', async () => {
      const db = await fresh({ marks: [mark('m1', 'a', 1)] });
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.saveSnap('a', [segment('s1')], [visit('s1', 'a')], summary('a'), { areas: [area('A')], rows: [walkArea('a', 'A')] });
      await db.saveSnap('b', [], [], summary('b'));
      await db.putPlaces([place('p1')]);
      await db.setRecall(recall('c1'));
      await db.putGapDecision(gap('a', 1));
      await db.putLanding(landing('L', 1));
      await db.putAtlasAreas([atlasArea('T')]);
      await db.putOutlineTiles([outlineTile('12/1/2')]);
      await db.saveChecklists({ areas: [checklistArea('N1')], items: [item('i1', 'N1')], read: read('r1') });
      await db.addFind(find('f1', 'a', 'c1'));
      await db.setMeta('k', 'v');
      await db.purgeDerived();

      assert.deepEqual(await db.getSegmentsIn(box), []);
      assert.deepEqual(await db.placesIn(box), []);
      assert.deepEqual(await db.listExploreReads(), []);
      assert.deepEqual(await db.listAtlasAreas(), []);
      assert.deepEqual(await db.getOutlineTiles(['12/1/2']), []);
      assert.deepEqual((await db.listWalks()).map((w) => w.snapped_build), [null, null]);

      assert.equal((await db.getVisited('a')).length, 1);
      assert.equal((await db.listSummaries()).length, 2);
      assert.equal((await db.listAreas()).length, 1);
      assert.equal((await db.listWalkAreas()).length, 1);
      assert.equal((await db.listMarks('a')).length, 1);
      assert.equal((await db.listRecalls()).length, 1);
      assert.equal((await db.getGapDecisions('a')).length, 1);
      assert.equal((await db.listLandings()).length, 1);
      assert.equal((await db.listChecklistAreas()).length, 1);
      assert.equal((await db.checklistItemsIn(box)).length, 1);
      assert.equal((await db.listFinds()).length, 1);
      assert.equal(await db.getMeta('k'), 'v');
    });

    test('FC7 listThreads, applyThreads: puts, replaces and reads back threads, members and replies; deleting a thread keeps the moments and links (OT14, OT18)', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.addMoment(momentOf(capture('m1', 'a', 10)));
      await db.addMoment(momentOf(capture('m2', 'a', 20)));
      const before = flats(await db.getMoments('a'));
      assert.deepEqual(await db.listThreads(), { threads: [], members: [], links: [] });
      await db.applyThreads({
        putThreads: [{ id: 't1', name: null, created_at: 1 }],
        putMembers: [{ thread_id: 't1', moment_id: 'm1', added_at: 2 }, { thread_id: 't1', moment_id: 'm2', added_at: 3 }],
        putLinks: [{ from_id: 'm2', to_id: 'm1', created_at: 3 }],
      });
      await db.applyThreads({ putThreads: [{ id: 't1', name: 'Compliments', created_at: 1 }] });
      const got = await db.listThreads();
      assert.deepEqual(got.threads, [{ id: 't1', name: 'Compliments', created_at: 1 }]);
      assert.equal(got.members.length, 2);
      assert.deepEqual(got.links, [{ from_id: 'm2', to_id: 'm1', created_at: 3 }]);
      assert.deepEqual(flats(await db.getMoments('a')), before, 'linking never touches a moment\'s row');
      await db.applyThreads({ deleteThreads: ['t1'] });
      const left = await db.listThreads();
      assert.deepEqual([left.threads, left.members], [[], []]);
      assert.equal(left.links.length, 1, 'a reply link is its own record');
      assert.equal((flats(await db.getMoments('a'))).length, 2, 'deleting a thread deletes no moment');
    });

    test('FC7 applyThreads: removing a member dissolves a thread left with fewer than two, name and all; a second thread of the moment stays (OT15)', async () => {
      const db = await fresh();
      await db.applyThreads({
        putThreads: [{ id: 'a', name: 'A', created_at: 1 }, { id: 'b', name: null, created_at: 1 }],
        putMembers: [
          { thread_id: 'a', moment_id: 'm1', added_at: 1 }, { thread_id: 'a', moment_id: 'm2', added_at: 1 },
          { thread_id: 'b', moment_id: 'm1', added_at: 1 }, { thread_id: 'b', moment_id: 'm2', added_at: 1 }, { thread_id: 'b', moment_id: 'm3', added_at: 1 },
        ],
      });
      await db.applyThreads({ deleteMembers: [{ thread_id: 'a', moment_id: 'm2' }, { thread_id: 'b', moment_id: 'm2' }] });
      const got = await db.listThreads();
      assert.deepEqual(got.threads.map((t) => t.id), ['b']);
      assert.deepEqual(got.members.map((m) => `${m.thread_id}:${m.moment_id}`).sort(), ['b:m1', 'b:m3']);
      await db.applyThreads({ putThreads: [{ id: 'solo', name: null, created_at: 1 }], putMembers: [{ thread_id: 'solo', moment_id: 'm1', added_at: 1 }] });
      assert.deepEqual((await db.listThreads()).threads.map((t) => t.id), ['b'], 'a thread put with one member never exists');
    });

    test('FC7 deleteMoments: takes the moments\' memberships and links, dissolves a thread left with fewer than two, leaves the other moments (OT16)', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      for (const id of ['m1', 'm2', 'm3']) await db.addMoment(momentOf(capture(id, 'a', 10)));
      await db.applyThreads({
        putThreads: [{ id: 't1', name: 'T', created_at: 1 }, { id: 't2', name: null, created_at: 1 }],
        putMembers: [
          { thread_id: 't1', moment_id: 'm1', added_at: 1 }, { thread_id: 't1', moment_id: 'm2', added_at: 1 }, { thread_id: 't1', moment_id: 'm3', added_at: 1 },
          { thread_id: 't2', moment_id: 'm1', added_at: 1 }, { thread_id: 't2', moment_id: 'm2', added_at: 1 },
        ],
        putLinks: [{ from_id: 'm2', to_id: 'm1', created_at: 1 }, { from_id: 'm3', to_id: 'm2', created_at: 1 }],
      });
      await db.deleteMoments(['m1']);
      const got = await db.listThreads();
      assert.deepEqual(got.threads.map((t) => t.id), ['t1'], 't2 had two moments and m1 went');
      assert.deepEqual(got.members.map((m) => m.moment_id).sort(), ['m2', 'm3']);
      assert.deepEqual(got.links, [{ from_id: 'm3', to_id: 'm2', created_at: 1 }], 'only the links touching m1 went');
      assert.deepEqual((flats(await db.getMoments('a'))).map((c) => c.id), ['m2', 'm3']);
    });

    test('FC7 deleteWalk: takes its moments\' memberships and links, and dissolves the threads that leaves (OT17)', async () => {
      const db = await fresh();
      await db.createWalk(walk('a', 1));
      await db.createWalk(walk('b', 2));
      await db.addMoment(momentOf(capture('a1', 'a', 10)));
      await db.addMoment(momentOf(capture('a2', 'a', 11)));
      await db.addMoment(momentOf(capture('b1', 'b', 20)));
      await db.addMoment(momentOf(capture('b2', 'b', 21)));
      await db.applyThreads({
        putThreads: [{ id: 'x', name: null, created_at: 1 }, { id: 'y', name: null, created_at: 1 }],
        putMembers: [
          { thread_id: 'x', moment_id: 'a1', added_at: 1 }, { thread_id: 'x', moment_id: 'b1', added_at: 1 },
          { thread_id: 'y', moment_id: 'b1', added_at: 1 }, { thread_id: 'y', moment_id: 'b2', added_at: 1 }, { thread_id: 'y', moment_id: 'a2', added_at: 1 },
        ],
        putLinks: [{ from_id: 'b1', to_id: 'a1', created_at: 1 }, { from_id: 'b2', to_id: 'b1', created_at: 1 }],
      });
      await db.deleteWalk('a');
      const got = await db.listThreads();
      assert.deepEqual(got.threads.map((t) => t.id), ['y']);
      assert.deepEqual(got.members.map((m) => m.moment_id).sort(), ['b1', 'b2']);
      assert.deepEqual(got.links, [{ from_id: 'b2', to_id: 'b1', created_at: 1 }]);
    });
  });
}
