import * as SQLite from 'expo-sqlite';

import { isMarker, type TraceLine } from '../modules/walk-recorder';

/**
 * The app database. Walk, trace_point and capture are the source of truth;
 * everything derived from map data (segments, places, visited) arrives later
 * and can always be rebuilt from these tables.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('chronicles.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE walk (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    title TEXT,
    epilogue TEXT,
    open INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE trace_point (
    walk_id TEXT NOT NULL REFERENCES walk(id),
    t INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy_m REAL NOT NULL,
    altitude_m REAL,
    speed REAL,
    course REAL,
    course_accuracy REAL
  );
  CREATE INDEX trace_point_walk_t ON trace_point (walk_id, t);
  CREATE TABLE trace_marker (
    walk_id TEXT NOT NULL REFERENCES walk(id),
    t INTEGER NOT NULL,
    mark TEXT NOT NULL
  );
  CREATE TABLE capture (
    id TEXT PRIMARY KEY NOT NULL,
    walk_id TEXT NOT NULL REFERENCES walk(id),
    t INTEGER NOT NULL,
    lat REAL,
    lon REAL,
    kind TEXT NOT NULL CHECK (kind IN ('photo', 'voice', 'text')),
    file_path TEXT,
    body TEXT,
    segment_id TEXT
  );
  `,
];

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[version]);
      await txn.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version += 1;
  }
}

export type WalkRow = {
  id: string;
  started_at: number;
  ended_at: number | null;
  title: string | null;
  open: number;
  points: number;
};

export async function createWalk(id: string, startedAt: number) {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO walk (id, started_at, open) VALUES (?, ?, 1)', [id, startedAt]);
}

/**
 * Copies a finished walk's trace file into SQLite. The native trace file stays on
 * disk as the original record; this import can be re-run safely.
 */
export async function importTrace(walkId: string, lines: TraceLine[]) {
  const db = await getDb();
  const startedAt = lines[0]?.t ?? Date.now();
  const endedAt = lines.length ? lines[lines.length - 1].t : Date.now();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('INSERT OR IGNORE INTO walk (id, started_at, open) VALUES (?, ?, 1)', [walkId, startedAt]);
    await txn.runAsync('DELETE FROM trace_point WHERE walk_id = ?', [walkId]);
    await txn.runAsync('DELETE FROM trace_marker WHERE walk_id = ?', [walkId]);
    const point = await txn.prepareAsync(
      `INSERT INTO trace_point (walk_id, t, lat, lon, accuracy_m, altitude_m, speed, course, course_accuracy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const marker = await txn.prepareAsync('INSERT INTO trace_marker (walk_id, t, mark) VALUES (?, ?, ?)');
    try {
      for (const line of lines) {
        if (isMarker(line)) {
          await marker.executeAsync([walkId, Math.round(line.t), line.mark]);
        } else {
          await point.executeAsync([
            walkId,
            Math.round(line.t),
            line.lat,
            line.lon,
            line.acc,
            line.alt,
            line.speed,
            line.course,
            line.courseAcc,
          ]);
        }
      }
    } finally {
      await point.finalizeAsync();
      await marker.finalizeAsync();
    }
    await txn.runAsync('UPDATE walk SET ended_at = ?, open = 0 WHERE id = ?', [Math.round(endedAt), walkId]);
  });
}

export async function listWalks(): Promise<WalkRow[]> {
  const db = await getDb();
  return db.getAllAsync<WalkRow>(
    `SELECT w.id, w.started_at, w.ended_at, w.title, w.open,
            (SELECT COUNT(*) FROM trace_point p WHERE p.walk_id = w.id) AS points
     FROM walk w ORDER BY w.started_at DESC LIMIT 50`,
  );
}
