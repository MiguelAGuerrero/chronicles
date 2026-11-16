// @layer adapter
// The native store's still spells (Motion, MO8), moved out of makeSqliteDb, which a function over the size limit may
// not grow (decision 0178), when a failed save's retry needed `putStill` (errors-handled audit 3).
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Still } from '../types';
import type { Db } from './types';

type Stills = Pick<Db, 'startStill' | 'endStill' | 'putStill' | 'getStills'>;

/** The methods, over the store's one write queue and its connection. */
export function sqliteStills(write: (task: (txn: SQLiteDatabase) => Promise<void>) => Promise<void>, conn: () => Promise<SQLiteDatabase>): Stills {
  return {
  startStill(walkId, at) {
    return write(async (t) => {
      const open = await t.getFirstAsync('SELECT 1 FROM still WHERE walk_id = ? AND ended_at IS NULL', walkId);
      if (!open) await t.runAsync('INSERT OR IGNORE INTO still (walk_id, started_at, ended_at) VALUES (?, ?, NULL)', walkId, at);
    });
  },
  endStill(walkId, at) {
    return write((t) => t.runAsync('UPDATE still SET ended_at = ? WHERE walk_id = ? AND ended_at IS NULL', at, walkId).then(() => {}));
  },
  putStill(s) {
    return write((t) => t.runAsync('INSERT OR REPLACE INTO still (walk_id, started_at, ended_at) VALUES (?, ?, ?)', s.walk_id, s.started_at, s.ended_at).then(() => {}));
  },
  async getStills(walkId) {
    return (await conn()).getAllAsync<Still>('SELECT * FROM still WHERE walk_id = ? ORDER BY started_at', walkId);
  },
  };
}
