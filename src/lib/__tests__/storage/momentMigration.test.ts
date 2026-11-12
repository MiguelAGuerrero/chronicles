import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import type { Db } from '../../db/types';

// Moment table, MT1 and MT2 (decision 0123): every capture becomes a one-piece moment under its own id, on both
// stores, and every record that pointed at a capture reaches the same moment. Test first: the new store API and
// the SQLite migrations' module are reached by name, so this file runs before they exist.

type Piece = { id: string; moment_id: string; t: number; kind: string; file_path: string | null; body: string | null; caption?: string | null };
type Moment = { id: string; walk_id: string | null; t: number; lat: number | null; lon: number | null; segment_id: string | null; pieces: Piece[] };
type Planned = Db & {
  getMoments(walkId: string): Promise<Moment[]>;
  getMomentsByIds(ids: string[]): Promise<Moment[]>;
  momentsBetween(from: number, to: number): Promise<Moment[]>;
};

const LAT = 41.812, LON = -71.4;
// Rows as an app at IndexedDB version 17 (SQLite user_version 22) wrote them.
const OLD_CAPTURES = [
  { id: 'c1', walk_id: 'w1', t: 10, lat: LAT, lon: LON, kind: 'photo', file_path: 'walks/w1/c1.jpg', body: null, segment_id: 's1', caption: 'a door', caption_y: 0.5, thumb_path: 'walks/w1/c1.thumb.jpg', edit: null },
  { id: 'c2', walk_id: 'w1', t: 20, lat: null, lon: null, kind: 'voice', file_path: 'walks/w1/c2.m4a', body: '4000', segment_id: null, caption: null, caption_y: null, thumb_path: null, edit: null },
  { id: 'loose', walk_id: null, t: 30, lat: LAT, lon: LON, kind: 'text', file_path: null, body: 'a note', segment_id: null, caption: null, caption_y: null, thumb_path: null, edit: null },
];
const WALK = { id: 'w1', started_at: 1, ended_at: 100, title: null, epilogue: null, open: false, area: null, snapped_build: null };
const RECALL = { capture_id: 'c1', frequency: 'always', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null };
const FIND = { key: 'f1', area_key: null, walk_id: 'w1', capture_id: 'c1', found_at: 10, name: 'Blue door', category: 'oddities', kind: 'artwork', at: [LON, LAT], generic: false };

const asMoment = (c: (typeof OLD_CAPTURES)[number]): Moment => {
  const { walk_id, lat, lon, segment_id, ...media } = c;
  return { id: c.id, walk_id, t: c.t, lat, lon, segment_id, pieces: [{ ...media, moment_id: c.id }] as Piece[] };
};

const req = <T>(r: IDBRequest<T>) => new Promise<T>((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });

/** A version-17 database as the app left it, from the frozen schema (scripts/e2e/fixtures/web17.js). */
async function seedWeb17() {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrate17 } = require('../../../../scripts/e2e/fixtures/web17.js') as { migrate17: (d: IDBDatabase, tx: IDBTransaction, old: number) => void };
  const open = indexedDB.open('chronicles', 17);
  open.onupgradeneeded = (e) => migrate17(open.result, open.transaction!, e.oldVersion);
  const d = await req(open);
  const tx = d.transaction(['walk', 'capture', 'recall', 'find', 'thread', 'thread_member', 'moment_link', 'meta'], 'readwrite');
  tx.objectStore('walk').put(WALK);
  for (const c of OLD_CAPTURES) tx.objectStore('capture').put(c);
  tx.objectStore('recall').put(RECALL);
  tx.objectStore('find').put(FIND);
  tx.objectStore('thread').put({ id: 't1', name: 'doors', created_at: 40 });
  tx.objectStore('thread_member').put({ thread_id: 't1', moment_id: 'c1', added_at: 40 });
  tx.objectStore('thread_member').put({ thread_id: 't1', moment_id: 'loose', added_at: 40 });
  tx.objectStore('moment_link').put({ from_id: 'loose', to_id: 'c1', created_at: 40 });
  tx.objectStore('meta').put({ key: 'resurface_prefs', value: JSON.stringify({ hidden: ['c2'], dim: [], lastShown: 'c1' }) });
  await new Promise<void>((ok, fail) => { tx.oncomplete = () => ok(); tx.onerror = () => fail(tx.error); });
  d.close();
}
let n = 0;
const openWeb = async () => ((await import(`../../db/index.web.ts?upgrade=${++n}` as string)) as { db: Planned }).db;

test('MT1: a version-17 IndexedDB upgrades to one-piece moments under the same ids', async () => {
  await seedWeb17();
  const db = await openWeb();
  assert.deepEqual(await db.getMoments('w1'), [asMoment(OLD_CAPTURES[0]), asMoment(OLD_CAPTURES[1])]);
  assert.deepEqual(await db.momentsBetween(0, 100), OLD_CAPTURES.map(asMoment));
  const d = await req(indexedDB.open('chronicles'));
  assert.equal(d.version, 20);
  assert.ok(!d.objectStoreNames.contains('capture'), 'the capture store is folded into the moment store');
  d.close();
});

