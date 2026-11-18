// @layer adapter
// @instance: the native store, over the app's SQLite database (the factory is db/sqliteStore.ts)
import * as SQLite from 'expo-sqlite';
import { makeSqliteDb } from './sqliteStore';

// The main connection for reads, and one writer connection the write queue keeps for the app's life
// (`useNewConnection`: a connection of its own, not the shared one expo-sqlite hands out by name).
export const db = makeSqliteDb(
  () => SQLite.openDatabaseAsync('chronicles.db'),
  () => SQLite.openDatabaseAsync('chronicles.db', { useNewConnection: true }),
);
