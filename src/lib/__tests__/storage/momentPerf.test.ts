import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import type { Db } from '../../db/types';
import type { Moment } from '../../types';
import { makeSqliteDb } from '../../db/sqliteStore';
import { nodeSqlite } from '../fakes/nodeSqlite';

// Moment table, MT7 (decision 0123): reads stay one statement (SQLite) or one request per store read (IndexedDB),
// never one query per moment. Test first: the new API is reached by name.

type Planned = Db;
const N = 5000;
const moment = (i: number): Moment => ({
  id: `m${i}`, walk_id: i % 2 ? 'w1' : null, t: i, lat: 41.8 + (i % 100) * 1e-4, lon: -71.4, segment_id: null,
  pieces: [{ id: `m${i}`, moment_id: `m${i}`, t: i, kind: 'text', file_path: null, body: `note ${i}` }],
});
const req = <T>(r: IDBRequest<T>) => new Promise<T>((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
const once = async (f: () => Promise<unknown>) => { const t0 = performance.now(); await f(); return performance.now() - t0; };
/** The best of three, so a pause of the test runner's own doesn't decide it. */
const time = async (f: () => Promise<unknown>) => Math.min(await once(f), await once(f), await once(f));

test('MT7: 5,000 moments read from IndexedDB within twice a flat store\'s read of as many rows', async () => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const db = ((await import('../../db/index.web.ts?perf=1' as string)) as { db: Planned }).db;
  for (let i = 0; i < N; i++) await db.addMoment(moment(i));
  // Today's shape, for the baseline: one flat record per capture, read with one getAll by time.
  const open = indexedDB.open('flat', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('capture', { keyPath: 'id' }).createIndex('t', 't');
  const flat = await req(open);
  const w = flat.transaction('capture', 'readwrite');
  for (let i = 0; i < N; i++) {
    const { pieces, ...m } = moment(i);
    w.objectStore('capture').put({ ...m, ...pieces[0] });
  }
  await new Promise<void>((ok) => { w.oncomplete = () => ok(); });
  const baseline = await time(() => req(flat.transaction('capture', 'readonly').objectStore('capture').index('t').getAll(IDBKeyRange.bound(0, N, false, true))));
  const read = await time(() => db.momentsBetween(0, N));
  assert.equal((await db.momentsBetween(0, N)).length, N);
  console.log(`MT7: momentsBetween ${read.toFixed(1)} ms, a flat read ${baseline.toFixed(1)} ms`);
  assert.ok(read <= 2 * baseline, `momentsBetween took ${read.toFixed(1)} ms; a flat read took ${baseline.toFixed(1)} ms`);
  flat.close();
});

test('MT7: every SQLite moment read is one statement (node:sqlite)', async () => {
  const sql = nodeSqlite();
  const db = makeSqliteDb(sql.open);
  for (let i = 0; i < 50; i++) await db.addMoment(moment(i));
  const reads: [string, () => Promise<Moment[]>][] = [
    ['getMoments', () => db.getMoments('w1')],
    ['momentsBetween', () => db.momentsBetween(0, 50)],
    ['getMomentsByIds', () => db.getMomentsByIds(['m1', 'm2', 'm3'])],
    ['momentsIn', () => db.momentsIn([-72, 41, -71, 42])],
  ];
  for (const [name, read] of reads) {
    const before = sql.statements();
    assert.ok((await read()).length > 0, name);
    assert.equal(sql.statements() - before, 1, `${name} ran more than one statement`);
  }
});
