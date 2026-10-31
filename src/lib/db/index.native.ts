import * as SQLite from 'expo-sqlite';
import type { Area, WalkArea } from '../areas/types';
import type { CategoryId, MarkOrigin, Offered, Place } from '../discovery/types';
import { DERIVED_STORES } from './stores';
import type { Capture, Pause, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { segmentBbox } from './segmentBounds';
import type { Db } from './types';

// Ordered migrations; PRAGMA user_version records how many have run.
const MIGRATIONS = [
  `
  CREATE TABLE walk (
    id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER,
    title TEXT, epilogue TEXT, open INTEGER NOT NULL, area TEXT
  );
  CREATE TABLE trace_point (
    walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
    accuracy_m REAL, speed REAL, course REAL
  );
  CREATE INDEX trace_point_walk ON trace_point (walk_id, t);
  CREATE TABLE capture (
    id TEXT PRIMARY KEY, walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL, lon REAL,
    kind TEXT NOT NULL, file_path TEXT, body TEXT, segment_id TEXT
  );
  CREATE INDEX capture_walk ON capture (walk_id, t);
  CREATE TABLE street_segment (
    id TEXT PRIMARY KEY, name TEXT, kind_detail TEXT NOT NULL, length_m REAL NOT NULL,
    geometry TEXT NOT NULL, w REAL NOT NULL, s REAL NOT NULL, e REAL NOT NULL, n REAL NOT NULL
  );
  CREATE INDEX street_segment_bbox ON street_segment (w, e, s, n);
  CREATE TABLE visited_segment (
    segment_id TEXT NOT NULL, walk_id TEXT NOT NULL, covered_fraction REAL NOT NULL, first_t INTEGER NOT NULL,
    PRIMARY KEY (segment_id, walk_id)
  );
  `,
  // Versioned derived cache, per-walk summaries and the media/meta tables.
  `
  ALTER TABLE walk ADD COLUMN snapped_build TEXT;
  DELETE FROM street_segment;
  DELETE FROM visited_segment;
  ALTER TABLE street_segment ADD COLUMN build TEXT NOT NULL DEFAULT '';
  ALTER TABLE visited_segment ADD COLUMN street_key TEXT NOT NULL DEFAULT '';
  CREATE INDEX visited_segment_walk ON visited_segment (walk_id);
  CREATE TABLE walk_summary (
    walk_id TEXT PRIMARY KEY, build TEXT NOT NULL, distance_m REAL NOT NULL, duration_ms INTEGER NOT NULL,
    new_streets INTEGER NOT NULL, streets_walked INTEGER NOT NULL,
    photos INTEGER NOT NULL, voices INTEGER NOT NULL, notes INTEGER NOT NULL, streets_read INTEGER NOT NULL
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // Video captures.
  `
  ALTER TABLE walk_summary ADD COLUMN videos INTEGER NOT NULL DEFAULT 0;
  `,
  // Pauses, photo captions, and capture lookup by place.
  `
  CREATE TABLE pause (walk_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, PRIMARY KEY (walk_id, started_at));
  ALTER TABLE capture ADD COLUMN caption TEXT;
  ALTER TABLE capture ADD COLUMN caption_y REAL;
  CREATE INDEX capture_place ON capture (lat, lon);
  `,
  // v0.5: the places each walk was in (a cache, rebuilt when a walk is placed again).
  `
  CREATE TABLE area (
    key TEXT PRIMARY KEY, level TEXT NOT NULL, name TEXT NOT NULL, parent_key TEXT,
    lon REAL NOT NULL, lat REAL NOT NULL, rules TEXT NOT NULL
  );
  CREATE TABLE walk_area (
    walk_id TEXT NOT NULL, area_key TEXT NOT NULL, metres REAL NOT NULL,
    first_t INTEGER NOT NULL, last_t INTEGER NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL,
    PRIMARY KEY (walk_id, area_key)
  );
  CREATE INDEX walk_area_area ON walk_area (area_key);
  `,
  // v1 discovery: the place cache, and the truth of what was offered, marked and recalled.
  `
  CREATE TABLE place (
    key TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL, build TEXT NOT NULL
  );
  CREATE INDEX place_at ON place (lat, lon);
  CREATE TABLE offered (
    key TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL,
    offered_at INTEGER NOT NULL, origin TEXT NOT NULL
  );
  CREATE TABLE mark (
    id TEXT PRIMARY KEY, walk_id TEXT, key TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL, origin TEXT NOT NULL,
    state TEXT NOT NULL, created_at INTEGER NOT NULL, resolved_at INTEGER, capture_id TEXT
  );
  CREATE INDEX mark_walk ON mark (walk_id);
  CREATE TABLE recall (
    capture_id TEXT PRIMARY KEY, frequency TEXT NOT NULL, until INTEGER,
    last_fired_at INTEGER, fired_count INTEGER NOT NULL, last_walk_id TEXT
  );
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
function conn() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('chronicles.db');
      await d.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
      const row = await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
        await d.withExclusiveTransactionAsync(async (txn) => {
          await txn.execAsync(MIGRATIONS[v]);
          await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
        });
      }
      return d;
    })().catch((e) => {
      dbPromise = null; // let the next call try again instead of failing forever
      throw e;
    });
  }
  return dbPromise;
}

