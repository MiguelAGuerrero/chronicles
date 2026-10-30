import * as SQLite from 'expo-sqlite';
import type { Capture, StreetSegment, TracePoint, VisitedSegment, Walk } from '../types';
import { segmentBbox } from './segmentBounds';
import type { Db } from './types';

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS walk (
  id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER,
  title TEXT, epilogue TEXT, open INTEGER NOT NULL, area TEXT
);
CREATE TABLE IF NOT EXISTS trace_point (
  walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
  accuracy_m REAL, speed REAL, course REAL
);
CREATE INDEX IF NOT EXISTS trace_point_walk ON trace_point (walk_id, t);
CREATE TABLE IF NOT EXISTS capture (
  id TEXT PRIMARY KEY, walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL, lon REAL,
  kind TEXT NOT NULL, file_path TEXT, body TEXT, segment_id TEXT
);
CREATE INDEX IF NOT EXISTS capture_walk ON capture (walk_id, t);
CREATE TABLE IF NOT EXISTS street_segment (
  id TEXT PRIMARY KEY, name TEXT, kind_detail TEXT NOT NULL, length_m REAL NOT NULL,
  geometry TEXT NOT NULL, w REAL NOT NULL, s REAL NOT NULL, e REAL NOT NULL, n REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS street_segment_bbox ON street_segment (w, e, s, n);
CREATE TABLE IF NOT EXISTS visited_segment (
  segment_id TEXT NOT NULL, walk_id TEXT NOT NULL, covered_fraction REAL NOT NULL, first_t INTEGER NOT NULL,
  PRIMARY KEY (segment_id, walk_id)
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
function conn() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chronicles.db').then(async (d) => {
      await d.execAsync(SCHEMA);
      return d;
    });
  }
  return dbPromise;
}

type WalkRow = Omit<Walk, 'open'> & { open: number };
const toWalk = (r: WalkRow): Walk => ({ ...r, open: r.open === 1 });

function setClause<T extends object>(patch: T) {
  const keys = Object.keys(patch) as (keyof T)[];
  const values = keys.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLite.SQLiteBindValue);
  });
  return { sql: keys.map((k) => `${String(k)} = ?`).join(', '), values };
}

export const db: Db = {
  async createWalk(w) {
    const d = await conn();
    await d.runAsync(
      'INSERT INTO walk (id, started_at, ended_at, title, epilogue, open, area) VALUES (?, ?, ?, ?, ?, ?, ?)',
      w.id, w.started_at, w.ended_at, w.title, w.epilogue, w.open ? 1 : 0, w.area,
    );
  },
  async updateWalk(id, patch) {
    const { sql, values } = setClause(patch);
    if (!sql) return;
    await (await conn()).runAsync(`UPDATE walk SET ${sql} WHERE id = ?`, ...values, id);
  },
  async getWalk(id) {
    const r = await (await conn()).getFirstAsync<WalkRow>('SELECT * FROM walk WHERE id = ?', id);
    return r ? toWalk(r) : null;
  },
  async listWalks() {
    const rows = await (await conn()).getAllAsync<WalkRow>('SELECT * FROM walk ORDER BY started_at DESC');
    return rows.map(toWalk);
  },
  async getOpenWalk() {
    const r = await (await conn()).getFirstAsync<WalkRow>(
      'SELECT * FROM walk WHERE open = 1 ORDER BY started_at DESC LIMIT 1',
    );
    return r ? toWalk(r) : null;
  },

  async appendPoints(points) {
    if (points.length === 0) return;
    const d = await conn();
    await d.withTransactionAsync(async () => {
      for (const p of points) {
        await d.runAsync(
          'INSERT INTO trace_point (walk_id, t, lat, lon, accuracy_m, speed, course) VALUES (?, ?, ?, ?, ?, ?, ?)',
          p.walk_id, p.t, p.lat, p.lon, p.accuracy_m, p.speed, p.course,
        );
      }
    });
  },
  async getPoints(walkId) {
    return (await conn()).getAllAsync<TracePoint>(
      'SELECT * FROM trace_point WHERE walk_id = ? ORDER BY t', walkId,
    );
  },

  async addCapture(c) {
    await (await conn()).runAsync(
      'INSERT INTO capture (id, walk_id, t, lat, lon, kind, file_path, body, segment_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      c.id, c.walk_id, c.t, c.lat, c.lon, c.kind, c.file_path, c.body, c.segment_id,
    );
  },
  async updateCapture(id, patch) {
    const { sql, values } = setClause(patch);
    if (!sql) return;
    await (await conn()).runAsync(`UPDATE capture SET ${sql} WHERE id = ?`, ...values, id);
  },
  async getCaptures(walkId) {
    return (await conn()).getAllAsync<Capture>('SELECT * FROM capture WHERE walk_id = ? ORDER BY t', walkId);
  },

  async putSegments(segments) {
    const d = await conn();
    await d.withTransactionAsync(async () => {
      for (const s of segments) {
        const [w, so, e, n] = segmentBbox(s);
        await d.runAsync(
          'INSERT OR REPLACE INTO street_segment (id, name, kind_detail, length_m, geometry, w, s, e, n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          s.id, s.name, s.kind_detail, s.length_m, JSON.stringify(s.geometry), w, so, e, n,
        );
      }
    });
  },
  async getSegmentsIn([w, s, e, n]) {
    const rows = await (await conn()).getAllAsync<Omit<StreetSegment, 'geometry'> & { geometry: string }>(
      'SELECT id, name, kind_detail, length_m, geometry FROM street_segment WHERE w <= ? AND e >= ? AND s <= ? AND n >= ?',
      e, w, n, s,
    );
    return rows.map((r) => ({ ...r, geometry: JSON.parse(r.geometry) }));
  },
  async setVisited(walkId, rows) {
    const d = await conn();
    await d.withTransactionAsync(async () => {
      await d.runAsync('DELETE FROM visited_segment WHERE walk_id = ?', walkId);
      for (const v of rows) {
        await d.runAsync(
          'INSERT INTO visited_segment (segment_id, walk_id, covered_fraction, first_t) VALUES (?, ?, ?, ?)',
          v.segment_id, v.walk_id, v.covered_fraction, v.first_t,
        );
      }
    });
  },
  async getVisited(walkId) {
    const d = await conn();
    return walkId
      ? d.getAllAsync<VisitedSegment>('SELECT * FROM visited_segment WHERE walk_id = ?', walkId)
      : d.getAllAsync<VisitedSegment>('SELECT * FROM visited_segment');
  },
};
