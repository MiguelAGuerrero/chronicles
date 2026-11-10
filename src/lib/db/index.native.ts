// @layer adapter
// @instance: the native store, over the app's SQLite database (the factory is db/sqliteStore.ts)
import * as SQLite from 'expo-sqlite';
import { makeSqliteDb } from './sqliteStore';

export const db = makeSqliteDb(() => SQLite.openDatabaseAsync('chronicles.db'));
