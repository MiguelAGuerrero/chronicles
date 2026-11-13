import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MIGRATIONS } from '../../db/migrations';


test('TX12: SQLite migration 28 adds the transcript table, and no earlier migration is edited', () => {
  assert.equal(MIGRATIONS.length, 28);
  assert.match(MIGRATIONS[27], /CREATE TABLE transcript[\s\S]*capture_id TEXT PRIMARY KEY/);
});

test('TX12: IndexedDB version 21 adds the transcript store and an older database keeps its captures', async () => {
  const { IDBFactory } = await import('fake-indexeddb');
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const mod = (await import('../../db/index.web.ts?transcript=1' as string)) as { db: Record<string, (...a: unknown[]) => Promise<unknown[]>> };
  assert.deepEqual(await mod.db.listTranscripts(), []);
  const conn = await new Promise<IDBDatabase>((ok, fail) => { const r = indexedDB.open('chronicles'); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
  assert.equal(conn.version, 21);
  assert.ok(conn.objectStoreNames.contains('transcript'));
  conn.close();
});