// Every write goes through one queue and one exclusive transaction, so the
// background location task and the UI never collide on the connection.
let queue: Promise<unknown> = Promise.resolve();
function write(task: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const run = queue.then(async () => (await conn()).withExclusiveTransactionAsync(task));
  queue = run.catch(() => {});
  return run;
}

type PlaceRow = { key: string; name: string; category: CategoryId; lon: number; lat: number; generic: number; build: string };
const toPlace = ({ lon, lat, generic, ...r }: PlaceRow): Place => ({ ...r, at: [lon, lat], generic: generic === 1 });
type OfferedRow = Omit<PlaceRow, 'build'> & { offered_at: number; origin: MarkOrigin };
const toOffered = ({ lon, lat, generic, ...r }: OfferedRow): Offered => ({ ...r, at: [lon, lat], generic: generic === 1 });

type WalkRow = Omit<Walk, 'open'> & { open: number };
const toWalk = (r: WalkRow): Walk => ({ ...r, open: r.open === 1 });

const WALK_COLUMNS = ['started_at', 'ended_at', 'title', 'epilogue', 'open', 'area', 'snapped_build'] as const;
const CAPTURE_COLUMNS = ['walk_id', 't', 'lat', 'lon', 'kind', 'file_path', 'body', 'segment_id', 'caption', 'caption_y'] as const;

/** UPDATE ... SET for the given patch; only known column names reach the SQL. */
function setClause(patch: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));
  const values = keys.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLite.SQLiteBindValue);
  });
  return { sql: keys.map((k) => `${k} = ?`).join(', '), values };
}

