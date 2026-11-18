/// <reference types="node" />
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from '../../db/migrations';

/**
 * The few `expo-sqlite` calls the native store makes (`db/sqliteStore.ts`), over Node's built-in SQLite, so the
 * store runs in `npm test` under the Db contract (MT11, decision 0123). One in-memory database per call; the
 * store's own write queue serializes writes, as on a phone. `statements()` counts every statement run, for MT7.
 * Bindings follow expo-sqlite's: variadic, `undefined` as null. Rows come back as plain objects.
 */
type Bind = string | number | bigint | null | Uint8Array;
type Stmt = { run(...a: Bind[]): { changes: number | bigint; lastInsertRowid: number | bigint }; get(...a: Bind[]): unknown; all(...a: Bind[]): unknown[] };
type Sync = { exec(sql: string): void; prepare(sql: string): Stmt };

/**
 * `file`: a database on disk, so `open` and `openWriter` are two connections to it, as the phone's store holds (the main
 * connection for reads, one for the write queue). Without it, one in-memory database and no writer.
 */
export function nodeSqlite(file?: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => Sync };
  const d = new DatabaseSync(file ?? ':memory:');
  let count = 0;
  let writersOpened = 0;
  let exclusive = 0;
  const bind = (a: unknown[]): Bind[] => (a.length === 1 && Array.isArray(a[0]) ? a[0] : a).map((v) => (v === undefined ? null : v as Bind));
  const plain = <T>(row: unknown): T => (row == null ? null : { ...(row as object) }) as T;
  const apiOver = (c: Sync) => {
    const prep = (sql: string) => {
      count++;
      return c.prepare(sql);
    };
    const run = (sql: string, a: unknown[]) => {
      const r = prep(sql).run(...bind(a));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    };
    const api = {
      async execAsync(sql: string) {
        count++;
        c.exec(sql);
      },
      async getFirstAsync<T>(sql: string, ...a: unknown[]) {
        return plain<T>(prep(sql).get(...bind(a)) ?? null);
      },
      async getAllAsync<T>(sql: string, ...a: unknown[]) {
        return prep(sql).all(...bind(a)).map((r) => plain<T>(r));
      },
      async runAsync(sql: string, ...a: unknown[]) {
        return run(sql, a);
      },
      async prepareAsync(sql: string) {
        return {
          executeAsync: async (...a: unknown[]) => run(sql, a),
          finalizeAsync: async () => {},
        };
      },
      async withExclusiveTransactionAsync(task: (t: SQLiteDatabase) => Promise<void>) {
        exclusive++;
        c.exec('BEGIN EXCLUSIVE');
        try {
          await task(api as unknown as SQLiteDatabase);
          c.exec('COMMIT');
        } catch (e) {
          c.exec('ROLLBACK');
          throw e;
        }
      },
    };
    return api;
  };
  const main = apiOver(d);
  return {
    open: async () => main as unknown as SQLiteDatabase,
    /** A second connection to the same file (only with `file`), as `SQLite.openDatabaseAsync(name, { useNewConnection })`. */
    openWriter: file
      ? async () => {
          writersOpened++;
          return apiOver(new DatabaseSync(file)) as unknown as SQLiteDatabase;
        }
      : undefined,
    statements: () => count,
    /** How many writer connections were opened, and how many per-write exclusive transactions ran. */
    writersOpened: () => writersOpened,
    exclusiveTransactions: () => exclusive,
    userVersion: () => (d.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    /** The database as an app before the moment table left it: every migration up to 21, user_version 22. */
    async at22() {
      for (const m of MIGRATIONS.slice(0, 22)) d.exec(m);
      d.exec('PRAGMA user_version = 22');
    },
    /** The raw database, to seed rows as an older app wrote them. */
    raw: d,
  };
}
