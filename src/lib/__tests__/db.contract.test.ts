import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Db } from '../db/types';
import { dbContract } from './dbContract';
import { memoryDb } from './fakes';

// The fake shells are tested against...
dbContract('memoryDb (fake)', async () => memoryDb());

// ...and the real web store, so the two can't drift apart. Each case gets a
// fresh IndexedDB and a fresh module instance (the store caches its
// connection at module level); cases in a file run one after another.
let n = 0;
dbContract('IndexedDB (db/index.web.ts)', async () => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const mod = (await import(`../db/index.web.ts?case=${++n}` as string)) as { db: Db };
  return mod.db;
});