test('MT1: the frozen version-17 schema is the store\'s own steps up to 17', async () => {
  const shape = async (run: (d: IDBDatabase, tx: IDBTransaction, old: number) => void) => {
    (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    const open = indexedDB.open('chronicles', 17);
    open.onupgradeneeded = (e) => run(open.result, open.transaction!, e.oldVersion);
    const d = await req(open);
    const tx = d.transaction([...d.objectStoreNames], 'readonly');
    const out = [...d.objectStoreNames].map((s) => {
      const st = tx.objectStore(s);
      return [s, JSON.stringify(st.keyPath), [...st.indexNames].sort()];
    });
    d.close();
    return out;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrate17 } = require('../../../../scripts/e2e/fixtures/web17.js') as { migrate17: (d: IDBDatabase, tx: IDBTransaction, old: number) => void };
  const web = (await import('../../db/index.web' + '')) as { migrate: (d: IDBDatabase, tx: IDBTransaction, old: number, upTo: number) => void };
  assert.deepEqual(await shape((d, tx, old) => web.migrate(d, tx, old, 17)), await shape(migrate17));
});

type Sqlite = { exec(sql: string): void; prepare(sql: string): { run(...a: unknown[]): unknown; all(...a: unknown[]): Record<string, unknown>[] } };
async function sqliteAt22(): Promise<{ d: Sqlite; MIGRATIONS: string[] }> {
  const { MIGRATIONS } = (await import('../../db/migrations' + '')) as { MIGRATIONS: string[] };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (p: string) => Sqlite };
  const d = new DatabaseSync(':memory:');
  for (const m of MIGRATIONS.slice(0, 22)) d.exec(m);
  return { d, MIGRATIONS };
}

test('MT1: SQLite migration 22 turns every capture into a one-piece moment (node:sqlite)', async () => {
  const { d, MIGRATIONS } = await sqliteAt22();
  const put = d.prepare('INSERT INTO capture (id, walk_id, t, lat, lon, kind, file_path, body, segment_id, caption, caption_y, thumb_path, edit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const c of OLD_CAPTURES) put.run(c.id, c.walk_id, c.t, c.lat, c.lon, c.kind, c.file_path, c.body, c.segment_id, c.caption, c.caption_y, c.thumb_path, c.edit);
  d.exec(MIGRATIONS[22]);
  assert.deepEqual(
    d.prepare('SELECT id, walk_id, t, lat, lon, segment_id FROM moment ORDER BY t').all().map((r) => ({ ...r })),
    OLD_CAPTURES.map(({ id, walk_id, t, lat, lon, segment_id }) => ({ id, walk_id, t, lat, lon, segment_id })),
  );
  assert.deepEqual(d.prepare('SELECT id, moment_id FROM capture ORDER BY t').all().map((r) => [r.id, r.moment_id]), OLD_CAPTURES.map((c) => [c.id, c.id]));
  // Migration 23 (complexes) came after: this test pins only that 22 is the moment table.
  assert.ok(MIGRATIONS.length >= 23);
});

test('MT1: no earlier SQLite migration changed', async () => {
  const { MIGRATIONS } = (await import('../../db/migrations' + '')) as { MIGRATIONS: string[] };
  const hashes = MIGRATIONS.slice(0, 22).map((m) => createHash('sha256').update(m).digest('hex').slice(0, 12));
  assert.deepEqual(hashes, [
    '67a8d014fba8', '444518d8b2ee', '7242199bb9c2', '28394eb160b4', '2b6b57d06206', '721b10aa8d77', '6f6505a15fd4', '37d56a178e05',
    '0292b128b055', '6c06a64832e9', '3d6fac965047', '39a9c59dc22b', 'd015f09ce0b5', '05fe5b1ddcbe', '849f4ee2108a', '847db27ade48',
    '82c5cd716ba0', '2af0b5f9cdf6', '54c5f12c204e', '66c495a7a87d', 'aeac49e77432', '137bae2a6f52',
  ]);
});

test('MT2: threads, links, reminders, finds and the resurfaced card\'s state reach the same moments after the upgrade', async () => {
  await seedWeb17();
  const db = await openWeb();
  const reach = async (ids: string[]) => (await db.getMomentsByIds(ids)).map((m) => m.id).sort();
  const { threads, members, links } = await db.listThreads();
  assert.deepEqual(threads.map((t) => t.name), ['doors']);
  assert.deepEqual(await reach(members.map((m) => m.moment_id)), ['c1', 'loose']);
  assert.deepEqual(await reach(links.flatMap((l) => [l.from_id, l.to_id])), ['c1', 'loose']);
  assert.deepEqual(await reach((await db.listRecalls()).map((r) => r.capture_id)), ['c1']);
  assert.deepEqual(await reach((await db.listFinds('w1')).map((f) => f.capture_id)), ['c1']);
  const prefs = JSON.parse((await db.getMeta('resurface_prefs')) ?? '{}') as { hidden: string[]; lastShown: string };
  assert.deepEqual(await reach([...prefs.hidden, prefs.lastShown]), ['c1', 'c2']);
});