export const db: Db = {
  createWalk(w) {
    return write((t) => t.runAsync(
      'INSERT INTO walk (id, started_at, ended_at, title, epilogue, open, area, snapped_build) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      w.id, w.started_at, w.ended_at, w.title, w.epilogue, w.open ? 1 : 0, w.area, w.snapped_build,
    ).then(() => {}));
  },
  updateWalk(id, patch) {
    const { sql, values } = setClause(patch, WALK_COLUMNS);
    if (!sql) return Promise.resolve();
    return write((t) => t.runAsync(`UPDATE walk SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
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

  appendPoints(points) {
    if (points.length === 0) return Promise.resolve();
    return write(async (t) => {
      const stmt = await t.prepareAsync(
        'INSERT INTO trace_point (walk_id, t, lat, lon, accuracy_m, speed, course) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const p of points) await stmt.executeAsync(p.walk_id, p.t, p.lat, p.lon, p.accuracy_m, p.speed, p.course);
      } finally {
        await stmt.finalizeAsync();
      }
    });
  },
  async getPoints(walkId) {
    return (await conn()).getAllAsync<TracePoint>('SELECT * FROM trace_point WHERE walk_id = ? ORDER BY t', walkId);
  },

  addCapture(c) {
    return write((t) => t.runAsync(
      'INSERT INTO capture (id, walk_id, t, lat, lon, kind, file_path, body, segment_id, caption, caption_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      c.id, c.walk_id, c.t, c.lat, c.lon, c.kind, c.file_path, c.body, c.segment_id, c.caption ?? null, c.caption_y ?? null,
    ).then(() => {}));
  },
  updateCapture(id, patch) {
    const { sql, values } = setClause(patch, CAPTURE_COLUMNS);
    if (!sql) return Promise.resolve();
    return write((t) => t.runAsync(`UPDATE capture SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
  },
  async getCaptures(walkId) {
    return (await conn()).getAllAsync<Capture>('SELECT * FROM capture WHERE walk_id = ? ORDER BY t', walkId);
  },

  async capturesIn([w, s, e, n]) {
    return (await conn()).getAllAsync<Capture>(
      'SELECT * FROM capture WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? ORDER BY t', s, n, w, e,
    );
  },

  startPause(walkId, at) {
    return write(async (t) => {
      const open = await t.getFirstAsync('SELECT 1 FROM pause WHERE walk_id = ? AND ended_at IS NULL', walkId);
      if (!open) await t.runAsync('INSERT INTO pause (walk_id, started_at, ended_at) VALUES (?, ?, NULL)', walkId, at);
    });
  },
  endPause(walkId, at) {
    return write((t) => t.runAsync('UPDATE pause SET ended_at = ? WHERE walk_id = ? AND ended_at IS NULL', at, walkId).then(() => {}));
  },
  async getPauses(walkId) {
    return (await conn()).getAllAsync<Pause>('SELECT * FROM pause WHERE walk_id = ? ORDER BY started_at', walkId);
  },

  putSegments(segments) {
    if (segments.length === 0) return Promise.resolve();
    return write(async (t) => {
      const seg = await t.prepareAsync(
        'INSERT OR REPLACE INTO street_segment (id, name, kind_detail, length_m, geometry, w, s, e, n, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const x of segments) {
          const [w, so, e, n] = segmentBbox(x);
          await seg.executeAsync(x.id, x.name, x.kind_detail, x.length_m, JSON.stringify(x.geometry), w, so, e, n, x.build);
        }
      } finally {
        await seg.finalizeAsync();
      }
    });
  },

  saveSnap(walkId, segments, visited, s, placed, complete = true) {
    return write(async (t) => {
      const seg = await t.prepareAsync(
        'INSERT OR REPLACE INTO street_segment (id, name, kind_detail, length_m, geometry, w, s, e, n, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const x of segments) {
          const [w, so, e, n] = segmentBbox(x);
          await seg.executeAsync(x.id, x.name, x.kind_detail, x.length_m, JSON.stringify(x.geometry), w, so, e, n, x.build);
        }
      } finally {
        await seg.finalizeAsync();
      }
      await t.runAsync('DELETE FROM visited_segment WHERE walk_id = ?', walkId);
      for (const v of visited) {
        await t.runAsync(
          'INSERT INTO visited_segment (segment_id, walk_id, covered_fraction, first_t, street_key) VALUES (?, ?, ?, ?, ?)',
          v.segment_id, v.walk_id, v.covered_fraction, v.first_t, v.street_key,
        );
      }
      await t.runAsync(
        `INSERT OR REPLACE INTO walk_summary (walk_id, build, distance_m, duration_ms, new_streets, streets_walked, photos, videos, voices, notes, streets_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.walk_id, s.build, s.distance_m, s.duration_ms, s.new_streets, s.streets_walked, s.photos, s.videos ?? 0, s.voices, s.notes, s.streets_read ? 1 : 0,
      );
      await t.runAsync('UPDATE walk SET snapped_build = ? WHERE id = ?', complete ? s.build : null, walkId);
      if (placed) {
        await t.runAsync('DELETE FROM walk_area WHERE walk_id = ?', walkId);
        for (const a of placed.areas) {
          await t.runAsync(
            'INSERT OR REPLACE INTO area (key, level, name, parent_key, lon, lat, rules) VALUES (?, ?, ?, ?, ?, ?, ?)',
            a.key, a.level, a.name, a.parent_key, a.lon, a.lat, a.rules,
          );
        }
        for (const r of placed.rows) {
          await t.runAsync(
            'INSERT INTO walk_area (walk_id, area_key, metres, first_t, last_t, lon, lat) VALUES (?, ?, ?, ?, ?, ?, ?)',
            r.walk_id, r.area_key, r.metres, r.first_t, r.last_t, r.lon, r.lat,
          );
        }
        await t.runAsync('DELETE FROM area WHERE key NOT IN (SELECT DISTINCT area_key FROM walk_area)');
      }
    });
  },
  async listAreas() {
    return (await conn()).getAllAsync<Area>('SELECT * FROM area');
  },
  async listWalkAreas() {
    return (await conn()).getAllAsync<WalkArea>('SELECT * FROM walk_area');
  },
  async getSegmentsIn([w, s, e, n]) {
    const rows = await (await conn()).getAllAsync<Omit<StreetSegment, 'geometry'> & { geometry: string }>(
      'SELECT id, name, kind_detail, length_m, geometry, build FROM street_segment WHERE w <= ? AND e >= ? AND s <= ? AND n >= ?',
      e, w, n, s,
    );
    return rows.map((r) => ({ ...r, geometry: JSON.parse(r.geometry) }));
  },
  async getVisited(walkId) {
    return (await conn()).getAllAsync<VisitedSegment>('SELECT * FROM visited_segment WHERE walk_id = ?', walkId);
  },
  async visitedSegmentIds() {
    const rows = await (await conn()).getAllAsync<{ segment_id: string }>('SELECT DISTINCT segment_id FROM visited_segment');
    return new Set(rows.map((r) => r.segment_id));
  },
  async streetKeysBefore(startedAt) {
    const rows = await (await conn()).getAllAsync<{ street_key: string }>(
      'SELECT DISTINCT v.street_key FROM visited_segment v JOIN walk w ON w.id = v.walk_id WHERE w.started_at < ?',
      startedAt,
    );
    return new Set(rows.map((r) => r.street_key));
  },
  async listSummaries() {
    const rows = await (await conn()).getAllAsync<Omit<WalkSummary, 'streets_read'> & { streets_read: number }>(
      'SELECT * FROM walk_summary',
    );
    return rows.map((r) => ({ ...r, streets_read: r.streets_read === 1 }));
  },

  async getMeta(key) {
    const r = await (await conn()).getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
    return r?.value ?? null;
  },
  setMeta(key, value) {
    return write((t) => t.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value).then(() => {}));
  },
  putPlaces(places) {
    if (places.length === 0) return Promise.resolve();
    return write(async (t) => {
      const st = await t.prepareAsync(
        'INSERT OR REPLACE INTO place (key, name, category, lon, lat, generic, build) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const p of places) await st.executeAsync(p.key, p.name, p.category, p.at[0], p.at[1], p.generic ? 1 : 0, p.build);
      } finally {
        await st.finalizeAsync();
      }
    });
  },
  async placesIn([w, s, e, n]) {
    const rows = await (await conn()).getAllAsync<PlaceRow>(
      'SELECT * FROM place WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?', s, n, w, e,
    );
    return rows.map(toPlace);
  },
  addOffered(rows) {
    if (rows.length === 0) return Promise.resolve();
    return write(async (t) => {
      // First offer wins: re-offering never moves the record.
      const st = await t.prepareAsync(
        'INSERT OR IGNORE INTO offered (key, name, category, lon, lat, generic, offered_at, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const o of rows) await st.executeAsync(o.key, o.name, o.category, o.at[0], o.at[1], o.generic ? 1 : 0, o.offered_at, o.origin);
      } finally {
        await st.finalizeAsync();
      }
    });
  },
  async listOffered() {
    return (await (await conn()).getAllAsync<OfferedRow>('SELECT * FROM offered')).map(toOffered);
  },
  purgeDerived() {
    const clear = DERIVED_STORES.map((s) => `DELETE FROM ${s};`).join(' ');
    return write((t) => t.execAsync(`${clear} UPDATE walk SET snapped_build = NULL;`));
  },
};
