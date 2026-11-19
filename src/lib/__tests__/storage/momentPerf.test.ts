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
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const PAIRS = 7;

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
  // The baseline and the read are timed interleaved, baseline then read, PAIRS times, so a slow spell of the
  // runner's (CI's shared machines, a parallel test file) lands on both sides of a pair instead of on one side's
  // whole block, as it did when each side was a best of three timed apart (red main at 19975ba8: 51.0 ms against
  // 23.7). The criterion is unchanged: the read takes no more than twice a flat read of as many rows, measured
  // in the same run. It is judged on the median of the pairs' ratios rather than the best of each side: a ratio
  // compares two reads made under the same load, which two bests need not be (each can come from a different
  // spell), and the median lets neither one pair a spell split in two nor one lucky pair decide it.
  const flatRead = () => req(flat.transaction('capture', 'readonly').objectStore('capture').index('t').getAll(IDBKeyRange.bound(0, N, false, true)));
  const pairs: { baseline: number; read: number }[] = [];
  for (let i = 0; i < PAIRS; i++) pairs.push({ baseline: await once(flatRead), read: await once(() => db.momentsBetween(0, N)) });
  assert.equal((await db.momentsBetween(0, N)).length, N);
  const ratio = median(pairs.map((p) => p.read / p.baseline));
  const read = median(pairs.map((p) => p.read));
  const baseline = median(pairs.map((p) => p.baseline));
  console.log(`MT7: momentsBetween ${read.toFixed(1)} ms, a flat read ${baseline.toFixed(1)} ms (medians of ${PAIRS} interleaved pairs; the pairs' median ratio ${ratio.toFixed(2)})`);
  assert.ok(ratio <= 2, `momentsBetween took ${ratio.toFixed(2)} times a flat read, pair by pair (median): ${pairs.map((p) => `${p.read.toFixed(1)}/${p.baseline.toFixed(1)}`).join(', ')} ms`);
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
