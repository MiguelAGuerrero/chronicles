import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';

// RX29: note types kept before become their moment's reactions, on both stores, from a database opened at the old version.
type Sqlite = { exec(sql: string): void; prepare(sql: string): { run(...a: unknown[]): unknown; all(...a: unknown[]): Record<string, unknown>[] } };
const req = <T>(r: IDBRequest<T>) => new Promise<T>((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
const want = [['m1', 'feeling', 'happy'], ['m1', 'thought', 'idea'], ['m2', 'taste', 'like']];

test('RX29: SQLite: the reaction table holds every kept note type on its moment, the earliest note winning its family; no earlier migration is edited', { todo: 'test first' }, async () => {
  const { MIGRATIONS } = (await import('../../db/migrations' + '')) as { MIGRATIONS: string[] };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (p: string) => Sqlite };
  const d = new DatabaseSync(':memory:');
  assert.equal(MIGRATIONS.length, 29);
  for (const m of MIGRATIONS.slice(0, 28)) d.exec(m);
  d.exec("INSERT INTO moment (id, walk_id, t, lat, lon, segment_id) VALUES ('m1', NULL, 1, NULL, NULL, NULL), ('m2', NULL, 2, NULL, NULL, NULL), ('m3', NULL, 3, NULL, NULL, NULL)");
  const put = d.prepare('INSERT INTO capture (id, moment_id, t, kind, file_path, body, note_type) VALUES (?, ?, ?, ?, NULL, ?, ?)');
  put.run('p2', 'm1', 20, 'text', 'b', 'sad');
  put.run('p1', 'm1', 10, 'text', 'a', 'happy');
  put.run('p3', 'm1', 30, 'text', 'c', 'idea');
  put.run('p4', 'm2', 5, 'text', 'd', 'like');
  put.run('p5', 'm3', 5, 'photo', null, null);
  d.exec(MIGRATIONS[28]);
  assert.deepEqual(d.prepare('SELECT moment_id, family, reaction FROM reaction ORDER BY moment_id, family').all().map((r) => [r.moment_id, r.family, r.reaction]), want);
});

test('RX29: IndexedDB version 22: the reaction store holds every kept note type on its moment, the earliest note winning', { todo: 'test first' }, async () => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const web = (await import('../../db/index.web' + '')) as { migrate: (d: IDBDatabase, tx: IDBTransaction, old: number, upTo: number) => void };
  const open = indexedDB.open('chronicles', 21);
  open.onupgradeneeded = (e) => web.migrate(open.result, open.transaction!, e.oldVersion, 21);
  const d = await req(open);
  const tx = d.transaction(['moment'], 'readwrite');
  const piece = (id: string, moment_id: string, t: number, note_type: string | null) => ({ id, moment_id, t, kind: 'text', file_path: null, body: id, ...(note_type ? { note_type } : {}) });
  tx.objectStore('moment').put({ id: 'm1', walk_id: null, t: 1, lat: null, lon: null, segment_id: null, piece_ids: ['p2', 'p1', 'p3'], pieces: [piece('p2', 'm1', 20, 'sad'), piece('p1', 'm1', 10, 'happy'), piece('p3', 'm1', 30, 'idea')] });
  tx.objectStore('moment').put({ id: 'm2', walk_id: null, t: 2, lat: null, lon: null, segment_id: null, piece_ids: ['p4'], pieces: [piece('p4', 'm2', 5, 'like')] });
  tx.objectStore('moment').put({ id: 'm3', walk_id: null, t: 3, lat: null, lon: null, segment_id: null, piece_ids: ['p5'], pieces: [piece('p5', 'm3', 5, null)] });
  await new Promise<void>((ok, fail) => { tx.oncomplete = () => ok(); tx.onerror = () => fail(tx.error); });
  d.close();
  const mod = (await import('../../db/index.web.ts?reactions=1' as string)) as { db: { listReactions: () => Promise<{ moment_id: string; family: string; reaction: string }[]> } };
  const got = (await mod.db.listReactions()).map((r) => [r.moment_id, r.family, r.reaction]).sort();
  assert.deepEqual(got, want);
  const after = await req(indexedDB.open('chronicles'));
  assert.equal(after.version, 22);
  after.close();
});
